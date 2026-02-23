/**
 * Discord RPC Integration
 * Displays currently playing game in Discord status
 */

import * as DiscordRPC from 'discord-rpc';
import { getConfig } from '../ipc/config';

const CLIENT_ID = '1460053673546748125'; // Replace with your Discord app ID

let rpc: any = null;
let connected = false;

/**
 * Initialize Discord RPC connection
 */
export async function initializeRPC(): Promise<void> {
  try {
    console.log('GFN_Eternity: Initializing Discord RPC with CLIENT_ID:', CLIENT_ID);
    rpc = new DiscordRPC.Client({ transport: 'ipc' });

    rpc.on('ready', () => {
      console.log('GFN_Eternity: Discord RPC connected successfully');
      console.log('Discord activity will now show your game status');
      connected = true;
    });

    rpc.on('error', (err: any) => {
      console.error('GFN_Eternity: Discord RPC error:', err.message);
      connected = false;
    });

    rpc.on('disconnected', () => {
      console.warn('GFN_Eternity: Discord RPC disconnected');
      connected = false;
    });

    console.log('GFN_Eternity: Attempting to login to Discord...');
    await rpc.login({ clientId: CLIENT_ID }).catch((err: any) => {
      console.error('GFN_Eternity: Failed to connect to Discord');
      console.error('Make sure Discord is running: https://discord.com/download');
      console.error('Error:', err.message);
      connected = false;
    });
  } catch (err: any) {
    console.error('GFN_Eternity: Failed to initialize Discord RPC:', err.message);
    connected = false;
  }
}

/**
 * Update Discord presence with current game title
 * @param {string|null} gameTitle - The game title to display, or null for idle
 */
export async function updateActivity(gameTitle: string | null = null): Promise<any> {
  try {
    const config = getConfig();

    // Don't update if Discord RPC is disabled or not connected
    if (!config) {
      console.log('GFN_Eternity: No config available');
      return;
    }

    if (!config.discordRpc) {
      return;
    }

    if (!connected) {
      return;
    }

    if (!rpc) {
      console.log('GFN_Eternity: Discord RPC client not initialized');
      return;
    }

    const startTime = Math.floor(Date.now() / 1000);
    const activity = !gameTitle
      ? {
        details: 'Browsing the library',
        state: 'Browsing games',
        largeImageKey: 'gfn',
        largeImageText: 'GeForce Eternity',
        startTimestamp: startTime,
        instance: true,
      }
      : {
        details: `Playing: ${gameTitle}`,
        state: 'Gaming',
        largeImageKey: 'gfn',
        largeImageText: 'GeForce Now',
        startTimestamp: startTime,
        instance: true,
      };

    console.log('GFN_Eternity: Updating Discord activity:', activity);
    const result = await rpc.setActivity(activity);
    console.log('GFN_Eternity: Discord activity updated successfully');
    return result;
  } catch (err: any) {
    console.error('GFN_Eternity: Failed to update Discord activity:', err.message);
  }
}

/**
 * Disconnect Discord RPC
 */
export async function disconnectRPC(): Promise<void> {
  try {
    if (rpc && connected) {
      await rpc.destroy();
      rpc = null;
      connected = false;
      console.log('GFN_Eternity: Discord RPC disconnected');
    }
  } catch (err) {
    console.error('GFN_Eternity: Failed to disconnect Discord RPC:', err);
  }
}

/**
 * Check if Discord RPC is currently connected
 */
export function isConnected(): boolean {
  return connected;
}

