/**
 * Window Management Module
 * Handles window creation and configuration
 */

import { BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { getConfig } from '../ipc/config';

export function createMainWindow(): BrowserWindow {
    const win = new BrowserWindow({
        width: 1400,
        height: 1000,
        title: "GeForce Eternity",
        webPreferences: {
            preload: path.join(__dirname, '../../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            backgroundThrottling: false,
        },
        autoHideMenuBar: true,
    });

    win.removeMenu();

    // Apply user agent from config
    const config = getConfig();
    if (config?.userAgent) {
        win.webContents.setUserAgent(config.userAgent);
    }

    // Load GeForce NOW
    win.loadURL('https://play.geforcenow.com/mall/');

    // Dev tools
    if (process.env.ELECTRON_DEV) {
        win.webContents.openDevTools({ mode: 'detach' });
    }

    // Handle external links
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url === "about:blank") {
            return {
                action: "allow",
                overrideBrowserWindowOptions: {
                    width: 800,
                    height: 600,
                    autoHideMenuBar: true,
                    icon: path.join(__dirname, "../../assets/resources/gfn_eternity.png"),
                    title: "Account Connection",
                    webPreferences: {
                        nodeIntegration: false,
                        contextIsolation: true,
                        sandbox: true,
                        session: win.webContents.session,
                    },
                },
            };
        }
        shell.openExternal(url);
        return { action: "deny" };
    });

    return win;
}
