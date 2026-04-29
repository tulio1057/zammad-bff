import { Router } from 'express';
import { listTickets, getTicket, createTicket } from '../controllers/ticket.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateCreateTicket } from '../middlewares/validation.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', listTickets);
router.get('/:id', getTicket);
router.post('/', validateCreateTicket, createTicket);

export default router;
