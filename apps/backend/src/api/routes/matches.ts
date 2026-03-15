import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  createMatch,
  joinMatch,
  getMatch,
  listMatches,
} from '../../services/matchService';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middleware/auth';
import { ERROR_CODES } from '@conwoy/shared';

const router = Router();

const createMatchSchema = z.object({
  config: z.object({
    entryFeeWei: z.string().optional(),
    maxGenerations: z.number().min(10).max(1000).optional(),
    setupTimeoutSeconds: z.number().min(30).max(600).optional(),
  }).optional(),
  contractMatchId: z.number().optional(),
  transactionHash: z.string().optional(),
});

const joinMatchSchema = z.object({
  transactionHash: z.string().optional(),
});

// POST /api/matches — create a new match
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = createMatchSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request body',
        details: body.error.format(),
      });
    }

    const match = await createMatch(
      req.walletAddress!,
      body.data.config,
      body.data.contractMatchId,
      body.data.transactionHash
    );

    return res.status(201).json({ success: true, data: { match } });
  } catch (err: unknown) {
    console.error('Create match error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create match',
      code: ERROR_CODES.INTERNAL_ERROR,
    });
  }
});

// GET /api/matches — list open matches
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const phase = req.query['phase'] as string | undefined;
    const page = parseInt(req.query['page'] as string ?? '1', 10);
    const pageSize = Math.min(parseInt(req.query['pageSize'] as string ?? '20', 10), 50);

    const { matches, total } = await listMatches(phase, page, pageSize);

    return res.json({
      success: true,
      data: {
        matches,
        total,
        page,
        pageSize,
      },
    });
  } catch (err) {
    console.error('List matches error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to list matches',
      code: ERROR_CODES.INTERNAL_ERROR,
    });
  }
});

// GET /api/matches/:id — get a specific match
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const match = await getMatch(req.params['id']!);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Match not found',
        code: ERROR_CODES.MATCH_NOT_FOUND,
      });
    }

    return res.json({ success: true, data: { match } });
  } catch (err) {
    console.error('Get match error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to get match',
      code: ERROR_CODES.INTERNAL_ERROR,
    });
  }
});

// POST /api/matches/:id/join — join a match
router.post('/:id/join', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = joinMatchSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }

    const { match, slot } = await joinMatch(
      req.params['id']!,
      req.walletAddress!,
      body.data.transactionHash
    );

    return res.json({ success: true, data: { match, slot } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';

    if (message === ERROR_CODES.MATCH_NOT_FOUND) {
      return res.status(404).json({ success: false, error: 'Match not found', code: message });
    }
    if (message === ERROR_CODES.MATCH_FULL) {
      return res.status(409).json({ success: false, error: 'Match is full', code: message });
    }
    if (message === ERROR_CODES.MATCH_WRONG_PHASE) {
      return res.status(409).json({ success: false, error: 'Match is not in waiting phase', code: message });
    }

    console.error('Join match error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to join match',
      code: ERROR_CODES.INTERNAL_ERROR,
    });
  }
});

export default router;
