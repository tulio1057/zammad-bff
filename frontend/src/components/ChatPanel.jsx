import { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatPanel({ ticketId }) {
  const { user } = useAuth();
  const { messages, connected, error, sendMessage, markRead } = useChat(ticketId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length) markRead();
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const formatTime = (ts) => {
    const d = typeof ts === 'number' ? new Date(ts * 1000) : new Date(ts);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span>💬 Chat do Chamado</span>
        <span className={`chat-status ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Conectado' : 'Reconectando...'}
        </span>
      </div>

      {error && <div className="alert alert-error" style={{ margin: '8px' }}>{error}</div>}

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">Nenhuma mensagem ainda. Inicie a conversa.</p>
        )}
        {messages.map((msg) => {
          const isMine = String(msg.sender_id) === String(user?.id);
          return (
            <div key={msg.id} className={`chat-bubble ${isMine ? 'mine' : 'theirs'}`}>
              {!isMine && <span className="bubble-author">{msg.sender_name}</span>}
              <p>{msg.content}</p>
              <span className="bubble-time">{formatTime(msg.created_at)}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Digite sua mensagem... (Enter para enviar)"
          maxLength={2000}
          disabled={!connected}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!connected || !input.trim()}
          style={{ width: 'auto', padding: '10px 18px', alignSelf: 'flex-end' }}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
