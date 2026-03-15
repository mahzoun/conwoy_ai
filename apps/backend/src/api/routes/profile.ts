import { Router, Request, Response } from 'express';
import { getMatchHistory } from '../../services/matchService';
import { query } from '../../db/client';
import { ERROR_CODES } from '@conwoy/shared';

const router = Router();

// GET /api/profile/:address — get wallet profile and match history
router.get('/:address', async (req: Request, res: Response) => {
  try {
    const walletAddress = req.params['address']!.toLowerCase();
    const page = parseInt(req.query['page'] as string ?? '1', 10);
    const pageSize = Math.min(parseInt(req.query['pageSize'] as string ?? '20', 10), 50);

    const { items, total } = await getMatchHistory(walletAddress, page, pageSize);

    // Compute aggregate stats
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let totalEarnings = BigInt(0);

    for (const item of items) {
      if (item.result === 'win') wins++;
      else if (item.result === 'loss') losses++;
      else draws++;
    }

    // Get total stats from DB (not just current page)
    const statsRows = await query<{
      wins: string;
      losses: string;
      draws: string;
      total_matches: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE result = 'win') AS wins,
         COUNT(*) FILTER (WHERE result = 'loss') AS losses,
         COUNT(*) FILTER (WHERE result = 'draw') AS draws,
         COUNT(*) AS total_matches
       FROM match_history
       WHERE wallet_address = $1`,
      [walletAddress]
    );

    const stats = statsRows[0] ?? { wins: '0', losses: '0', draws: '0', total_matches: '0' };

    const recentMatches = items.map(item => ({
      matchId: item.match_id,
      opponentAddress: item.opponent_address ?? '0x0000000000000000000000000000000000000000',
      playerSlot: item.player_slot,
      result: item.result,
      finalScoreSelf: item.final_score_self,
      finalScoreOpponent: item.final_score_opponent,
      entryFeeWei: item.entry_fee_wei ?? '0',
      finishedAt: item.finished_at instanceof Date
        ? item.finished_at.toISOString()
        : String(item.finished_at),
    }));

    return res.json({
      success: true,
      data: {
        walletAddress,
        totalMatches: parseInt(stats.total_matches, 10),
        wins: parseInt(stats.wins, 10),
        losses: parseInt(stats.losses, 10),
        draws: parseInt(stats.draws, 10),
        totalEarnings: '0', // Would need on-chain data for real earnings
        recentMatches,
        page,
        pageSize,
        total,
      },
    });
  } catch (err) {
    console.error('Profile error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      code: ERROR_CODES.INTERNAL_ERROR,
    });
  }
});

export default router;
