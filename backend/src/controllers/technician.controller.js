import * as techService from '../services/technician.service.js';

export async function listTickets(req, res, next) {
  try {
    const { status, assigned_to } = req.query;
    const tickets = await techService.listTickets({
      user: req.user,
      status,
      assignedTo: assigned_to,
    });
    res.json(tickets);
  } catch (err) { next(err); }
}

export async function getTicket(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid ticket ID' });
    const data = await techService.getTicketDetail(parseInt(id), req.user);
    res.json(data);
  } catch (err) { next(err); }
}

export async function assignTicket(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid ticket ID' });
    const ticket = await techService.assignTicket(parseInt(id), req.user);
    res.json(ticket);
  } catch (err) { next(err); }
}

export async function changeStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid ticket ID' });
    const ticket = await techService.changeStatus(parseInt(id), req.body.status, req.user);
    res.json(ticket);
  } catch (err) { next(err); }
}

export async function addUpdate(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid ticket ID' });
    const note = await techService.addUpdate(parseInt(id), {
      message: req.body.message,
      technician: req.user,
    });
    res.status(201).json(note);
  } catch (err) { next(err); }
}
