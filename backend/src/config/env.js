import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  REFRESH_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  ZAMMAD_URL: z.string().url(),
  ZAMMAD_API_TOKEN: z.string().min(1),
  /** Nome interno do atributo Ticket (tree_select) se usar modo árvore (sem arquivo de passos) */
  ZAMMAD_TICKET_TREE_CLASSIFICATION_FIELD: z.string().max(120).optional(),
  /** Caminho para JSON de passos (vários selects); ver ticket-classification.example.json */
  ZAMMAD_TICKET_CLASSIFICATION_CONFIG_PATH: z.string().max(500).optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  LOGIN_RATE_LIMIT_MAX: z.string().default('10'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
