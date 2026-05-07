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
    const data = await techService.getTicketDetail(req.params.id, req.user);
    res.json(data);
  } catch (err) { next(err); }
}

export async function assignTicket(req, res, next) {
  try {
    const ticket = techService.assignTicket(req.params.id, req.user);
    res.json(ticket);
  } catch (err) { next(err); }
}

export async function changeStatus(req, res, next) {
  try {
    const ticket = techService.changeStatus(req.params.id, req.body.status, req.user);
    res.json(ticket);
  } catch (err) { next(err); }
}

export async function addUpdate(req, res, next) {
  try {
    const update = techService.addUpdate(req.params.id, {
      message: req.body.message,
      technician: req.user,
    });
    res.status(201).json(update);
  } catch (err) { next(err); }
}
