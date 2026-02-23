/**
 * Config IPC Handler
 * Handles configuration operations (get, set, update)
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { loadConfig, updateConfig, AppConfig, saveConfig, DEFAULT_CONFIG } from '../utils/config';

let config: AppConfig | null = null;

export function initConfig(): void {
  // Load config at startup
  config = loadConfig();
}

export function registerConfigHandlers(): void {
  // IPC handler to update automute config
  ipcMain.handle('bettergn:set-automute', (event: IpcMainInvokeEvent, enabled: boolean) => {
    config = updateConfig('automute', enabled);
    console.log('Auto-mute toggled:', enabled);
    return { success: true, config };
  });

  // IPC handler to update autofocus config
  ipcMain.handle('bettergn:set-autofocus', (event: IpcMainInvokeEvent, enabled: boolean) => {
    config = updateConfig('autofocus', enabled);
    console.log('Auto-focus toggled:', enabled);
    return { success: true, config };
  });

  // IPC handler to update idleguard config
  ipcMain.handle('bettergn:set-idleguard', (event: IpcMainInvokeEvent, enabled: boolean) => {
    config = updateConfig('idleguard', enabled);
    console.log('Idle Guard toggled:', enabled);
    return { success: true, config };
  });

  // IPC handler to update user agent config
  ipcMain.handle('bettergn:set-useragent', (event: IpcMainInvokeEvent, userAgent: string) => {
    config = updateConfig('userAgent', userAgent);
    console.log('User Agent changed:', userAgent || 'Better GN (default)');
    return { success: true, config };
  });

  // IPC handler to update Discord RPC config
  ipcMain.handle('bettergn:set-discordrpc', (event: IpcMainInvokeEvent, enabled: boolean) => {
    config = updateConfig('discordRpc', enabled);
    console.log('Discord RPC toggled:', enabled);
    return { success: true, config };
  });

  // IPC handler to update language config
  ipcMain.handle('bettergn:set-language', (event: IpcMainInvokeEvent, language: string) => {
    config = updateConfig('language', language);
    console.log('Language changed:', language || 'Default');
    return { success: true, config };
  });

  // IPC handler to reset config to defaults
  ipcMain.handle('bettergn:reset-config', (event: IpcMainInvokeEvent) => {
    config = { ...DEFAULT_CONFIG };
    saveConfig(config);
    console.log('betterGN: Config reset to defaults');
    return { success: true, config };
  });

  // IPC handler to get current config
  ipcMain.handle('bettergn:get-config', (event: IpcMainInvokeEvent) => {
    return { config };
  });

  // Sync version for preload immediate use
  ipcMain.on('bettergn:get-config-sync', (event) => {
    event.returnValue = { config };
  });

  console.log('betterGN: Config IPC handlers registered');
}

export function getConfig(): AppConfig | null {
  return config;
}
