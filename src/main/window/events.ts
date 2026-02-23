/**
 * Window Event Handlers
 * Manages window-specific events (focus, blur, title updates)
 */

import { BrowserWindow, Notification } from 'electron';
import { getConfig } from '../ipc/config';
import { updateConfig } from '../utils/config';

export function registerWindowEvents(win: BrowserWindow): void {
    // Show first-time notification
    const config = getConfig();
    if (config && !config.informed) {
        win.once('ready-to-show', () => {
            new Notification({
                title: 'GeForce Eternity',
                body: 'Press Ctrl + I to open the sidebar!',
                silent: false
            }).show();
        });
        updateConfig('informed', true);
    }

    let isSpoofing = false;
    let lastSeconds: number | null = null; // Track the last seen countdown value

    // Auto-mute on blur/focus
    win.on("blur", () => {
        const config = getConfig();
        if (config?.automute) {
            win.webContents.setAudioMuted(true);
            console.log('[Window] Audio muted (blur)');
        }
    });

    win.on("focus", () => {
        const config = getConfig();
        if (config?.automute) {
            win.webContents.setAudioMuted(false);
            console.log('[Window] Audio unmuted (focus)');
        }
    });

    // Dynamic title updates
    win.on("page-title-updated", (event, title) => {
        event.preventDefault();

        const config = getConfig();

        // Detect whole numbers in any script using your localized pattern
        const countdownPattern = /(?<!\p{Nd})\p{Nd}+(?!\p{Nd})/gu;
        const matches = title.match(countdownPattern);
        const seconds = (matches && matches.length > 0) ? parseInt(matches[matches.length - 1]) : null;

        // 1. Determine if we are in the "Danger Zone"
        // We are "AFK" as long as a countdown <= 60s is present.
        const isInDangerZone = !!(config?.idleguard && seconds !== null && seconds <= 60);

        // 2. Sync visibility spoofing state with renderer
        // This stays ON as long as the countdown is visible, not just when it changes.
        if (isInDangerZone !== isSpoofing) {
            isSpoofing = isInDangerZone;
            win.webContents.send('bettergn:spoof-visibility', isSpoofing);
        }

        // 3. Trigger Rescue Pulse ONLY when the number actually changes (ticks down)
        const isNewTick = isInDangerZone && seconds !== lastSeconds;

        // Update tracking
        lastSeconds = seconds;

        if (isNewTick && seconds !== null) {
            console.log(`[Idle Guard] EMERGENCY: Pulse initiated (${seconds}s remaining).`);

            // Small delay to ensure spoofing is active in renderer before pulsing
            setTimeout(() => {
                if (win.isDestroyed() || !isSpoofing) return;

                // Aggressive Multi-Key Pulse (F13 + F14)
                win.webContents.executeJavaScript(`
                    (function() {
                        const target = document.querySelector('video') || document.querySelector('canvas') || document.body;
                        target.focus();
                        const keys = [
                            { key: 'F13', code: 'F13', keyCode: 124 },
                            { key: 'F14', code: 'F14', keyCode: 125 }
                        ];
                        keys.forEach((k, i) => {
                            setTimeout(() => {
                                target.dispatchEvent(new KeyboardEvent('keydown', { ...k, bubbles: true }));
                                setTimeout(() => target.dispatchEvent(new KeyboardEvent('keyup', { ...k, bubbles: true })), 150);
                            }, i * 200);
                        });
                    })();
                `).catch(() => { });

                // Native backup pulses
                const sendNative = (key: any) => {
                    win.webContents.sendInputEvent({ type: 'keyDown', keyCode: key });
                    setTimeout(() => {
                        if (!win.isDestroyed()) win.webContents.sendInputEvent({ type: 'keyUp', keyCode: key });
                    }, 150);
                };

                sendNative('F13');
                setTimeout(() => sendNative('F14'), 200);
            }, 100);
        }

        // Clean up title display
        let gameName = title
            .replace(/^GeForce NOW - /, "")
            .replace(/ on GeForce NOW$/, "");

        const newTitle = (title === "GeForce Eternity | GeForce NOW" || title === "GeForce NOW")
            ? "GeForce Eternity"
            : `GeForce Eternity${gameName ? " | " + gameName : ""}`;

        win.setTitle(newTitle);
    });
}
