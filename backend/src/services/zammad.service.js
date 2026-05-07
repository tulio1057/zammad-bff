import axios from "axios";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const zammadClient = axios.create({
  baseURL: `${env.ZAMMAD_URL}/api/v1`,
  headers: {
    Authorization: `Token token=${env.ZAMMAD_API_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

zammadClient.interceptors.response.use(
  (res) => res,
  (err) => {
    logger.error(
      { status: err.response?.status, url: err.config?.url },
      "Zammad API error",
    );
    return Promise.reject(err);
  },
);

/**
 * Autentica usuário no Zammad usando suas credenciais (não o token da API)
 * Retorna dados do usuário se válido
 */
export async function authenticateUser(email, password) {
  const client = axios.create({
    baseURL: `${env.ZAMMAD_URL}/api/v1`,
    auth: { username: email, password },
    timeout: 10000,
  });

  const { data } = await client.get("/users/me");
  return data;
}

export async function listTickets({ page = 1, perPage = 25, userId } = {}) {
  const query = userId ? `customer_id:${userId}` : "id:*";
  const params = {
    query,
    page,
    per_page: perPage,
    sort_by: "created_at",
    sort_dir: "desc",
    expand: true,
  };

  const { data } = await zammadClient.get("/tickets/search", { params });
  return data;
}

export async function getTicket(ticketId) {
  const { data } = await zammadClient.get(`/tickets/${ticketId}`);
  return data;
}

export async function getTicketArticles(ticketId) {
  const { data } = await zammadClient.get(
    `/ticket_articles/by_ticket/${ticketId}`,
  );
  return data;
}

export async function createTicket({
  title,
  body,
  customerId,
  groupId,
  priorityId = 2,
  customAttributes = {},
}) {
  const payload = {
    title,
    customer_id: customerId,
    priority_id: priorityId,
    ...customAttributes,
    article: {
      subject: title,
      body,
      type: "web",
      internal: false,
    },
  };
  
  // If groupId is provided explicitly, use it. Otherwise rely on customAttributes.group
  if (groupId) {
    payload.group_id = groupId;
  }

  const { data } = await zammadClient.post("/tickets", payload);
  return data;
}

/** Nós retornados ao front: value = chave enviada na API, name = rótulo. */
function normalizeTreeNodes(options) {
  if (!Array.isArray(options)) return [];
  return options.map((raw) => {
    const value = raw.value != null ? String(raw.value) : "";
    const name = raw.name != null ? String(raw.name) : value;
    const children = normalizeTreeNodes(raw.children);
    return { value, name, ...(children.length ? { children } : {}) };
  });
}

function isStaticTreeSelect(field) {
  return (
    field.object === "Ticket" &&
    field.data_type === "tree_select" &&
    !field.data_option?.relation &&
    Array.isArray(field.data_option?.options)
  );
}

function pickTreeClassificationAttribute(attributes, preferredName) {
  const candidates = attributes.filter(isStaticTreeSelect);
  if (!candidates.length) return null;
  if (preferredName) {
    const named = candidates.find((f) => f.name === preferredName);
    if (named) return named;
  }
  return [...candidates].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  )[0];
}

/** Options de `select` no Object Manager (mapa valor interno → rótulo). */
function normalizeFlatSelectOptions(field) {
  const opts = field?.data_option?.options;
  if (!opts || typeof opts !== "object" || Array.isArray(opts)) return [];
  return Object.entries(opts)
    .filter(([k]) => k != null && k !== "null")
    .map(([value, name]) => ({
      value: String(value),
      name: name != null ? String(name) : String(value),
    }));
}

function buildFieldsClassification(attributes, classificationSteps) {
  const byName = new Map(
    attributes
      .filter(
        (f) =>
          f.object === "Ticket" &&
          (f.data_type === "select" || f.data_type === "multiselect"),
      )
      .map((f) => [f.name, f]),
  );

  const steps = classificationSteps.map((step) => {
    const attr = byName.get(step.name);
    if (!attr) {
      logger.warn({ name: step.name }, "Ticket select attribute not found in Zammad");
    }
    const options = normalizeFlatSelectOptions(attr);
    const display = step.label || attr?.display || step.name;
    return {
      name: step.name,
      display,
      when: step.when && Object.keys(step.when).length ? step.when : null,
      options,
    };
  });

  return { mode: "fields", steps, field: null, display: null, tree: [] };
}

/** Nomes internos que já tratamos noutros controlos do formulário (evita duplicar selects). */
const AUTO_DISCOVER_EXCLUDED_NAMES = new Set(["group", "priority"]);

function extractKeywords(str) {
  if (!str) return [];
  let s = String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/chamados?|categorias?|subcategorias?|subcategory|sub/g, " ");
  return s.split(/[^a-z0-9]+/).filter((w) => w.length > 0 && w !== "de");
}

function autoDiscoverClassificationSteps(attributes, groups = []) {
  const selectAttrs = attributes
    .filter(
      (f) =>
        f.object === "Ticket" &&
        f.data_type === "select" &&
        f.active !== false &&
        !AUTO_DISCOVER_EXCLUDED_NAMES.has(f.name) &&
        !f.data_option?.relation,
    )
    .filter((f) => {
      const o = f.data_option?.options;
      if (!o || typeof o !== "object" || Array.isArray(o)) return false;
      return Object.keys(o).filter((k) => k != null && k !== "null").length > 0;
    })
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const steps = [];
  const groupToCategory = {};
  const groupToSubcategory = {};

  const groupKeys = groups.map((g) => ({ name: g, keys: extractKeywords(g) }));

  for (const attr of selectAttrs) {
    const keysName = extractKeywords(attr.name);
    const keysDisplay = extractKeywords(attr.display || "");
    const keys = [...new Set([...keysName, ...keysDisplay])];

    let bestGroup = null;
    let bestScore = 0;

    for (const gk of groupKeys) {
      let score = 0;
      for (const k of keys) {
        if (gk.keys.includes(k)) score += 1;
        else if (k.length > 3 && gk.keys.some((gkw) => gkw.includes(k) || k.includes(gkw))) score += 0.5;
      }
      if (score > bestScore) {
        bestScore = score;
        bestGroup = gk.name;
      }
    }

    const normName = String(attr.name).toLowerCase();
    const normDisplay = String(attr.display || "").toLowerCase();
    const isSub = normName.includes('subcategoria') || normName.includes('sub') || normDisplay.includes('sub');

    if (bestGroup) {
      if (isSub) {
        if (!groupToSubcategory[bestGroup]) groupToSubcategory[bestGroup] = [];
        groupToSubcategory[bestGroup].push(attr);
      } else {
        if (!groupToCategory[bestGroup]) groupToCategory[bestGroup] = [];
        groupToCategory[bestGroup].push(attr);
      }
    }
  }

  for (const g of groups) {
    const cats = groupToCategory[g] || [];
    const subs = groupToSubcategory[g] || [];

    for (const cat of cats) {
      steps.push({
        name: cat.name,
        label: cat.display || cat.name,
        when: { group: g },
        position: cat.position ?? 0,
      });
    }

    for (const sub of subs) {
      const when = {};
      if (cats.length === 1) {
        when[cats[0].name] = '*';
      } else {
        when.group = g;
      }
      steps.push({
        name: sub.name,
        label: sub.display || sub.name,
        when,
        position: sub.position ?? 0,
      });
    }
  }

  return steps.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

function resolveClassificationStepDefs(attributes, configSteps, groups = []) {
  if (configSteps?.length > 0) return configSteps;
  return autoDiscoverClassificationSteps(attributes, groups);
}

export async function fetchTicketObjectAttributes() {
  const { data } = await zammadClient.get("/object_manager_attributes", {
    params: { object: "Ticket" },
  });
  return data;
}

/** Mesmos passos que o formulário: config JSON ou auto-descoberta de selects. */
export function classificationAllowlistFromAttributes(attributes, configSteps) {
  const defs = resolveClassificationStepDefs(attributes, configSteps);
  return new Set(defs.map((s) => s.name));
}

export async function getUserByEmail(email) {
  const { data } = await zammadClient.get("/users/search", {
    params: { query: email, limit: 1 },
  });
  return data?.[0] ?? null;
}

/**
 * Grupos Zammad + classificação:
 * - modo `fields`: vários selects (JSON de config ou auto-descoberta de selects estáticos);
 * - modo `tree`: um único tree_select estático (fallback);
 * - modo `none`: sem classificação carregada.
 */
export async function getTicketFields({
  treeFieldName,
  classificationSteps = [],
} = {}) {
  let groups = [];
  try {
    const groupsResponse = await zammadClient.get("/groups");
    groups = groupsResponse.data
      .filter((g) => g.active === true && g.name !== 'Users')
      .map((g) => g.name)
      .sort();
    logger.info({ groups }, "Loaded groups");
  } catch (err) {
    logger.error({ error: err.message }, "Error fetching groups");
    return { groups: [], classification: { mode: "none", field: null, display: null, tree: [], steps: [] } };
  }

  try {

    const { data } = await zammadClient.get("/object_manager_attributes", {
      params: { object: "Ticket" },
    });

    const stepDefs = resolveClassificationStepDefs(data, classificationSteps, groups);
    if (stepDefs.length > 0) {
      const classification = buildFieldsClassification(data, stepDefs);
      classification.autoDiscovered = classificationSteps.length === 0;
      logger.info(
        {
          mode: "fields",
          stepCount: classification.steps.length,
          autoDiscovered: classification.autoDiscovered,
        },
        "Loaded ticket classification (multi-select)",
      );
      return { groups, classification };
    }

    const classification = {
      mode: "none",
      field: null,
      display: null,
      tree: [],
      steps: [],
    };

    const treeAttr = pickTreeClassificationAttribute(data, treeFieldName);
    if (treeAttr) {
      classification.mode = "tree";
      classification.field = treeAttr.name;
      classification.display = treeAttr.display || treeAttr.name;
      classification.tree = normalizeTreeNodes(treeAttr.data_option.options);
      logger.info(
        {
          field: classification.field,
          depthSample: classification.tree.length,
        },
        "Loaded ticket classification tree",
      );
    }

    return { groups, classification };
  } catch (err) {
    console.error("DEBUG ERROR fetch ticket fields:", err);
    logger.error(
      { error: err.message, stack: err.stack, status: err.response?.status },
      "Error fetching ticket fields",
    );
    return {
      groups,
      classification: {
        mode: "none",
        field: null,
        display: null,
        tree: [],
        steps: [],
      },
    };
  }
}
