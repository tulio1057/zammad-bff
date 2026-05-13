import { Router } from 'express';
import { authenticate, requireTechnician } from '../middlewares/auth.middleware.js';
import { validateChangeStatus, validateAddUpdate } from '../middlewares/validation.middleware.js';
import {
  listTickets,
  getTicket,
  assignTicket,
  unassignTicket,
  reassignTicket,
  changeStatus,
  addUpdate,
  listStates,
  listAgents,
} from '../controllers/technician.controller.js';

const router = Router();
router.use(authenticate, requireTechnician);

/**
 * GET  /api/tech/tickets?status=aberto&assigned_to=:id
 * GET  /api/tech/tickets/:id
 * POST /api/tech/tickets/:id/assign
 * PATCH /api/tech/tickets/:id/status   { status }
 * POST /api/tech/tickets/:id/update    { message }
 */
router.get('/agents',                    listAgents);
router.get('/states',                    listStates);
router.get('/',                          listTickets);
router.get('/:id',                       getTicket);
router.post('/:id/assign',               assignTicket);
router.post('/:id/unassign',             unassignTicket);
router.post('/:id/reassign',             reassignTicket);
router.patch('/:id/status', validateChangeStatus, changeStatus);
router.post('/:id/update',  validateAddUpdate,    addUpdate);

export default router;
