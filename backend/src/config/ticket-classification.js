import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { env } from './env.js';

const stepSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1).optional(),
  when: z.record(z.string()).optional(),
});

const configSchema = z.object({
  steps: z.array(stepSchema),
});

let cachedPath = null;
let cached = null;

/**
 * Passos de classificação (vários selects no Ticket).
 * `when`: mapa campo interno → valor exato da opção no Zammad, ou "*" = qualquer valor não vazio.
 */
export function loadTicketClassificationConfig() {
  const p = env.ZAMMAD_TICKET_CLASSIFICATION_CONFIG_PATH;
  if (!p) {
    cachedPath = null;
    cached = null;
    return { steps: [] };
  }
  const resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  if (cachedPath === resolved && cached) return cached;
  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    const json = JSON.parse(raw);
    cached = configSchema.parse(json);
    cachedPath = resolved;
    return cached;
  } catch (e) {
    console.error('[ticket-classification]', resolved, e.message);
    cachedPath = null;
    cached = null;
    return { steps: [] };
  }
}
