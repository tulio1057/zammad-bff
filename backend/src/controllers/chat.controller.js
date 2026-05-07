import * as chatService from '../services/chat.service.js';

export function getChatHistory(req, res, next) {
  try {
    const messages = chatService.getHistory(req.params.id, req.user);
    res.json(messages);
  } catch (err) { next(err); }
}

export function markRead(req, res, next) {
  try {
    chatService.markRead(req.params.id, req.user);
    res.json({ ok: true });
  } catch (err) { next(err); }
}
