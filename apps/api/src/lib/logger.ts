// @ts-expect-error TS(2307): Cannot find module 'pino' or its corresponding typ... Remove this comment to see the full error message
import pino from 'pino';
export const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });