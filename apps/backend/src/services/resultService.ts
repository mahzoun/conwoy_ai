import { ethers } from 'ethers';
import { PlayerSlot } from '@conwoy/shared';
import { config } from '../config';

class ResultService {
  private wallet: ethers.Wallet;

  constructor() {
    this.wallet = new ethers.Wallet(config.signing.privateKey);
  }

  get signerAddress(): string {
    return this.wallet.address;
  }

  /**
   * Sign a match result.
   * Message format: keccak256(matchId, winner, finalScoreP1, finalScoreP2)
   */
  async signResult(
    matchId: string,
    winner: PlayerSlot | 'draw',
    finalScoreP1: number,
    finalScoreP2: number
  ): Promise<string> {
    const winnerEncoded = winner === 'draw' ? 0 : winner;
    const winnerAddress = winner === 'draw'
      ? ethers.ZeroAddress
      : winner === 1
        ? ethers.ZeroAddress // placeholder - real app would have player addresses
        : ethers.ZeroAddress;

    // Encode the result data
    const messageHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'uint8', 'uint256', 'uint256'],
        [matchId, winnerEncoded, BigInt(finalScoreP1), BigInt(finalScoreP2)]
      )
    );

    // Sign with Ethereum prefix (EIP-191)
    const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));
    return signature;
  }

  /**
   * Verify a match result signature.
   */
  verifyResult(
    matchId: string,
    winner: PlayerSlot | 'draw',
    finalScoreP1: number,
    finalScoreP2: number,
    signature: string
  ): boolean {
    try {
      const winnerEncoded = winner === 'draw' ? 0 : winner;

      const messageHash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['string', 'uint8', 'uint256', 'uint256'],
          [matchId, winnerEncoded, BigInt(finalScoreP1), BigInt(finalScoreP2)]
        )
      );

      const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), signature);
      return recoveredAddress.toLowerCase() === this.wallet.address.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * Sign a message for contract finalization.
   * Signs: keccak256(abi.encodePacked(matchId, winnerAddress))
   */
  async signForContract(
    contractMatchId: number,
    winnerAddress: string
  ): Promise<string> {
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ['uint256', 'address'],
        [BigInt(contractMatchId), winnerAddress]
      )
    );

    const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));
    return signature;
  }
}

export const resultService = new ResultService();
