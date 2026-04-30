import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useTickets } from "../hooks/useTickets.js";
import CreateTicketModal from "../components/CreateTicketModal.jsx";
import FiltrosChamados from "../components/FiltrosChamados.jsx";
import TicketList from "../components/TicketList.jsx";

const ABAS_CHAMADOS = [
  { chave: "meus", rotulo: "Meus Chamados" },
  { chave: "todas", rotulo: "Todas" },
  { chave: "abertos", rotulo: "Abertos" },
  { chave: "concluidos", rotulo: "Concluídos" },
];

const FILTROS_INICIAIS = {
  tipo: "",
  grupo: "",
  prioridade: "",
  status: "",
};

function getInitials(name = "") {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function chamadoDoUsuario(chamado, user) {
  if (!user || !user.id) return false;
  const customerId = Number(chamado.customer_id);
  const userZammadId = Number(user.id);
  return customerId === userZammadId;
}

function chamadoSemDono(chamado) {
  const ownerId = chamado.owner_id;
  return !ownerId || Number(ownerId) === 1;
}

function chamadoAberto(chamado) {
  const stateId = Number(chamado.state_id);
  // Estados fechados/removidos no Zammad: 4 (closed), 5 (merged), 6 (removed)
  return ![4, 5, 6].includes(stateId);
}

function chamadoConcluido(chamado) {
  const stateId = Number(chamado.state_id);
  return [4, 6].includes(stateId);
}

function chamadoCriadoAte48h(chamado) {
  if (!chamado.created_at) return false;
  const dataCriacao = new Date(chamado.created_at);
  if (Number.isNaN(dataCriacao.getTime())) return false;
  const horas = (Date.now() - dataCriacao.getTime()) / (1000 * 60 * 60);
  return horas <= 48;
}

function filtrarPorAba(chamado, abaAtual, user) {
  if (abaAtual === "meus") return chamadoDoUsuario(chamado, user);
  if (abaAtual === "abertos") return chamadoAberto(chamado);
  if (abaAtual === "concluidos") return chamadoConcluido(chamado);
  return true;
}

function filtrarPorCampos(chamado, filtros) {
  // Filtro de Tipo (Data)
  if (filtros.tipo === "novos" && !chamadoCriadoAte48h(chamado)) return false;
  if (filtros.tipo === "antigos" && chamadoCriadoAte48h(chamado)) return false;

  // Filtro de Grupo (group_id)
  if (filtros.grupo) {
    const grupoId = String(chamado.group_id || "");
    if (grupoId !== filtros.grupo) return false;
  }

  // Filtro de Prioridade (priority_id)
  if (filtros.prioridade) {
    const prioId = String(chamado.priority_id || "");
    if (prioId !== filtros.prioridade) return false;
  }

  // Filtro de Status (state_id)
  if (filtros.status) {
    const stateId = String(chamado.state_id || "");
    if (stateId !== filtros.status) return false;
  }

  return true;
}

export default function DashboardPage() {
  const { user, zammadUrl, logout } = useAuth();
  const { tickets, loading, error, page, reload } = useTickets();
  const [showModal, setShowModal] = useState(false);
  const [abaAtual, setAbaAtual] = useState("meus");
  const [menuChamadosAberto, setMenuChamadosAberto] = useState(true);
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const navigate = useNavigate();

  const abaSelecionada =
    ABAS_CHAMADOS.find((aba) => aba.chave === abaAtual) ?? ABAS_CHAMADOS[0];

  const chamadosFiltrados = useMemo(() => {

    return tickets.filter(
      (chamado) =>
        filtrarPorAba(chamado, abaAtual, user) &&
        filtrarPorCampos(chamado, filtros),
    );
  }, [tickets, abaAtual, filtros, user]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function selecionarAba(chave) {
    setAbaAtual(chave);
  }

  function abrirZammad() {
    if (zammadUrl) {
      window.open(zammadUrl, "_blank");
    } else {
      alert("URL do Zammad não disponível. Tente fazer login novamente.");
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <div className="header-brand">
          <div className="logo-icon">SC</div>
          <div className="brand-text">
            <strong>SERGAS</strong>
            <span>Sistema de Chamados</span>
          </div>
        </div>
        <div className="header-user">
          <span className="user-name">{user?.name}</span>
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <button
            className="btn btn-ghost"
            style={{
              color: "#fff",
              borderColor: "rgba(255,255,255,.3)",
              padding: "6px 14px",
              fontSize: 13,
            }}
            onClick={handleLogout}
          >
            Sair
          </button>
        </div>
      </header>

      <div className="layout-body">
        <nav className="sidebar">
          <div className="nav-section-label">Menu</div>
          <button
            className="nav-item nav-parent active"
            type="button"
            onClick={() => setMenuChamadosAberto((aberto) => !aberto)}
          >
            <span className="nav-parent-content">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                width="18"
                height="18"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              Chamados
            </span>
            <span className={`nav-arrow ${menuChamadosAberto ? "open" : ""}`}>
              ›
            </span>
          </button>

          {menuChamadosAberto && (
            <div className="nav-submenu">
              {ABAS_CHAMADOS.map((aba) => (
                <button
                  key={aba.chave}
                  className={`nav-subitem ${abaAtual === aba.chave ? "active" : ""}`}
                  type="button"
                  onClick={() => selecionarAba(aba.chave)}
                >
                  {aba.rotulo}
                </button>
              ))}
            </div>
          )}

          <a
            className="nav-item"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setShowModal(true);
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Novo Chamado
          </a>

          <a
            className="nav-item"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              abrirZammad();
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="18"
              height="18"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Acessar Zammad
          </a>
        </nav>

        <main className="main">
          <div className="page-title">
            <div>
              <h2>Chamados</h2>
              <p>
                Acompanhe e filtre os atendimentos por tipo, grupo, prioridade e
                status
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
            >
              + Chamado
            </button>
          </div>

          <div
            className="chamados-tabs"
            role="tablist"
            aria-label="Tipos de chamados"
          >
            {ABAS_CHAMADOS.map((aba) => (
              <button
                key={aba.chave}
                className={`chamados-tab ${abaAtual === aba.chave ? "active" : ""}`}
                type="button"
                onClick={() => selecionarAba(aba.chave)}
              >
                {aba.rotulo}
              </button>
            ))}
          </div>

          <div className="section-title">
            <h3>{abaSelecionada.rotulo}</h3>
            <span>{chamadosFiltrados.length} chamado(s)</span>
          </div>

          <FiltrosChamados filtros={filtros} onChange={setFiltros} />

          {error && <div className="alert alert-error">{error}</div>}

          <TicketList
            tickets={chamadosFiltrados}
            loading={loading}
            onSelect={(id) => navigate(`/tickets/${id}`)}
            onPrev={() => reload(page - 1)}
            onNext={() => reload(page + 1)}
            page={page}
          />
        </main>
      </div>

      {showModal && (
        <CreateTicketModal
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            reload(1);
          }}
        />
      )}
    </div>
  );
}
