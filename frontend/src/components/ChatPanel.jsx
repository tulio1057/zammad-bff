import { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function ChatPanel({ ticketId, canChat = true }) {
  const { user } = useAuth();
  const { messages, connected, error, sendMessage, markRead, loadMore, hasMore, loadingMore } = useChat(ticketId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const [prevHeight, setPrevHeight] = useState(0);


  useEffect(() => {
    if (prevHeight > 0 && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight - prevHeight;
      setPrevHeight(0);
    } else {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (messages.length) markRead();
  }, [messages]);

  const handleScroll = (e) => {
    if (e.target.scrollTop === 0 && hasMore && !loadingMore) {
      setPrevHeight(e.target.scrollHeight);
      loadMore();
    }
  };

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

      {!canChat && (
        <div className="alert alert-warning" style={{ margin: '8px' }}>
          ⚠️ Você não pode enviar mensagens neste chamado. Apenas o criador do chamado pode conversar.
        </div>
      )}

      <div className="chat-messages" ref={listRef} onScroll={handleScroll}>
        {hasMore && (
          <button className="btn btn-ghost" style={{ width: '100%', fontSize: 12, padding: 4 }} onClick={() => { setPrevHeight(listRef.current.scrollHeight); loadMore(); }} disabled={loadingMore}>
            {loadingMore ? 'Carregando...' : 'Carregar mais mensagens'}
          </button>
        )}
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
          placeholder={canChat ? "Digite sua mensagem... (Enter para enviar)" : "Você não pode enviar mensagens neste chamado"}
          maxLength={2000}
          disabled={!connected || !canChat}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!connected || !input.trim() || !canChat}
          style={{ width: 'auto', padding: '10px 18px', alignSelf: 'flex-end' }}
          title={!canChat ? "Apenas o criador do chamado pode enviar mensagens" : ""}
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
