import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { routes } from './routes';
import { limiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/error';
import { requestLog } from './middleware/requestLog';


// @ts-expect-error TS(2742): The inferred type of 'createApp' cannot be named w... Remove this comment to see the full error message
export function createApp() {
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(limiter);
app.use(requestLog);


app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', routes);
app.use(errorHandler);
return app;
}