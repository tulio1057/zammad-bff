import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

const createTicketSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  body: z.string().min(10).max(10000).trim(),
  category: z.string().max(200).trim().optional(),
  subcategory: z.string().max(200).trim().optional(),
  priority: z.enum(['1', '2', '3']).optional().default('2'),
  group: z.string().max(200).trim().optional(),
  classificationField: z.string().max(120).trim().optional(),
  classificationValue: z.string().max(300).trim().optional(),
  ticketAttributes: z
    .record(z.string().max(120), z.string().max(400))
    .optional()
    .refine((r) => !r || Object.keys(r).length <= 30, 'Muitos atributos'),
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

export const validateLogin = validate(loginSchema);
export const validateCreateTicket = validate(createTicketSchema);