import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        username: string;
        role: string;
        exp?: number;
        iat?: number;
      };
      csrfToken?: string;
    }
  }
}