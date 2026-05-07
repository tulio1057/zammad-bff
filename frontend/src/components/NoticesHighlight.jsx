import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../services/chat.service.js';

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Agora';
  if (diffMins < 60) return `${diffMins}m atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  if (diffDays < 7) return `${diffDays}d atrás`;

  return date.toLocaleDateString('pt-BR');
}

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function minimizarAba(setIsMinimized) {
  setIsMinimized(prev => !prev);
}

export default function NoticesHighlight() {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    const socket = getSocket();

    // Solicitar lista inicial de avisos (últimos 3)
    socket.emit('notice:list');

    // Receber lista inicial de avisos
    const handleListResponse = ({ notices: remoteNotices }) => {
      setNotices(remoteNotices.slice(0, 3));
    };

    // Receber novo aviso em tempo real
    const handleNewNotice = (notice) => {
      setNotices(prev => [notice, ...prev].slice(0, 3));
    };

    socket.on('notice:list_response', handleListResponse);
    socket.on('notice:new', handleNewNotice);

    return () => {
      socket.off('notice:list_response', handleListResponse);
      socket.off('notice:new', handleNewNotice);
    };
  }, []);

  if (notices.length === 0) {
    return null;
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #F47B20 0%, #D96010 100%)',
      borderRadius: 'var(--radius)',
      padding: isMinimized ? '8px' : '16px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      position: 'fixed',
      zIndex: 10,
      top: isMinimized ? '84%' : '75%',
      right: "4%",
      width: isMinimized ? '40px' : 'fit-content',
      height: isMinimized ? '40px' : '140px',
      overflow: isMinimized ? 'hidden' : 'overlay',
      scrollbarColor: 'rgba(255, 255, 255, 0.3) transparent',
    }}
    onMouseEnter={(e) => {
      if (!isMinimized) {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(244, 123, 32, 0.3)';
      }
    }}
    onMouseLeave={(e) => {
      if (!isMinimized) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }
    }}
    onClick={() => !isMinimized && navigate('/tech/notices')}
    >
      {!isMinimized && (
        <button
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(true);
          }}
        >
          −
        </button>
      )}
      {isMinimized ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24" style={{ color: '#fff', cursor: 'pointer' }} onClick={() => setIsMinimized(false)}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ color: '#fff', flexShrink: 0 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              Avisos Recentes
            </span>
          </div>

          <div style={{ display: 'grid', gap: '8px' }}>
            {notices.map((notice, idx) => (
              <div
                key={notice.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: '#fff',
                  lineHeight: '1.4',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(notice.author_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {notice.title && (
                      <div style={{
                        fontWeight: 600,
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {notice.title}
                      </div>
                    )}
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      opacity: 0.9,
                      fontSize: '12px',
                    }}>
                      {notice.message}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.8,
                      marginTop: '4px',
                    }}>
                      {formatDate(notice.created_at)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: '12px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: 500,
            textAlign: 'center',
          }}>
            Ver todos os avisos →
          </div>
        </>
      )}
    </div>
  );
}
