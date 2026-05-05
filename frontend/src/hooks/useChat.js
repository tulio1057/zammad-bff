import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../services/chat.service.js';

export function useChat(ticketId) {
  const [messages, setMessages] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    if (!ticketId) return;

    const socket = getSocket();
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
      socket.emit('chat:join', { ticketId });
    };

    const onHistory = (msgs) => setMessages(msgs);

    const onReceive = (msg) => {
      setMessages((prev) => {
        // Evita duplicatas
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onError = ({ message }) => setError(message);
    const onDisconnect = () => setConnected(false);

    socket.on('connect',       onConnect);
    socket.on('chat:history',  onHistory);
    socket.on('chat:receive',  onReceive);
    socket.on('chat:error',    onError);
    socket.on('disconnect',    onDisconnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect',      onConnect);
      socket.off('chat:history', onHistory);
      socket.off('chat:receive', onReceive);
      socket.off('chat:error',   onError);
      socket.off('disconnect',   onDisconnect);
    };
  }, [ticketId]);

  const sendMessage = useCallback((content) => {
    if (!content.trim()) return;
    socketRef.current?.emit('chat:message', { ticketId, content });
  }, [ticketId]);

  const markRead = useCallback(() => {
    socketRef.current?.emit('chat:read', { ticketId });
  }, [ticketId]);

  return { messages, connected, error, sendMessage, markRead };
}
