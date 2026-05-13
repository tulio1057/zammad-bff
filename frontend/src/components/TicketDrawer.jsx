import { useState } from 'react';
import { changeStatus } from '../services/technician.service.js';

const STATUS_LABELS = {
  aberto:       'Aberto',
  em_andamento: 'Em Andamento',
  aguardando:   'Aguardando',
  fechado:      'Fechado',
};

const TRANSITIONS = {
  aberto:       ['em_andamento', 'aguardando', 'fechado'],
  em_andamento: ['aguardando',   'fechado'],
  aguardando:   ['em_andamento', 'fechado'],
  fechado:      ['aberto'],
};

const STATUS_COLORS = {
  aberto:       { bg: '#E0F2FE', color: '#0369A1' },
  em_andamento: { bg: '#FEF3C7', color: '#B45309' },
  aguardando:   { bg: '#F3E8FF', color: '#7C3AED' },
  fechado:      { bg: '#DCFCE7', color: '#16A34A' },
};

export default function TicketDrawer({ ticket, onClose, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  if (!ticket) return null;

  const transitions = TRANSITIONS[ticket.status] ?? [];
  const sc = STATUS_COLORS[ticket.status] ?? STATUS_COLORS.aberto;

  async function handleChangeStatus(newStatus) {
    setLoading(true);
    setError('');
    try {
      const updated = await changeStatus(ticket.id, newStatus);
      onUpdated(updated);
      if (newStatus === 'fechado') onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 300, backdropFilter: 'blur(2px)',
      }} />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#fff', zIndex: 301, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,51,153,0.15)',
        animation: 'drawerIn 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <style>{`@keyframes drawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #003399 0%, #0066CC 100%)',
          padding: '20px 24px', color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                Chamado #{ticket.number ?? ticket.id}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, fontFamily: 'Barlow Condensed, sans-serif' }}>
                {ticket.title}
              </div>
            </div>
            <button onClick={onClose} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer',
              fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

          {/* Status atual */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7A8F', marginBottom: 8 }}>
              Status atual
            </div>
            <span style={{
              display: 'inline-block', padding: '6px 16px', borderRadius: 20,
              fontSize: 13, fontWeight: 700, background: sc.bg, color: sc.color,
            }}>
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>

          {/* Info */}
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px', marginBottom: 24, border: '1px solid #E8EEF5' }}>
            {[
              ['Grupo',        ticket.groupName ?? '—'],
              ['Responsável',  ticket.assignedName ?? '—'],
              ['Prioridade',   { 1: 'Baixa', 2: 'Média', 3: 'Alta', 4: 'Crítica' }[ticket.priority_id] ?? '—'],
              ['Atualizado',   ticket.updatedAt ? new Date(ticket.updatedAt * 1000).toLocaleString('pt-BR') : '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #E8EEF5', fontSize: 13 }}>
                <span style={{ color: '#6B7A8F', fontWeight: 600 }}>{label}</span>
                <span style={{ color: '#1F2937', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', color: '#DC2626', fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Ações */}
          {transitions.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B7A8F', marginBottom: 12 }}>
                Alterar status
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {transitions.map(status => {
                  const isFinal = status === 'fechado';
                  return (
                    <button
                      key={status}
                      disabled={loading}
                      onClick={() => handleChangeStatus(status)}
                      style={{
                        padding: '12px 20px', borderRadius: 10, border: 'none',
                        fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        transition: 'all 0.15s',
                        background: isFinal
                          ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                          : 'linear-gradient(135deg, #0066CC 0%, #0099FF 100%)',
                        color: '#fff',
                        boxShadow: isFinal
                          ? '0 2px 8px rgba(5,150,105,0.3)'
                          : '0 2px 8px rgba(0,102,204,0.3)',
                      }}
                    >
                      {isFinal ? '✓ Fechar chamado' : `→ Mover para ${STATUS_LABELS[status]}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {ticket.status === 'fechado' && (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#16A34A', fontWeight: 600, fontSize: 14 }}>
              ✓ Chamado fechado
            </div>
          )}
        </div>
      </div>
    </>
  );
}
