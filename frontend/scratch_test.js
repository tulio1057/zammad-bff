import { getTickets } from './src/services/ticket.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    // Mock user for getTickets
    const user = { role: 'admin', zammadId: 1 };
    const tickets = await getTickets({ user, page: 1, perPage: 5 });
    
    if (Array.isArray(tickets)) {
        console.log("Tickets is Array, length:", tickets.length);
        for (let i = 0; i < tickets.length; i++) {
           const t = tickets[i];
           console.log(`Ticket ${t.id} - Group:`, typeof t.group, t.group, `Category:`, t.category, `Sub:`, t.subcategory);
        }
    } else {
        console.log("Tickets is Object, keys:", Object.keys(tickets));
    }
  } catch (err) {
    console.error("Error:", err.message, err.stack);
  }
}
run();
