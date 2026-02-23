/**
 * Sidebar IPC Handler
 * Handles sidebar HTML/CSS injection requests
 */

import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let sidebarHTML = '';
let sidebarCSS = '';

export function loadSidebarAssets(): void {
  try {
    sidebarHTML = fs.readFileSync(path.join(__dirname, '../../renderer/sidebar', 'sidebar.html'), 'utf8');
    sidebarCSS = fs.readFileSync(path.join(__dirname, '../../renderer/sidebar', 'sidebar.css'), 'utf8');
  } catch (err: any) {
    console.error('Failed to load sidebar assets:', err.message);
  }
}

export function registerSidebarHandlers(): void {
  // Load assets on first call
  loadSidebarAssets();

  // IPC handler to inject sidebar on first request from renderer
  ipcMain.handle('bettergn:inject-sidebar', (event) => {
    return { html: sidebarHTML, css: sidebarCSS };
  });

  // Register app relaunch handler
  ipcMain.handle('bettergn:relaunch-app', () => {
    console.log('betterGN: Relaunching app...');
    app.relaunch();
    app.exit(0);
    return true;
  });

  console.log('betterGN: Sidebar IPC handlers registered');
}

