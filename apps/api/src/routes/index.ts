import { Router } from 'express';
// @ts-expect-error TS(2305): Module '"./cards"' has no exported member 'cards'.
import { cards } from './cards';
import { filters } from './filters';
import { auth } from './auth';


// @ts-expect-error TS(2742): The inferred type of 'routes' cannot be named with... Remove this comment to see the full error message
export const routes = Router();
routes.use('/cards', cards);
routes.use('/filters', filters);
routes.use('/auth', auth);