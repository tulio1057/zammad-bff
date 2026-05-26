import { Router } from 'express';
import { listTickets, getTicket, createTicket, getTicketFormFields } from '../controllers/ticket.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateCreateTicket } from '../middlewares/validation.middleware.js';
import * as zammadService from '../services/zammad.service.js';

const router = Router();

router.use(authenticate);

// Endpoint de diagnóstico temporário — mostra campos select do Object Manager
router.get('/debug/fields', async (req, res) => {
  try {
    const attrs = await zammadService.fetchTicketObjectAttributes();
    const selectFields = attrs
      .filter((a) => ['select', 'multiselect', 'tree_select'].includes(a.data_type))
      .map((a) => ({
        name: a.name,
        display: a.display,
        data_type: a.data_type,
        options: a.data_option?.options ?? null,
      }));
    res.json(selectFields);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/',            listTickets);
router.get('/form-fields', getTicketFormFields);
router.get('/:id',         getTicket);
router.post('/',           validateCreateTicket, createTicket);

export default router;
