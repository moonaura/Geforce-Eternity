/**
 * Keyboard Shortcuts
 * Manages global keyboard shortcuts
 */

import { globalShortcut, BrowserWindow } from 'electron';

export function registerGlobalShortcuts(getMainWindow: () => BrowserWindow | null): void {
  const shortcutKey = 'CommandOrControl+I';

  /*
  try {
    globalShortcut.register(shortcutKey, () => {
      const mainWindow = getMainWindow();
      if (!mainWindow || mainWindow.isDestroyed()) return;

      mainWindow.webContents.executeJavaScript(`
        (function() {
          if (!window.__bettergnSidebarState) {
            window.__bettergnSidebarState = { isOpen: false };
          }
          const sidebar = document.getElementById('bettergn-sidebar');
          if (sidebar) {
            window.__bettergnSidebarState.isOpen = !window.__bettergnSidebarState.isOpen;
            sidebar.classList.toggle('open');
          }
        })();
      `).catch(err => console.error('[Shortcuts] Failed to toggle sidebar:', err));
    });

    console.log(`[Shortcuts] Registered: ${shortcutKey}`);
  } catch (err: any) {
    console.warn(`[Shortcuts] Failed to register: ${err.message}`);
  }
  */
}

export function unregisterAllShortcuts(): void {
  globalShortcut.unregisterAll();
}
