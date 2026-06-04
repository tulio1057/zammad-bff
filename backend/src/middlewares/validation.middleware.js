import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const createTicketSchema = z.object({
  title:               z.string().min(3).max(200).trim(),
  body:                z.string().min(10).max(10000).trim(),
  // nullish + transform: aceita null/undefined do frontend e normaliza para undefined
  category:            z.string().max(200).trim().nullish().transform(v => v ?? undefined),
  subcategory:         z.string().max(200).trim().nullish().transform(v => v ?? undefined),
  // Suporta prioridade 4 = Crítica (necessário para subcategorias críticas do Zammad)
  priority:            z.enum(['1', '2', '3', '4']).optional().default('2'),
  group:               z.string().max(200).trim().nullish(),
  classificationField: z.string().max(120).trim().nullish(),
  classificationValue: z.string().max(300).trim().nullish(),
  // Aceita null nos valores para permitir limpeza de campos dinâmicos do Zammad
  ticketAttributes:    z
    .record(
      z.string().max(120),
      z.union([z.string(), z.number(), z.null()])
        .transform((v) => (v == null ? '' : String(v)))
        .pipe(z.string().max(400))
    )
    .optional()
    .refine((r) => !r || Object.keys(r).length <= 30, 'Muitos atributos'),
});

const changeStatusSchema = z.object({
  status: z.enum(['aberto', 'em_andamento', 'aguardando', 'fechado']),
});

const addUpdateSchema = z.object({
  message: z.string().min(3).max(5000).trim(),
});

// Schema para criação de avisos (módulo notices de main)
const createNoticeSchema = z.object({
  title:   z.string().max(200).trim().optional(),
  message: z.string().min(1).max(5000).trim(),
});

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

export const validateLogin          = validate(loginSchema);
export const validateCreateTicket   = validate(createTicketSchema);
export const validateChangeStatus   = validate(changeStatusSchema);
export const validateAddUpdate      = validate(addUpdateSchema);
export const validateCreateNotice   = validate(createNoticeSchema);

const forgotPasswordSchema = z.object({
  email: z.string().email().max(254),
});

const unassignSchema = z.object({
  reason: z.string().min(10).max(500).trim(),
});

export const validateForgotPassword = validate(forgotPasswordSchema);
export const validateUnassign       = validate(unassignSchema);
