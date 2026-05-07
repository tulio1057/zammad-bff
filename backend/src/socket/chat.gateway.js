import { Server } from 'socket.io';
import { verifyAccessToken } from '../services/auth.service.js';
import * as chatService from '../services/chat.service.js';
import * as noticeService from '../services/notice.service.js';
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

      const ticket = ticketRepo.findTicket(ticketId);
      try {
        chatService.assertChatAccess(ticket, user);
      } catch (err) {
        return socket.emit('chat:error', { message: err.message });
      }

      // Deixa salas anteriores deste socket (um usuário por sala por vez)
      socket.rooms.forEach((room) => {
        if (room !== socket.id) socket.leave(room);
      });

      socket.join(`ticket:${ticket.zammad_id}`);
      socket.currentTicketId = ticket.zammad_id;

      // Envia histórico ao entrar
      const history = chatService.getHistory(ticketId, user, { limit: 50, offset: 0 });
      socket.emit('chat:history', { messages: history, hasMore: history.length === 50 });

      logger.debug({ userId: user.sub, ticketId }, 'Joined chat room');
    });

    /**
     * chat:message { ticketId, content }
     * Persiste e broadcast para todos na sala
     * ⚠️ Valida acesso do usuário antes de permitir envio
     */
    socket.on('chat:message', ({ ticketId, content } = {}) => {
      if (!ticketId || !content) return;
      if (isRateLimited(socket.id)) {
        return socket.emit('chat:error', { message: 'Rate limit exceeded' });
      }

      try {
        // Valida acesso ANTES de processar a mensagem
        const ticket = ticketRepo.findTicket(ticketId);
        
        if (!ticket) {
          console.log('❌ Ticket não encontrado:', ticketId);
          return socket.emit('chat:error', { message: 'Ticket not found' });
        }

        // Validação de acesso: apenas dono ou técnico atribuído
        chatService.assertChatAccess(ticket, user);

        // Processa a mensagem
        const msg = chatService.sendMessage(ticketId, user, content);
        io.to(`ticket:${ticket.zammad_id}`).emit('chat:receive', msg);
        
        logger.debug({ userId: user.sub, ticketId: ticket.zammad_id }, 'Message sent successfully');
      } catch (err) {
        logger.warn({ userId: user.sub, ticketId, error: err.message }, 'Chat message rejected');
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
        const ticket = ticketRepo.findTicket(ticketId);
        chatService.markRead(ticketId, user);
        socket.to(`ticket:${ticket.zammad_id}`).emit('chat:read_ack', {
          ticketId: ticket.zammad_id,
          readBy: user.sub,
        });
      } catch { /* silencia */ }
    });

    /**
     * chat:load_more { ticketId, offset }
     * Carrega mais mensagens do histórico
     */
    socket.on('chat:load_more', ({ ticketId, offset } = {}) => {
      if (!ticketId || typeof offset !== 'number') return;
      try {
        const history = chatService.getHistory(ticketId, user, { limit: 50, offset });
        socket.emit('chat:history_more', {
          messages: history,
          hasMore: history.length === 50,
          offset
        });
      } catch (err) {
        socket.emit('chat:error', { message: err.message });
      }
    });

    /**
     * notice:create { title, message }
     * Cria um novo aviso e broadcast para todos os técnicos
     */
    socket.on('notice:create', ({ title, message } = {}) => {
      if (!message) return;
      if (isRateLimited(socket.id)) {
        return socket.emit('notice:error', { message: 'Rate limit exceeded' });
      }

      try {
        // Valida que é técnico
        if (user.role !== 'technician' && user.role !== 'admin') {
          return socket.emit('notice:error', { message: 'Unauthorized' });
        }

        const notice = noticeService.createNotice(title, message, user);
        
        // Broadcast para todos os técnicos conectados
        io.emit('notice:new', notice);
        
        logger.debug({ userId: user.sub, noticeId: notice.id }, 'Notice broadcast');
      } catch (err) {
        logger.warn({ userId: user.sub, error: err.message }, 'Notice creation rejected');
        socket.emit('notice:error', { message: err.message });
      }
    });

    /**
     * notice:list
     * Solicita lista de avisos ativos
     */
    socket.on('notice:list', () => {
      try {
        const notices = noticeService.listActiveNotices();
        socket.emit('notice:list_response', { notices });
      } catch (err) {
        socket.emit('notice:error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      rateLimitMap.delete(socket.id);
      logger.debug({ userId: user.sub }, 'Socket disconnected');
    });
  });

  return io;
}
