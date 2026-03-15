import { API_URL } from './constants';
import {
  Match,
  CreateMatchRequest,
  JoinMatchRequest,
  ApiResponse,
  ProfileResponse,
  MatchConfig,
} from '@conwoy/shared';

async function fetchApi<T>(
  path: string,
  options?: RequestInit & { walletAddress?: string; signature?: string; message?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.walletAddress && { 'x-wallet-address': options.walletAddress }),
    ...(options?.signature && { 'x-signature': options.signature }),
    ...(options?.message && { 'x-message': options.message }),
    ...(options?.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(errorBody.error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  matches: {
    list: async (params?: { phase?: string; page?: number; pageSize?: number }) => {
      const qs = new URLSearchParams();
      if (params?.phase) qs.set('phase', params.phase);
      if (params?.page) qs.set('page', String(params.page));
      if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
      const query = qs.toString() ? `?${qs}` : '';
      return fetchApi<ApiResponse<{ matches: Match[]; total: number; page: number; pageSize: number }>>(
        `/api/matches${query}`
      );
    },

    get: async (id: string) => {
      return fetchApi<ApiResponse<{ match: Match }>>(`/api/matches/${id}`);
    },

    create: async (
      walletAddress: string,
      config?: Partial<MatchConfig>,
      contractMatchId?: number,
      transactionHash?: string
    ) => {
      return fetchApi<ApiResponse<{ match: Match }>>('/api/matches', {
        method: 'POST',
        walletAddress,
        body: JSON.stringify({ config, contractMatchId, transactionHash }),
      });
    },

    join: async (
      id: string,
      walletAddress: string,
      transactionHash?: string
    ) => {
      return fetchApi<ApiResponse<{ match: Match; slot: 1 | 2 }>>(`/api/matches/${id}/join`, {
        method: 'POST',
        walletAddress,
        body: JSON.stringify({ transactionHash }),
      });
    },
  },

  profile: {
    get: async (address: string, page?: number) => {
      const qs = page ? `?page=${page}` : '';
      return fetchApi<ApiResponse<ProfileResponse>>(`/api/profile/${address}${qs}`);
    },
  },

  health: {
    check: async () => {
      return fetchApi<{ status: string; timestamp: string; database: string }>('/api/health');
    },
  },
};
