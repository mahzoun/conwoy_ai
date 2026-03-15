import { WebSocket } from 'ws';
import {
  ClientMessage,
  ServerMessage,
  MatchUpdatedMessage,
  ErrorMessage,
  ERROR_CODES,
  AgentId,
  PatternId,
} from '@conwoy/shared';
import { WsClientInfo, WsMatchRoom } from '../types';
import {
  getMatch,
  joinMatch,
  selectAgent,
  selectPattern,
  placePattern,
  confirmReady,
  createMatch,
} from '../services/matchService';
import {
  startSimulation,
  isSimulationActive,
} from '../services/simulationService';

type BroadcastFn = (matchId: string, message: ServerMessage, excludeConnectionId?: string) => void;

function sendToClient(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, code: string, message: string): void {
  const errorMsg: ErrorMessage = { type: 'ERROR', code, message };
  sendToClient(ws, errorMsg);
}

export async function handlePlayerJoin(
  client: WsClientInfo,
  rooms: Map<string, WsMatchRoom>,
  message: Extract<ClientMessage, { type: 'PLAYER_JOIN' }>,
  broadcast: BroadcastFn
): Promise<void> {
  const { matchId, walletAddress } = message;

  try {
    let match = await getMatch(matchId);

    if (!match) {
      sendError(client.ws, ERROR_CODES.MATCH_NOT_FOUND, 'Match not found');
      return;
    }

    // Join the WS room
    let room = rooms.get(matchId);
    if (!room) {
      room = { matchId, clients: new Map() };
      rooms.set(matchId, room);
    }
    room.clients.set(client.connectionId, client);
    client.matchId = matchId;
    client.walletAddress = walletAddress.toLowerCase();

    // Determine slot
    if (match.player1?.walletAddress === walletAddress.toLowerCase()) {
      client.slot = 1;
    } else if (match.player2?.walletAddress === walletAddress.toLowerCase()) {
      client.slot = 2;
    } else if (match.phase === 'waiting' && !match.player2) {
      // Auto-join as player 2 via WebSocket
      const result = await joinMatch(matchId, walletAddress);
      match = result.match;
      client.slot = 2;
    } else {
      // Spectator
      client.isSpectator = true;
    }

    const matchUpdated: MatchUpdatedMessage = { type: 'MATCH_UPDATED', match };
    broadcast(matchId, matchUpdated);
  } catch (err: unknown) {
    const message_str = err instanceof Error ? err.message : 'Unknown error';
    sendError(client.ws, message_str, `Failed to join match: ${message_str}`);
  }
}

