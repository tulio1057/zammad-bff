import * as ticketService from "../services/ticket.service.js";

export async function listTickets(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.per_page) || 25, 100);

    const tickets = await ticketService.getTickets({
      user: req.user,
      page,
      perPage,
    });
    res.json(tickets);
  } catch (err) {
    next(err);
  }
}

export async function getTicket(req, res, next) {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id))
      return res.status(400).json({ error: "Invalid ticket ID" });

    const data = await ticketService.getTicketDetails(parseInt(id), req.user);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createTicket(req, res, next) {
  try {
    const {
      title,
      body,
      category,
      subcategory,
      priority,
      group,
      classificationField,
      classificationValue,
      ticketAttributes,
    } = req.body;
    const ticket = await ticketService.createNewTicket({
      title,
      body,
      category,
      subcategory,
      priority,
      group,
      classificationField,
      classificationValue,
      ticketAttributes,
      user: req.user,
    });
    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

export async function getTicketFormFields(req, res, next) {
  try {
    const fields = await ticketService.getFormFields();
    res.json(fields);
  } catch (err) {
    next(err);
  }
}
