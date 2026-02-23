/**
 * GeForce Eternity - Main Process Entry Point
 * A clean, modular Electron wrapper for GeForce NOW
 */

import { app, BrowserWindow } from 'electron';
import { loadIpcHandlers } from './ipc/index';
import { initializeRPC, disconnectRPC } from './services/discord-rpc';
import { createMainWindow } from './window/index';
import { registerWindowEvents } from './window/events';
import { setupSessionInterceptors } from './window/session';
import { registerGlobalShortcuts, unregisterAllShortcuts } from './window/shortcuts';
import { startBackgroundServices } from './services/background';
import { loadConfig } from './utils/config';

// -----------------------------------------------------------------------------
// Global State
// -----------------------------------------------------------------------------
let mainWindow: BrowserWindow | null = null;

// -----------------------------------------------------------------------------
// App Configuration
// -----------------------------------------------------------------------------
function setupAppFlags(): void {
  app.setName("GeForce Eternity");

  // Load config to apply startup flags
  const config = loadConfig();

  // Apply Language flag
  if (config.language) {
    app.commandLine.appendSwitch('lang', config.language);
  }

  app.commandLine.appendSwitch("enable-gpu-rasterization");

  // Linux-specific hardware acceleration
  if (process.platform === 'linux') {
    const linuxFlags = [
      "ignore-gpu-blocklist",
      "enable-zero-copy",
      "enable-native-gpu-memory-buffers",
      "enable-gpu-memory-buffer-video-frames"
    ];
    linuxFlags.forEach(flag => app.commandLine.appendSwitch(flag));

    app.commandLine.appendSwitch("enable-features", [
      "WaylandWindowDecorations",
      "AcceleratedVideoDecodeLinuxGL",
      "VaapiVideoDecoder",
      "AcceleratedVideoDecodeLinuxZeroCopyGL",
      "VaapiIgnoreDriverChecks",
    ].join(","));

    app.commandLine.appendSwitch("disable-features", "UseChromeOSDirectVideoDecoder");
  }
}

// -----------------------------------------------------------------------------
// App Lifecycle
// -----------------------------------------------------------------------------
async function onAppReady(): Promise<void> {
  console.log('[App] Initializing GeForce Eternity...');

  // 1. Load IPC Handlers
  loadIpcHandlers(mainWindow);

  // 2. Initialize Discord RPC
  await initializeRPC();

  // 3. Create Main Window
  mainWindow = createMainWindow();
  registerWindowEvents(mainWindow);

  // 4. Setup Session Interceptors
  setupSessionInterceptors(mainWindow);

  // 5. Register Global Shortcuts
  registerGlobalShortcuts(() => mainWindow);

  // 6. Start Background Services
  startBackgroundServices(mainWindow);

  console.log('[App] Ready');
}

function onSecondInstance(): void {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
}

function onWindowAllClosed(): void {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}

function onActivate(): void {
  if (BrowserWindow.getAllWindows().length === 0 && !mainWindow) {
    mainWindow = createMainWindow();
    registerWindowEvents(mainWindow);
  }
}

function onWillQuit(): void {
  unregisterAllShortcuts();
  disconnectRPC();
}

// -----------------------------------------------------------------------------
// Application Entry Point
// -----------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  // Pre-ready setup
  setupAppFlags();

  // Event handlers
  app.on('second-instance', onSecondInstance);
  app.on('window-all-closed', onWindowAllClosed);
  app.on('activate', onActivate);
  app.on('will-quit', onWillQuit);

  // Initialize app
  app.whenReady().then(onAppReady);
}

