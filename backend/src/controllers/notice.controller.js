import * as noticeService from '../services/notice.service.js';

/**
 * POST /api/tech/notices
 * Cria um novo aviso
 */
export async function createNotice(req, res, next) {
  try {
    const { title, message } = req.body;
    const notice = noticeService.createNotice(title, message, req.user);
    res.status(201).json(notice);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tech/notices
 * Lista todos os avisos ativos
 */
export async function listNotices(req, res, next) {
  try {
    const notices = noticeService.listActiveNotices();
    res.json(notices);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/tech/notices/recent
 * Obtém os últimos avisos ativos (para exibição em destaque)
 */
export async function getRecentNotices(req, res, next) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 5, 20);
    const notices = noticeService.getRecentNotices(limit);
    res.json(notices);
  } catch (err) {
    next(err);
  }
}
