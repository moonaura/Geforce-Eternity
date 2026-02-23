/**
 * Session Interceptors
 * Handles request/response modifications for GeForce NOW
 */

import { session, BrowserWindow } from 'electron';
import { getConfig } from '../ipc/config';

export function setupSessionInterceptors(mainWindow: BrowserWindow | null): void {
    // Modify headers for Nvidia Grid API
    session.defaultSession.webRequest.onBeforeSendHeaders(
        { urls: ["*://*.nvidiagrid.net/v2/*"] },
        (details, callback) => {
            const headers = details.requestHeaders;
            headers["nv-device-os"] = "WINDOWS";
            headers["sec-ch-ua-platform"] = '"WINDOWS"';
            headers["sec-ch-ua-platform-version"] = "14.0.0";
            callback({ requestHeaders: headers });
        }
    );

    // Auto-focus on game launch
    session.defaultSession.webRequest.onBeforeRequest(
        { urls: ["wss://*/*"] },
        (details, callback) => {
            const config = getConfig();
            const url = details.url;
            const isNvidiaRequest =
                url.includes("nvidiagrid.net") &&
                url.includes("/sign_in") &&
                url.includes("peer_id");

            if (isNvidiaRequest && config?.autofocus && mainWindow) {
                console.log('[Session] Detected game launch, focusing window');
                mainWindow.maximize();
                mainWindow.focus();
                mainWindow.setAlwaysOnTop(true);
                setTimeout(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.setAlwaysOnTop(false);
                    }
                }, 500);
            }
            callback({ cancel: false });
        }
    );
}
