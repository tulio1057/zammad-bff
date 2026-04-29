import { useState, useEffect, useCallback } from 'react';
import { fetchTickets } from '../services/ticket.service.js';

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTickets(p);
      setTickets(Array.isArray(data) ? data : data.tickets ?? []);
      setPage(p);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar chamados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  return { tickets, loading, error, page, reload: load };
}
