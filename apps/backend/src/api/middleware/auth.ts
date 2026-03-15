import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { ERROR_CODES } from '@conwoy/shared';

export interface AuthenticatedRequest extends Request {
  walletAddress?: string;
}

/**
 * Middleware that optionally verifies Ethereum signature.
 * Extracts wallet address from x-wallet-address header (for authenticated endpoints).
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const walletAddress = req.headers['x-wallet-address'] as string;
  const signature = req.headers['x-signature'] as string;
  const message = req.headers['x-message'] as string;

  if (!walletAddress) {
    res.status(401).json({
      success: false,
      error: 'Missing wallet address',
      code: ERROR_CODES.UNAUTHORIZED,
    });
    return;
  }

  // If signature provided, verify it
  if (signature && message) {
    try {
      const recovered = ethers.verifyMessage(message, signature);
      if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
        res.status(401).json({
          success: false,
          error: 'Invalid signature',
          code: ERROR_CODES.UNAUTHORIZED,
        });
        return;
      }
    } catch {
      res.status(401).json({
        success: false,
        error: 'Invalid signature format',
        code: ERROR_CODES.UNAUTHORIZED,
      });
      return;
    }
  }

  req.walletAddress = walletAddress.toLowerCase();
  next();
}

/**
 * Optional auth: sets walletAddress if provided, continues regardless.
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const walletAddress = req.headers['x-wallet-address'] as string;
  if (walletAddress) {
    req.walletAddress = walletAddress.toLowerCase();
  }
  next();
}
