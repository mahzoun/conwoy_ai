'use client';

import { useAccount, useChainId, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { ESCROW_ADDRESSES, GAME_ESCROW_ABI } from '../config/contracts';
import { useCallback } from 'react';

interface UseContractReturn {
  contractAddress: `0x${string}` | undefined;
  isCorrectNetwork: boolean;
  createMatch: (matchId: bigint, entryFeeWei: string) => Promise<`0x${string}` | undefined>;
  joinMatch: (matchId: bigint, entryFeeWei: string) => Promise<`0x${string}` | undefined>;
  isWritePending: boolean;
  isTxLoading: boolean;
  txHash: `0x${string}` | undefined;
  txReceipt: unknown;
}

export function useContract(): UseContractReturn {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContractAsync, isPending: isWritePending, data: txHash } = useWriteContract();

  const contractAddress = chainId ? ESCROW_ADDRESSES[chainId] : undefined;
  const isCorrectNetwork = !!contractAddress && contractAddress !== '0x0000000000000000000000000000000000000000';

  const { isLoading: isTxLoading, data: txReceipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const createMatch = useCallback(async (matchId: bigint, entryFeeWei: string) => {
    if (!contractAddress || !address) return undefined;

    const hash = await writeContractAsync({
      address: contractAddress,
      abi: GAME_ESCROW_ABI,
      functionName: 'createMatch',
      args: [matchId],
      value: BigInt(entryFeeWei),
    });

    return hash;
  }, [contractAddress, address, writeContractAsync]);

  const joinMatch = useCallback(async (matchId: bigint, entryFeeWei: string) => {
    if (!contractAddress || !address) return undefined;

    const hash = await writeContractAsync({
      address: contractAddress,
      abi: GAME_ESCROW_ABI,
      functionName: 'joinMatch',
      args: [matchId],
      value: BigInt(entryFeeWei),
    });

    return hash;
  }, [contractAddress, address, writeContractAsync]);

  return {
    contractAddress,
    isCorrectNetwork,
    createMatch,
    joinMatch,
    isWritePending,
    isTxLoading,
    txHash,
    txReceipt,
  };
}
