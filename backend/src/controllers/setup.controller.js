import * as zammad from '../services/zammad.service.js';

export async function setupCustomStates(req, res, next) {
  try {
    const results = await zammad.setupCustomStates();
    res.json({ ok: true, results });
  } catch (err) { next(err); }
}
