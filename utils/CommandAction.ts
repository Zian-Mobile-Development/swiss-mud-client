// utils/CommandAction.ts
// Utility functions for sending commands to the MUD server.

import { WebSocketManager } from '../managers/WebSocketManager';

// Store WebSocketManager instance
let wsManager: WebSocketManager | null = null;

/**
 * Set the WebSocketManager instance to use for sending commands
 * @param manager The WebSocketManager instance
 */
export function setWebSocketManager(manager: WebSocketManager): void {
  wsManager = manager;
}

/**
 * Sends a command to the MUD server
 * @param command The command to send
 */
export function send(command: string): void {
  // Send the command if WebSocketManager is available
  if (wsManager && wsManager.isConnected()) {
    wsManager.send(command + '\n');
  } else {
    console.warn('WebSocketManager not available or not connected');
  }
}

/**
 * Plays an alert sound
 */
export function alert(): void {
  // Create audio element for alerts
  const alertSound = new Audio('/alert.mp3');
  alertSound.play().catch(error => {
    console.warn('Failed to play alert sound:', error);
  });
}

