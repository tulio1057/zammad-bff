import { Server } from 'socket.io';
import { verifyAccessToken } from '../services/auth.service.js';
import * as chatService from '../services/chat.service.js';
import * as ticketRepo from '../repositories/ticket.repository.js';
import { logger } from '../config/logger.js';

// Rate limit simples por socket: max 10 msgs/10s
const rateLimitMap = new Map();
function isRateLimited(socketId) {
  const now = Date.now();
  const entry = rateLimitMap.get(socketId) ?? { count: 0, resetAt: now + 10_000 };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + 10_000;
  }

  entry.count++;
  rateLimitMap.set(socketId, entry);
  return entry.count > 10;
}

export function initSocket(httpServer, frontendUrl) {
  const io = new Server(httpServer, {
    cors: { origin: frontendUrl, credentials: true },
    // Limita tamanho do payload
    maxHttpBufferSize: 1e4, // 10kb
  });

  // ── Autenticação via JWT no cookie ou handshake ──
  io.use((socket, next) => {
    try {
      // Tenta cookie (mesmo formato do HTTP)
      const cookieHeader = socket.handshake.headers.cookie ?? '';
      const tokenMatch = cookieHeader.match(/access_token=([^;]+)/);
      const token = tokenMatch?.[1] ?? socket.handshake.auth?.token;

      if (!token) return next(new Error('Authentication required'));

      socket.user = verifyAccessToken(token);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.debug({ userId: user.sub, role: user.role }, 'Socket connected');

    /**
     * chat:join { ticketId }
     * Entra na sala do ticket se tiver permissão
     */
    socket.on('chat:join', ({ ticketId } = {}) => {
      if (!ticketId) return socket.emit('chat:error', { message: 'ticketId required' });

      const ticket = ticketRepo.findById(ticketId);
      try {
        chatService.assertChatAccess(ticket, user);
      } catch (err) {
        return socket.emit('chat:error', { message: err.message });
      }

      // Deixa salas anteriores deste socket (um usuário por sala por vez)
      socket.rooms.forEach((room) => {
        if (room !== socket.id) socket.leave(room);
      });

      socket.join(`ticket:${ticketId}`);
      socket.currentTicketId = ticketId;

      // Envia histórico ao entrar
      const history = chatService.getHistory(ticketId, user);
      socket.emit('chat:history', history);

      logger.debug({ userId: user.sub, ticketId }, 'Joined chat room');
    });

    /**
     * chat:message { ticketId, content }
     * Persiste e broadcast para todos na sala
     */
    socket.on('chat:message', ({ ticketId, content } = {}) => {
      if (!ticketId || !content) return;
      if (isRateLimited(socket.id)) {
        return socket.emit('chat:error', { message: 'Rate limit exceeded' });
      }

      try {
        const msg = chatService.sendMessage(ticketId, user, content);
        io.to(`ticket:${ticketId}`).emit('chat:receive', msg);
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    /**
     * chat:read { ticketId }
     * Marca mensagens como lidas
     */
    socket.on('chat:read', ({ ticketId } = {}) => {
      if (!ticketId) return;
      try {
        chatService.markRead(ticketId, user);
        socket.to(`ticket:${ticketId}`).emit('chat:read_ack', {
          ticketId,
          readBy: user.sub,
        });
      } catch { /* silencia */ }
    });

    socket.on('disconnect', () => {
      rateLimitMap.delete(socket.id);
      logger.debug({ userId: user.sub }, 'Socket disconnected');
    });
  });

  return io;
}
