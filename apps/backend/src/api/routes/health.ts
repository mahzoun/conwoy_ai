import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../../db/client';
import { HealthResponse } from '@conwoy/shared';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const dbConnected = await checkDatabaseConnection();

  const response: HealthResponse = {
    status: dbConnected ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected',
    version: '1.0.0',
  };

  res.status(dbConnected ? 200 : 503).json(response);
});

export default router;
