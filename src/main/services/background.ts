/**
 * Background Services
 * Handles periodic tasks (Discord RPC, Idle Guard)
 */

import { BrowserWindow } from 'electron';
import { updateActivity } from './discord-rpc';

export function startBackgroundServices(mainWindow: BrowserWindow | null): void {
    // Discord RPC Activity Updater
    setInterval(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;

        const title = mainWindow.getTitle();
        const gameTitle = title.startsWith("GeForce Eternity | ")
            ? title.replace("GeForce Eternity | ", "")
            : "";

        updateActivity(gameTitle || null).catch(console.error);
    }, 15_000);
}
