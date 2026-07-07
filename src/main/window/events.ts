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

                win.webContents.executeJavaScript(`
                    (function() {
                        const target = document.querySelector('video') || 
                                    document.querySelector('canvas') || 
                                    document.body;

                        target.focus();

                        const rect = target.getBoundingClientRect();
                        const x = rect.left + rect.width / 2;
                        const y = rect.top + rect.height / 2;

                        target.dispatchEvent(new MouseEvent('mousemove', {
                            bubbles: true,
                            clientX: x,
                            clientY: y
                        }));

                        setTimeout(() => {
                            target.dispatchEvent(new MouseEvent('mousemove', {
                                bubbles: true,
                                clientX: x + 5,
                                clientY: y + 5
                            }));
                        }, 100);
                    })();
                `).catch(() => {});

                // Native Electron mouse event
                const bounds = win.getBounds();

                win.webContents.sendInputEvent({
                    type: 'mouseMove',
                    x: Math.floor(bounds.width / 2),
                    y: Math.floor(bounds.height / 2)
                });

                setTimeout(() => {
                    if (!win.isDestroyed()) {
                        win.webContents.sendInputEvent({
                            type: 'mouseMove',
                            x: Math.floor(bounds.width / 2) + 5,
                            y: Math.floor(bounds.height / 2) + 5
                        });
                    }
                }, 100);

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
