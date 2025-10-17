import { z } from 'zod';


const EnvSchema = z.object({
NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
PORT: z.coerce.number().int().positive().default(8080),
DATABASE_URL: z.string().url(),
JWT_SECRET: z.string().min(32),
CORS_ORIGIN: z.string().default('http://localhost:5173'),
EMAIL_FROM: z.string().email().optional(),
});


export type Env = z.infer<typeof EnvSchema>;
export const env: Env = EnvSchema.parse(process.env);