import { Router } from 'express';
import { cards } from './cards';
import { filters } from './filters';
import { auth } from './auth';


export const routes = Router();
routes.use('/cards', cards);
routes.use('/filters', filters);
routes.use('/auth', auth);