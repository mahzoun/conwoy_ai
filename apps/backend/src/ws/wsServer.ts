import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { ClientMessage, ServerMessage } from '@conwoy/shared';
import { WsClientInfo, WsMatchRoom } from '../types';
import {
  handlePlayerJoin,
  handleSelectAgent,
  handleSelectPattern,
  handlePlacePattern,
  handleConfirmReady,
  handleRequestRematch,
  handleSpectate,
} from './wsHandlers';

// Global state
const rooms = new Map<string, WsMatchRoom>();
const clients = new Map<string, WsClientInfo>();
const rematchRequests = new Map<string, Set<string>>();

/**
 * Broadcast a message to all clients in a match room.
 */
function broadcast(
  matchId: string,
  message: ServerMessage,
  excludeConnectionId?: string
): void {
  const room = rooms.get(matchId);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const [connId, client] of room.clients) {
    if (excludeConnectionId && connId === excludeConnectionId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

function sendToClient(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function removeClientFromRooms(connectionId: string): void {
  const client = clients.get(connectionId);
  if (!client?.matchId) return;

  const room = rooms.get(client.matchId);
  if (room) {
    room.clients.delete(connectionId);
    if (room.clients.size === 0) {
      rooms.delete(client.matchId);
    }
  }
}

export function createWsServer(server: import('http').Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const connectionId = uuidv4();
    const clientInfo: WsClientInfo = {
      ws,
      connectionId,
      lastPing: Date.now(),
    };

    clients.set(connectionId, clientInfo);

    // Send connection acknowledgment
    sendToClient(ws, {
      type: 'CONNECTED',
      connectionId,
      timestamp: new Date().toISOString(),
    });

    ws.on('message', async (data: Buffer) => {
      let message: ClientMessage;

      try {
        message = JSON.parse(data.toString()) as ClientMessage;
      } catch {
        sendToClient(ws, {
          type: 'ERROR',
          code: 'INVALID_MESSAGE',
          message: 'Invalid JSON message',
        });
        return;
      }

      try {
        switch (message.type) {
          case 'PING':
            clientInfo.lastPing = Date.now();
            sendToClient(ws, { type: 'PONG', timestamp: new Date().toISOString() });
            break;

          case 'PLAYER_JOIN':
            await handlePlayerJoin(clientInfo, rooms, message, broadcast);
            break;

          case 'SELECT_AGENT':
            await handleSelectAgent(clientInfo, message, broadcast);
            break;

          case 'SELECT_PATTERN':
            await handleSelectPattern(clientInfo, message, broadcast);
            break;

          case 'PLACE_PATTERN':
            await handlePlacePattern(clientInfo, message, broadcast);
            break;

          case 'CONFIRM_READY':
            await handleConfirmReady(clientInfo, message, broadcast, rooms);
            break;

          case 'REQUEST_REMATCH':
            await handleRequestRematch(clientInfo, message, broadcast, rematchRequests);
            break;

          case 'SPECTATE':
            await handleSpectate(clientInfo, rooms, message, broadcast);
            break;

          default:
            sendToClient(ws, {
              type: 'ERROR',
              code: 'UNKNOWN_MESSAGE_TYPE',
              message: `Unknown message type`,
            });
        }
      } catch (err) {
        console.error('WS message handler error:', err);
        sendToClient(ws, {
          type: 'ERROR',
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        });
      }
    });

    ws.on('close', () => {
      removeClientFromRooms(connectionId);
      clients.delete(connectionId);
    });

    ws.on('error', (err) => {
      console.error(`WebSocket error for connection ${connectionId}:`, err);
      removeClientFromRooms(connectionId);
      clients.delete(connectionId);
    });
  });

  // Heartbeat: ping all clients every 30 seconds
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    for (const [connId, client] of clients) {
      if (client.ws.readyState !== WebSocket.OPEN) {
        removeClientFromRooms(connId);
        clients.delete(connId);
        continue;
      }

      // Terminate connections that haven't pinged in 90 seconds
      if (now - (client.lastPing ?? now) > 90000) {
        client.ws.terminate();
        removeClientFromRooms(connId);
        clients.delete(connId);
      }
    }
  }, 30000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  console.log('WebSocket server initialized at /ws');
  return wss;
}

export { rooms, clients };
