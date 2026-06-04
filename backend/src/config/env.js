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
  /** Microsoft 365 OAuth — use MICROSOFT_* no .env */
  MICROSOFT_CLIENT_ID:     z.string().optional(),
  MICROSOFT_CLIENT_SECRET: z.string().optional(),
  MICROSOFT_REDIRECT_URI:  z.string().url().optional(),
  MICROSOFT_TENANT_ID:     z.string().optional(),
});

const _env = envSchema.parse(process.env);

// Aliases para retrocompatibilidade com microsoft.service.js (que usava AZURE_*)
// Isso permite migrar o .env gradualmente sem alterar o service de uma vez.
_env.AZURE_CLIENT_ID     = _env.AZURE_CLIENT_ID     || _env.MICROSOFT_CLIENT_ID;
_env.AZURE_CLIENT_SECRET = _env.AZURE_CLIENT_SECRET || _env.MICROSOFT_CLIENT_SECRET;
_env.AZURE_TENANT_ID     = _env.AZURE_TENANT_ID     || _env.MICROSOFT_TENANT_ID;

export const env = _env;