export async function handleSelectAgent(
  client: WsClientInfo,
  message: Extract<ClientMessage, { type: 'SELECT_AGENT' }>,
  broadcast: BroadcastFn
): Promise<void> {
  const { matchId, walletAddress, agentId } = message;

  try {
    const match = await selectAgent(matchId, walletAddress, agentId as AgentId);
    const matchUpdated: MatchUpdatedMessage = { type: 'MATCH_UPDATED', match };
    broadcast(matchId, matchUpdated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    sendError(client.ws, msg, `Failed to select agent: ${msg}`);
  }
}

export async function handleSelectPattern(
  client: WsClientInfo,
  message: Extract<ClientMessage, { type: 'SELECT_PATTERN' }>,
  broadcast: BroadcastFn
): Promise<void> {
  const { matchId, walletAddress, patternId, rotation, mirror } = message;

  try {
    const match = await selectPattern(
      matchId,
      walletAddress,
      patternId as PatternId,
      rotation,
      mirror
    );
    const matchUpdated: MatchUpdatedMessage = { type: 'MATCH_UPDATED', match };
    broadcast(matchId, matchUpdated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    sendError(client.ws, msg, `Failed to select pattern: ${msg}`);
  }
}

export async function handlePlacePattern(
  client: WsClientInfo,
  message: Extract<ClientMessage, { type: 'PLACE_PATTERN' }>,
  broadcast: BroadcastFn
): Promise<void> {
  const { matchId, walletAddress, row, col } = message;

  try {
    const match = await placePattern(matchId, walletAddress, row, col);
    const matchUpdated: MatchUpdatedMessage = { type: 'MATCH_UPDATED', match };
    broadcast(matchId, matchUpdated);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    sendError(client.ws, msg, `Failed to place pattern: ${msg}`);
  }
}

export async function handleConfirmReady(
  client: WsClientInfo,
  message: Extract<ClientMessage, { type: 'CONFIRM_READY' }>,
  broadcast: BroadcastFn,
  rooms: Map<string, WsMatchRoom>
): Promise<void> {
  const { matchId, walletAddress } = message;

  try {
    const { match, bothReady } = await confirmReady(matchId, walletAddress);

    const matchUpdated: MatchUpdatedMessage = { type: 'MATCH_UPDATED', match };
    broadcast(matchId, matchUpdated);

    // If both players are ready, start the simulation
    if (bothReady && !isSimulationActive(matchId)) {
      const initialBoard = match.boardState;
      if (!initialBoard) {
        sendError(client.ws, ERROR_CODES.INTERNAL_ERROR, 'No board state to simulate');
        return;
      }

      await startSimulation(
        matchId,
        initialBoard,
        match.config.maxGenerations,
        // onTick
        (generation, boardState, scoreP1, scoreP2) => {
          broadcast(matchId, {
            type: 'SIMULATION_TICK',
            generation,
            boardState,
            scoreP1,
            scoreP2,
          });
        },
        // onFinish
        (winner, finalScoreP1, finalScoreP2, cumulativeScoreP1, cumulativeScoreP2, resultSignature) => {
          broadcast(matchId, {
            type: 'MATCH_FINISHED',
            winner,
            finalScoreP1,
            finalScoreP2,
            cumulativeScoreP1,
            cumulativeScoreP2,
            resultSignature,
            matchId,
          });
        }
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    sendError(client.ws, msg, `Failed to confirm ready: ${msg}`);
  }
}

export async function handleRequestRematch(
  client: WsClientInfo,
  message: Extract<ClientMessage, { type: 'REQUEST_REMATCH' }>,
  broadcast: BroadcastFn,
  rematchRequests: Map<string, Set<string>>
): Promise<void> {
  const { matchId, walletAddress } = message;

  try {
    const originalMatch = await getMatch(matchId);
    if (!originalMatch) {
      sendError(client.ws, ERROR_CODES.MATCH_NOT_FOUND, 'Match not found');
      return;
    }

    if (originalMatch.phase !== 'finished') {
      sendError(client.ws, ERROR_CODES.MATCH_WRONG_PHASE, 'Match is not finished');
      return;
    }

    const addr = walletAddress.toLowerCase();
    let requests = rematchRequests.get(matchId);
    if (!requests) {
      requests = new Set();
      rematchRequests.set(matchId, requests);
    }
    requests.add(addr);

    // Notify others that this player wants a rematch
    broadcast(matchId, {
      type: 'REMATCH_REQUESTED',
      walletAddress: addr,
    });

    // If both players requested rematch, create a new match
    const p1 = originalMatch.player1?.walletAddress;
    const p2 = originalMatch.player2?.walletAddress;

    if (p1 && p2 && requests.has(p1) && requests.has(p2)) {
      rematchRequests.delete(matchId);

      const newMatch = await createMatch(p1, originalMatch.config);
      // Auto-join player 2
      const { match: joinedMatch } = await joinMatch(newMatch.id, p2);

      // Notify both players of new match
      broadcast(matchId, {
        type: 'REMATCH_REQUESTED',
        walletAddress: addr,
        newMatchId: joinedMatch.id,
      });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    sendError(client.ws, msg, `Failed to request rematch: ${msg}`);
  }
}

export async function handleSpectate(
  client: WsClientInfo,
  rooms: Map<string, WsMatchRoom>,
  message: Extract<ClientMessage, { type: 'SPECTATE' }>,
  broadcast: BroadcastFn
): Promise<void> {
  const { matchId } = message;

  try {
    const match = await getMatch(matchId);
    if (!match) {
      sendError(client.ws, ERROR_CODES.MATCH_NOT_FOUND, 'Match not found');
      return;
    }

    // Join room as spectator
    let room = rooms.get(matchId);
    if (!room) {
      room = { matchId, clients: new Map() };
      rooms.set(matchId, room);
    }
    room.clients.set(client.connectionId, client);
    client.matchId = matchId;
    client.isSpectator = true;

    // Send current match state to spectator
    sendToClient(client.ws, { type: 'MATCH_UPDATED', match });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    sendError(client.ws, msg, `Failed to spectate: ${msg}`);
  }
}
