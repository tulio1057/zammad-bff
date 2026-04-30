import { useState, useEffect } from 'react';
import api from '../services/api.js';

export function useZammadMetadata() {
  const [metadata, setMetadata] = useState({
    groups: {},
    priorities: {},
    states: {},
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarMetadados() {
      try {
        // Buscar grupos (categorias)
        const gruposRes = await api.get('/groups').catch(() => ({ data: [] }));
        const grupos = Array.isArray(gruposRes.data) ? gruposRes.data : gruposRes.data.groups || [];
        const gruposMap = {};
        grupos.forEach((g) => {
          gruposMap[g.id] = g.name;
        });

        // Buscar prioridades
        const prioridadesRes = await api.get('/priorities').catch(() => ({ data: [] }));
        const prioridades = Array.isArray(prioridadesRes.data) ? prioridadesRes.data : prioridadesRes.data.priorities || [];
        const prioridadesMap = {};
        prioridades.forEach((p) => {
          prioridadesMap[p.id] = p.name;
        });

        // Buscar estados
        const estadosRes = await api.get('/ticket_states').catch(() => ({ data: [] }));
        const estados = Array.isArray(estadosRes.data) ? estadosRes.data : estadosRes.data.ticket_states || [];
        const estadosMap = {};
        estados.forEach((e) => {
          estadosMap[e.id] = e.name;
        });

        setMetadata({
          groups: gruposMap,
          priorities: prioridadesMap,
          states: estadosMap,
        });
      } catch (err) {
        console.error('Erro ao carregar metadados:', err);
      } finally {
        setLoading(false);
      }
    }

    carregarMetadados();
  }, []);

  return { metadata, loading };
}
