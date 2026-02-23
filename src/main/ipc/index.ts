/**
 * IPC Handlers Loader
 * Centralized loader for all IPC handlers
 */

import * as sidebarIpc from './sidebar';
import * as configIpc from './config';
import { ipcMain, shell, BrowserWindow } from 'electron';
import { AppConfig } from '../utils/config';

/**
 * Initialize and register all IPC handlers
 */
export function loadIpcHandlers(mainWindow: BrowserWindow | null = null): void {
  console.log('betterGN: Loading IPC handlers...');

  // Initialize config first
  configIpc.initConfig();

  // Register all handlers
  sidebarIpc.registerSidebarHandlers();
  configIpc.registerConfigHandlers();

  // Register external link handler
  ipcMain.handle('bettergn:open-external', async (event, url: string) => {
    try {
      // Validate URL to prevent misuse
      const urlObj = new URL(url);
      if (!urlObj.protocol.startsWith('http')) {
        console.warn('betterGN: Rejected non-http URL:', url);
        return false;
      }
      await shell.openExternal(url);
      return true;
    } catch (err) {
      console.error('betterGN: Failed to open external URL:', url, err);
      return false;
    }
  });

  console.log('betterGN: All IPC handlers loaded successfully');
}

/**
 * Get the current config
 */
export function getConfig(): AppConfig | null {
  return configIpc.getConfig();
}
