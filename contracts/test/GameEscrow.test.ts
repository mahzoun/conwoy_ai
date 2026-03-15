import { ethers } from 'hardhat';
import { expect } from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { time } from '@nomicfoundation/hardhat-network-helpers';
import { GameEscrow } from '../typechain-types';

describe('GameEscrow', () => {
  let escrow: GameEscrow;
  let owner: HardhatEthersSigner;
  let backendSigner: HardhatEthersSigner;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  const PLATFORM_FEE_BPS = 250; // 2.5%
  const STAKE = ethers.parseEther('0.1');
  const MATCH_ID = 1n;

  beforeEach(async () => {
    [owner, backendSigner, player1, player2, other] = await ethers.getSigners();

    const GameEscrowFactory = await ethers.getContractFactory('GameEscrow');
    escrow = (await GameEscrowFactory.deploy(
      backendSigner.address,
      PLATFORM_FEE_BPS
    )) as GameEscrow;
    await escrow.waitForDeployment();
  });

  // Helper: sign a result
  async function signResult(matchId: bigint, winner: string): Promise<string> {
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(['uint256', 'address'], [matchId, winner])
    );
    return backendSigner.signMessage(ethers.getBytes(messageHash));
  }

  // Helper: create and join a match
  async function createAndJoin(matchId: bigint, stake = STAKE) {
    await escrow.connect(player1).createMatch(matchId, { value: stake });
    await escrow.connect(player2).joinMatch(matchId, { value: stake });
  }

  // ============================================================
  // Deployment
  // ============================================================
  describe('Deployment', () => {
    it('sets the correct owner', async () => {
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it('sets the correct backend signer', async () => {
      expect(await escrow.backendSigner()).to.equal(backendSigner.address);
    });

    it('sets the correct platform fee', async () => {
      expect(await escrow.platformFeeBps()).to.equal(PLATFORM_FEE_BPS);
    });

    it('reverts if backend signer is zero address', async () => {
      const Factory = await ethers.getContractFactory('GameEscrow');
      await expect(
        Factory.deploy(ethers.ZeroAddress, PLATFORM_FEE_BPS)
      ).to.be.revertedWithCustomError(escrow, 'ZeroAddress');
    });

    it('reverts if platform fee is too high (> 10%)', async () => {
      const Factory = await ethers.getContractFactory('GameEscrow');
      await expect(
        Factory.deploy(backendSigner.address, 1001)
      ).to.be.revertedWithCustomError(escrow, 'FeeTooHigh');
    });
  });

  // ============================================================
  // createMatch
  // ============================================================
  describe('createMatch', () => {
    it('creates a match and emits MatchCreated', async () => {
      await expect(
        escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE })
      )
        .to.emit(escrow, 'MatchCreated')
        .withArgs(MATCH_ID, player1.address, STAKE);
    });

    it('stores match data correctly', async () => {
      await escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE });
      const [p1, p2, stake, finalized] = await escrow.getMatch(MATCH_ID);
      expect(p1).to.equal(player1.address);
      expect(p2).to.equal(ethers.ZeroAddress);
      expect(stake).to.equal(STAKE);
      expect(finalized).to.be.false;
    });

    it('reverts on duplicate match ID', async () => {
      await escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE });
      await expect(
        escrow.connect(other).createMatch(MATCH_ID, { value: STAKE })
      ).to.be.revertedWithCustomError(escrow, 'MatchAlreadyExists');
    });

    it('reverts when paused', async () => {
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE })
      ).to.be.revertedWithCustomError(escrow, 'EnforcedPause');
    });

    it('accepts zero stake (free match)', async () => {
      await expect(
        escrow.connect(player1).createMatch(MATCH_ID, { value: 0n })
      ).to.not.be.reverted;
    });
  });

  // ============================================================
  // joinMatch
  // ============================================================
  describe('joinMatch', () => {
    beforeEach(async () => {
      await escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE });
    });

    it('joins a match and emits MatchJoined', async () => {
      await expect(
        escrow.connect(player2).joinMatch(MATCH_ID, { value: STAKE })
      )
        .to.emit(escrow, 'MatchJoined')
        .withArgs(MATCH_ID, player2.address);
    });

    it('stores player2 correctly', async () => {
      await escrow.connect(player2).joinMatch(MATCH_ID, { value: STAKE });
      const [, p2] = await escrow.getMatch(MATCH_ID);
      expect(p2).to.equal(player2.address);
    });

    it('reverts when joining a non-existent match', async () => {
      await expect(
        escrow.connect(player2).joinMatch(999n, { value: STAKE })
      ).to.be.revertedWithCustomError(escrow, 'MatchNotFound');
    });

    it('reverts when match is already full', async () => {
      await escrow.connect(player2).joinMatch(MATCH_ID, { value: STAKE });
      await expect(
        escrow.connect(other).joinMatch(MATCH_ID, { value: STAKE })
      ).to.be.revertedWithCustomError(escrow, 'MatchAlreadyFull');
    });

    it('reverts when player1 tries to join own match', async () => {
      await expect(
        escrow.connect(player1).joinMatch(MATCH_ID, { value: STAKE })
      ).to.be.revertedWithCustomError(escrow, 'CannotJoinOwnMatch');
    });

    it('reverts when stake amount is incorrect', async () => {
      await expect(
        escrow.connect(player2).joinMatch(MATCH_ID, { value: ethers.parseEther('0.05') })
      ).to.be.revertedWithCustomError(escrow, 'IncorrectStake');
    });

    it('reverts when paused', async () => {
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(player2).joinMatch(MATCH_ID, { value: STAKE })
      ).to.be.revertedWithCustomError(escrow, 'EnforcedPause');
    });
  });

  // ============================================================
  // finalizeMatch (winner)
  // ============================================================
  describe('finalizeMatch', () => {
    beforeEach(async () => {
      await createAndJoin(MATCH_ID);
    });

    it('pays winner and takes platform fee', async () => {
      const sig = await signResult(MATCH_ID, player1.address);
      const totalPot = STAKE * 2n;
      const fee = (totalPot * BigInt(PLATFORM_FEE_BPS)) / 10000n;
      const payout = totalPot - fee;

      const balanceBefore = await ethers.provider.getBalance(player1.address);

      await expect(escrow.connect(other).finalizeMatch(MATCH_ID, player1.address, sig))
        .to.emit(escrow, 'MatchFinalized')
        .withArgs(MATCH_ID, player1.address, payout);

      const balanceAfter = await ethers.provider.getBalance(player1.address);
      expect(balanceAfter - balanceBefore).to.equal(payout);
      expect(await escrow.platformFeeBalance()).to.equal(fee);
    });

    it('player2 can win', async () => {
      const sig = await signResult(MATCH_ID, player2.address);
      const totalPot = STAKE * 2n;
      const fee = (totalPot * BigInt(PLATFORM_FEE_BPS)) / 10000n;
      const payout = totalPot - fee;

      const balanceBefore = await ethers.provider.getBalance(player2.address);
      await escrow.connect(other).finalizeMatch(MATCH_ID, player2.address, sig);
      const balanceAfter = await ethers.provider.getBalance(player2.address);

      expect(balanceAfter - balanceBefore).to.equal(payout);
    });

    it('marks match as finalized', async () => {
      const sig = await signResult(MATCH_ID, player1.address);
      await escrow.connect(other).finalizeMatch(MATCH_ID, player1.address, sig);
      const [, , , finalized] = await escrow.getMatch(MATCH_ID);
      expect(finalized).to.be.true;
    });

    it('reverts on invalid signature', async () => {
      // Sign with wrong key
      const wrongSig = await player1.signMessage('wrong');
      await expect(
        escrow.connect(other).finalizeMatch(MATCH_ID, player1.address, wrongSig)
      ).to.be.revertedWithCustomError(escrow, 'InvalidSignature');
    });

    it('reverts when winner is not a match player', async () => {
      // The contract checks player membership BEFORE signature, so NotMatchPlayer is thrown
      const sig = await signResult(MATCH_ID, other.address);
      await expect(
        escrow.connect(other).finalizeMatch(MATCH_ID, other.address, sig)
      ).to.be.revertedWithCustomError(escrow, 'NotMatchPlayer');
    });

    it('reverts when finalizing twice', async () => {
      const sig = await signResult(MATCH_ID, player1.address);
      await escrow.connect(other).finalizeMatch(MATCH_ID, player1.address, sig);

      const sig2 = await signResult(MATCH_ID, player2.address);
      await expect(
        escrow.connect(other).finalizeMatch(MATCH_ID, player2.address, sig2)
      ).to.be.revertedWithCustomError(escrow, 'MatchAlreadyFinalized');
    });

    it('reverts when match not full', async () => {
      const NEW_MATCH_ID = 2n;
      await escrow.connect(player1).createMatch(NEW_MATCH_ID, { value: STAKE });
      const sig = await signResult(NEW_MATCH_ID, player1.address);
      await expect(
        escrow.connect(other).finalizeMatch(NEW_MATCH_ID, player1.address, sig)
      ).to.be.revertedWithCustomError(escrow, 'MatchNotFull');
    });
  });

  // ============================================================
  // finalizeDrawMatch
  // ============================================================
  describe('finalizeDrawMatch', () => {
    beforeEach(async () => {
      await createAndJoin(MATCH_ID);
    });

    it('splits pot evenly and emits MatchDraw', async () => {
      // Draw signature uses address(0) as winner
      const sig = await signResult(MATCH_ID, ethers.ZeroAddress);
      const totalPot = STAKE * 2n;
      const fee = (totalPot * BigInt(PLATFORM_FEE_BPS)) / 10000n;
      const payoutPerPlayer = (totalPot - fee) / 2n;

      const p1Before = await ethers.provider.getBalance(player1.address);
      const p2Before = await ethers.provider.getBalance(player2.address);

      await expect(escrow.connect(other).finalizeDrawMatch(MATCH_ID, sig))
        .to.emit(escrow, 'MatchDraw')
        .withArgs(MATCH_ID, payoutPerPlayer);

      const p1After = await ethers.provider.getBalance(player1.address);
      const p2After = await ethers.provider.getBalance(player2.address);

      expect(p1After - p1Before).to.equal(payoutPerPlayer);
      expect(p2After - p2Before).to.equal(payoutPerPlayer);
    });

    it('reverts with invalid signature', async () => {
      const wrongSig = await owner.signMessage('draw');
      await expect(
        escrow.connect(other).finalizeDrawMatch(MATCH_ID, wrongSig)
      ).to.be.revertedWithCustomError(escrow, 'InvalidSignature');
    });
  });

  // ============================================================
  // refundExpiredMatch
  // ============================================================
  describe('refundExpiredMatch', () => {
    const REFUND_TIMEOUT = 24 * 60 * 60; // 24 hours in seconds

    it('refunds player1 after timeout if no player2', async () => {
      await escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE });
      await time.increase(REFUND_TIMEOUT + 1);

      const balanceBefore = await ethers.provider.getBalance(player1.address);
      const tx = await escrow.connect(player1).refundExpiredMatch(MATCH_ID);
      const receipt = await tx.wait();
      const gasUsed = (receipt?.gasUsed ?? 0n) * (receipt?.gasPrice ?? 0n);
      const balanceAfter = await ethers.provider.getBalance(player1.address);

      expect(balanceAfter + gasUsed - balanceBefore).to.equal(STAKE);
    });

    it('emits MatchRefunded event', async () => {
      await escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE });
      await time.increase(REFUND_TIMEOUT + 1);

      await expect(escrow.connect(player1).refundExpiredMatch(MATCH_ID))
        .to.emit(escrow, 'MatchRefunded')
        .withArgs(MATCH_ID, player1.address, STAKE);
    });

    it('reverts before timeout', async () => {
      await escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE });

      await expect(
        escrow.connect(player1).refundExpiredMatch(MATCH_ID)
      ).to.be.revertedWithCustomError(escrow, 'RefundTimeoutNotReached');
    });

    it('reverts when player2 has already joined', async () => {
      await createAndJoin(MATCH_ID);
      await time.increase(REFUND_TIMEOUT + 1);

      await expect(
        escrow.connect(player1).refundExpiredMatch(MATCH_ID)
      ).to.be.revertedWithCustomError(escrow, 'MatchAlreadyFull');
    });

    it('reverts when called by non-player1', async () => {
      await escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE });
      await time.increase(REFUND_TIMEOUT + 1);

      await expect(
        escrow.connect(other).refundExpiredMatch(MATCH_ID)
      ).to.be.revertedWithCustomError(escrow, 'NotMatchPlayer');
    });
  });

  // ============================================================
  // Admin functions
  // ============================================================
  describe('Admin functions', () => {
    it('owner can update backend signer', async () => {
      await expect(escrow.connect(owner).setBackendSigner(other.address))
        .to.emit(escrow, 'BackendSignerUpdated')
        .withArgs(other.address);
      expect(await escrow.backendSigner()).to.equal(other.address);
    });

    it('reverts if non-owner updates signer', async () => {
      await expect(
        escrow.connect(player1).setBackendSigner(other.address)
      ).to.be.revertedWithCustomError(escrow, 'OwnableUnauthorizedAccount');
    });

    it('owner can update platform fee', async () => {
      await escrow.connect(owner).setPlatformFee(500);
      expect(await escrow.platformFeeBps()).to.equal(500);
    });

    it('reverts if platform fee exceeds 10%', async () => {
      await expect(
        escrow.connect(owner).setPlatformFee(1001)
      ).to.be.revertedWithCustomError(escrow, 'FeeTooHigh');
    });

    it('owner can withdraw platform fees', async () => {
      await createAndJoin(MATCH_ID);
      const sig = await signResult(MATCH_ID, player1.address);
      await escrow.connect(other).finalizeMatch(MATCH_ID, player1.address, sig);

      const fee = await escrow.platformFeeBalance();
      expect(fee).to.be.gt(0n);

      const balanceBefore = await ethers.provider.getBalance(other.address);
      await escrow.connect(owner).withdrawPlatformFees(other.address);
      const balanceAfter = await ethers.provider.getBalance(other.address);

      expect(balanceAfter - balanceBefore).to.equal(fee);
      expect(await escrow.platformFeeBalance()).to.equal(0n);
    });

    it('owner can pause and unpause', async () => {
      await escrow.connect(owner).pause();
      await expect(
        escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE })
      ).to.be.reverted;

      await escrow.connect(owner).unpause();
      await expect(
        escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE })
      ).to.not.be.reverted;
    });
  });

  // ============================================================
  // View functions
  // ============================================================
  describe('View functions', () => {
    it('isPlayerInMatch returns correct values', async () => {
      await createAndJoin(MATCH_ID);
      expect(await escrow.isPlayerInMatch(MATCH_ID, player1.address)).to.be.true;
      expect(await escrow.isPlayerInMatch(MATCH_ID, player2.address)).to.be.true;
      expect(await escrow.isPlayerInMatch(MATCH_ID, other.address)).to.be.false;
    });

    it('getMatchPot returns correct pot', async () => {
      await escrow.connect(player1).createMatch(MATCH_ID, { value: STAKE });
      expect(await escrow.getMatchPot(MATCH_ID)).to.equal(STAKE);

      await escrow.connect(player2).joinMatch(MATCH_ID, { value: STAKE });
      expect(await escrow.getMatchPot(MATCH_ID)).to.equal(STAKE * 2n);
    });
  });

  // ============================================================
  // receive() reverts
  // ============================================================
  describe('Direct ETH transfer', () => {
    it('reverts on direct ETH send', async () => {
      await expect(
        player1.sendTransaction({
          to: await escrow.getAddress(),
          value: STAKE,
        })
      ).to.be.reverted;
    });
  });
});
