import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV:       z.enum(['development', 'production', 'test']).default('development'),
  PORT:           z.coerce.number().default(3000),
  FRONTEND_URL:   z.string().min(1),
  ZAMMAD_URL:     z.string().url(),
  ZAMMAD_API_TOKEN: z.string().min(1),
  JWT_SECRET:     z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  /** Nome interno do atributo Ticket (tree_select) se usar modo árvore (sem arquivo de passos) */
  ZAMMAD_TICKET_TREE_CLASSIFICATION_FIELD: z.string().max(120).optional(),
  /** Caminho para JSON de passos (vários selects); ver ticket-classification.example.json */
  ZAMMAD_TICKET_CLASSIFICATION_CONFIG_PATH: z.string().max(500).optional(),
});

export const env = envSchema.parse(process.env);
