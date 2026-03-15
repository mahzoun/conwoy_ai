// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title GameEscrow
 * @notice Escrow contract for 2-player competitive Conway's Game of Life matches.
 *         Players deposit equal entry fees, and the winner receives the full pot.
 *         The backend server signs the result, which is then verified on-chain.
 */
contract GameEscrow is ReentrancyGuard, Ownable, Pausable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============================================================
    // CONSTANTS
    // ============================================================

    /// @notice Maximum time before a match can be refunded if player2 never joined
    uint256 public constant REFUND_TIMEOUT = 24 hours;

    // ============================================================
    // STATE
    // ============================================================

    /// @notice The authorized backend signer address
    address public backendSigner;

    /// @notice Platform fee in basis points (e.g., 250 = 2.5%)
    uint256 public platformFeeBps;

    /// @notice Accumulated platform fees
    uint256 public platformFeeBalance;

    struct MatchData {
        address player1;
        address player2;
        uint256 stake;          // ETH per player (total pot = stake * 2)
        bool finalized;
        bool refunded;
        uint256 createdAt;
    }

    mapping(uint256 => MatchData) public matches;

    // ============================================================
    // EVENTS
    // ============================================================

    event MatchCreated(
        uint256 indexed matchId,
        address indexed player1,
        uint256 stake
    );

    event MatchJoined(
        uint256 indexed matchId,
        address indexed player2
    );

    event MatchFinalized(
        uint256 indexed matchId,
        address indexed winner,
        uint256 payout
    );

    event MatchDraw(
        uint256 indexed matchId,
        uint256 payoutPerPlayer
    );

    event MatchRefunded(
        uint256 indexed matchId,
        address indexed player1,
        uint256 refundAmount
    );

    event BackendSignerUpdated(address indexed newSigner);
    event PlatformFeeUpdated(uint256 newFeeBps);
    event PlatformFeeWithdrawn(address indexed recipient, uint256 amount);

    // ============================================================
    // ERRORS
    // ============================================================

    error MatchAlreadyExists();
    error MatchNotFound();
    error MatchAlreadyFull();
    error MatchNotFull();
    error MatchAlreadyFinalized();
    error MatchNotFinalized();
    error IncorrectStake();
    error CannotJoinOwnMatch();
    error NotMatchPlayer();
    error RefundTimeoutNotReached();
    error InvalidSignature();
    error ZeroAddress();
    error FeeTooHigh();
    error TransferFailed();

    // ============================================================
    // CONSTRUCTOR
    // ============================================================

    constructor(
        address _backendSigner,
        uint256 _platformFeeBps
    ) Ownable(msg.sender) {
        if (_backendSigner == address(0)) revert ZeroAddress();
        if (_platformFeeBps > 1000) revert FeeTooHigh(); // max 10%

        backendSigner = _backendSigner;
        platformFeeBps = _platformFeeBps;
    }

    // ============================================================
    // PLAYER FUNCTIONS
    // ============================================================

    /**
     * @notice Player 1 creates a match and deposits the entry fee.
     * @param matchId Unique match identifier (from the backend)
     */
    function createMatch(uint256 matchId) external payable whenNotPaused nonReentrant {
        if (matches[matchId].player1 != address(0)) revert MatchAlreadyExists();

        matches[matchId] = MatchData({
            player1: msg.sender,
            player2: address(0),
            stake: msg.value,
            finalized: false,
            refunded: false,
            createdAt: block.timestamp
        });

        emit MatchCreated(matchId, msg.sender, msg.value);
    }

    /**
     * @notice Player 2 joins a match and deposits the same entry fee.
     * @param matchId The match to join
     */
    function joinMatch(uint256 matchId) external payable whenNotPaused nonReentrant {
        MatchData storage m = matches[matchId];

        if (m.player1 == address(0)) revert MatchNotFound();
        if (m.player2 != address(0)) revert MatchAlreadyFull();
        if (msg.sender == m.player1) revert CannotJoinOwnMatch();
        if (msg.value != m.stake) revert IncorrectStake();

        m.player2 = msg.sender;

        emit MatchJoined(matchId, msg.sender);
    }

    /**
     * @notice Finalize a match with a winner. Backend must sign the result.
     * @param matchId The match to finalize
     * @param winner The winning player's address (player1 or player2)
     * @param signature Backend signature over (matchId, winner)
     */
    function finalizeMatch(
        uint256 matchId,
        address winner,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        MatchData storage m = matches[matchId];

        if (m.player1 == address(0)) revert MatchNotFound();
        if (m.player2 == address(0)) revert MatchNotFull();
        if (m.finalized || m.refunded) revert MatchAlreadyFinalized();
        if (winner != m.player1 && winner != m.player2) revert NotMatchPlayer();

        // Verify backend signature
        bytes32 messageHash = keccak256(abi.encodePacked(matchId, winner));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();

        address recovered = ethSignedHash.recover(signature);
        if (recovered != backendSigner) revert InvalidSignature();

        m.finalized = true;

        // Calculate payout
        uint256 totalPot = m.stake * 2;
        uint256 fee = (totalPot * platformFeeBps) / 10000;
        uint256 payout = totalPot - fee;

        platformFeeBalance += fee;

        // Transfer to winner
        (bool success, ) = payable(winner).call{value: payout}("");
        if (!success) revert TransferFailed();

        emit MatchFinalized(matchId, winner, payout);
    }

    /**
     * @notice Finalize a draw: both players get their stake back (minus fee).
     * @param matchId The match to finalize as a draw
     * @param signature Backend signature over (matchId, address(0)) indicating draw
     */
    function finalizeDrawMatch(
        uint256 matchId,
        bytes calldata signature
    ) external whenNotPaused nonReentrant {
        MatchData storage m = matches[matchId];

        if (m.player1 == address(0)) revert MatchNotFound();
        if (m.player2 == address(0)) revert MatchNotFull();
        if (m.finalized || m.refunded) revert MatchAlreadyFinalized();

        // Verify backend signature (draw = winner is zero address)
        bytes32 messageHash = keccak256(abi.encodePacked(matchId, address(0)));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();

        address recovered = ethSignedHash.recover(signature);
        if (recovered != backendSigner) revert InvalidSignature();

        m.finalized = true;

        // Each player gets their stake back (minus proportional fee)
        uint256 totalPot = m.stake * 2;
        uint256 fee = (totalPot * platformFeeBps) / 10000;
        uint256 payoutPerPlayer = (totalPot - fee) / 2;

        platformFeeBalance += fee;

        (bool success1, ) = payable(m.player1).call{value: payoutPerPlayer}("");
        if (!success1) revert TransferFailed();

        (bool success2, ) = payable(m.player2).call{value: payoutPerPlayer}("");
        if (!success2) revert TransferFailed();

        emit MatchDraw(matchId, payoutPerPlayer);
    }

    /**
     * @notice Player 1 can refund if player 2 never joined within the timeout.
     * @param matchId The match to refund
     */
    function refundExpiredMatch(uint256 matchId) external nonReentrant {
        MatchData storage m = matches[matchId];

        if (m.player1 == address(0)) revert MatchNotFound();
        if (msg.sender != m.player1) revert NotMatchPlayer();
        if (m.player2 != address(0)) revert MatchAlreadyFull();
        if (m.refunded || m.finalized) revert MatchAlreadyFinalized();
        if (block.timestamp < m.createdAt + REFUND_TIMEOUT) revert RefundTimeoutNotReached();

        m.refunded = true;

        uint256 refundAmount = m.stake;
        (bool success, ) = payable(m.player1).call{value: refundAmount}("");
        if (!success) revert TransferFailed();

        emit MatchRefunded(matchId, m.player1, refundAmount);
    }

    // ============================================================
    // VIEW FUNCTIONS
    // ============================================================

    /**
     * @notice Get match data by ID.
     */
    function getMatch(uint256 matchId) external view returns (
        address player1,
        address player2,
        uint256 stake,
        bool finalized,
        uint256 createdAt
    ) {
        MatchData storage m = matches[matchId];
        return (m.player1, m.player2, m.stake, m.finalized, m.createdAt);
    }

    /**
     * @notice Check if a player is in a specific match.
     */
    function isPlayerInMatch(uint256 matchId, address player) external view returns (bool) {
        MatchData storage m = matches[matchId];
        return m.player1 == player || m.player2 == player;
    }

    /**
     * @notice Get the total pot for a match.
     */
    function getMatchPot(uint256 matchId) external view returns (uint256) {
        MatchData storage m = matches[matchId];
        if (m.player2 == address(0)) return m.stake;
        return m.stake * 2;
    }

    // ============================================================
    // OWNER FUNCTIONS
    // ============================================================

    /**
     * @notice Update the backend signer address.
     */
    function setBackendSigner(address newSigner) external onlyOwner {
        if (newSigner == address(0)) revert ZeroAddress();
        backendSigner = newSigner;
        emit BackendSignerUpdated(newSigner);
    }

    /**
     * @notice Update the platform fee.
     */
    function setPlatformFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > 1000) revert FeeTooHigh();
        platformFeeBps = newFeeBps;
        emit PlatformFeeUpdated(newFeeBps);
    }

    /**
     * @notice Withdraw accumulated platform fees.
     */
    function withdrawPlatformFees(address recipient) external onlyOwner nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();
        uint256 amount = platformFeeBalance;
        platformFeeBalance = 0;

        (bool success, ) = payable(recipient).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit PlatformFeeWithdrawn(recipient, amount);
    }

    /**
     * @notice Pause all match operations.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause match operations.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============================================================
    // RECEIVE
    // ============================================================

    receive() external payable {
        revert("Use createMatch or joinMatch");
    }
}
