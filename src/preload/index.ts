// Preload: use contextBridge to expose a minimal API.
import { contextBridge, ipcRenderer } from 'electron';

console.log('[BetterGN] Preload script initializing...');

// -----------------------------------------------------------------------------
// 1. Immediate Enforcement (Runs before GFN scripts load)
// -----------------------------------------------------------------------------
// Synchronously get config to apply critical settings like language before GFN scripts execute.
const { config } = ipcRenderer.sendSync('bettergn:get-config-sync');

if (config) {
  console.log('[BetterGN] Early config loaded:', JSON.stringify(config));

  // A. Language Enforcement
  if (config.language) {
    const lang = config.language;
    const langCode = lang.replace('-', '_');
    console.log(`[BetterGN] Enforcement: Setting locale to ${lang} (${langCode})`);

    // Force navigator properties
    Object.defineProperty(navigator, 'language', { get: () => lang, configurable: true });
    Object.defineProperty(navigator, 'languages', { get: () => [lang, lang.split('-')[0]], configurable: true });

    // Update document if it exists (might be null at this exact moment)
    if (document.documentElement) document.documentElement.lang = lang;

    // Sync localStorage (GFN's internal cache)
    try {
      localStorage.setItem('gfn-locale', langCode);
      localStorage.setItem('gfn-lang', lang);
    } catch (e) {
      // Might fail if localStorage isn't ready yet, we will retry in initSidebar
      console.warn('[BetterGN] localStorage not ready for early language spoofing, will retry later.');
    }
  }
} else {
  console.warn('[BetterGN] Early config could not be loaded.');
}

// Expose a small API to the renderer.
contextBridge.exposeInMainWorld('betterGN', {
  version: () => '0.0.1',
  openExternal: (url: string) => {
    ipcRenderer.invoke('bettergn:open-external', url).catch(console.error);
  },
});

// -----------------------------------------------------------------------------
// 2. Sidebar Initialization
// -----------------------------------------------------------------------------
// Inject sidebar HTML and CSS from the main process when page loads
(async function initSidebar() {
  if ((globalThis as any).__bettergnSidebarInjected) return;
  (globalThis as any).__bettergnSidebarInjected = true;

  try {
    const { html, css } = await ipcRenderer.invoke('bettergn:inject-sidebar');

    if (!config) { // Should already be loaded from sync call, but double check
      console.error('[BetterGN] Error: Configuration not available for sidebar initialization.');
      return;
    }
    if (!html || !css) {
      console.warn('[BetterGN] Sidebar assets (HTML/CSS) missing. Sidebar will not be injected.');
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectSidebar);
    } else {
      injectSidebar();
    }

    function injectSidebar() {
      console.log('[BetterGN] Injecting sidebar UI...');
      const styleEl = document.createElement('style');
      styleEl.id = 'bettergn-sidebar-styles';
      styleEl.textContent = css;
      document.head.appendChild(styleEl);

      // Re-apply language to document head just in case it was missed during early load
      // or if the document.documentElement wasn't ready then.
      if (config.language && document.documentElement) {
        document.documentElement.lang = config.language;
        // Also ensure localStorage is set if it failed earlier
        try {
          localStorage.setItem('gfn-locale', config.language.replace('-', '_'));
          localStorage.setItem('gfn-lang', config.language);
        } catch (e) {
          console.error('[BetterGN] Failed to set localStorage for language during sidebar init:', e);
        }
      }

      const wrapper = document.createElement('div');
      wrapper.innerHTML = html;
      if (document.body && wrapper.firstElementChild) {
        document.body.appendChild(wrapper.firstElementChild);
      }

      const sidebar = document.getElementById('bettergn-sidebar');
      if (!sidebar) {
        console.error('[BetterGN] Sidebar element not found after injection.');
        return;
      }

      const closeBtn = sidebar.querySelector('.close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => sidebar.classList.remove('open'));
      }

      // Toggle Handlers
      const setupToggle = (id: string, key: string, ipc: string) => {
        const el = sidebar.querySelector(`#${id}`) as HTMLElement;
        if (!el) {
          console.warn(`[BetterGN] Toggle element not found: #${id}`);
          return;
        }

        if (config[key]) {
          el.classList.add('on');
          el.setAttribute('aria-pressed', 'true');
        }

        el.addEventListener('click', () => {
          el.classList.toggle('on');
          const enabled = el.classList.contains('on');
          el.setAttribute('aria-pressed', enabled ? 'true' : 'false');
          console.log(`[BetterGN] Toggle ${key}: ${enabled}`);
          ipcRenderer.invoke(ipc, enabled).catch(console.error);
        });
      };

      setupToggle('toggle-autofocus', 'autofocus', 'bettergn:set-autofocus');
      setupToggle('toggle-automute', 'automute', 'bettergn:set-automute');
      setupToggle('toggle-idleguard', 'idleguard', 'bettergn:set-idleguard');
      setupToggle('toggle-discordrpc', 'discordRpc', 'bettergn:set-discordrpc');

      // Select Handlers
      const setupSelect = (id: string, key: string, ipc: string) => {
        const select = sidebar.querySelector(`#${id}`) as HTMLSelectElement;
        if (select) {
          if (config[key]) {
            select.value = config[key];
          }
          select.addEventListener('change', () => {
            console.log(`[BetterGN] Select ${key}: ${select.value}`);
            ipcRenderer.invoke(ipc, select.value).catch(console.error);
          });
        } else {
          console.warn(`[BetterGN] Select element not found: #${id}`);
        }
      };

      setupSelect('select-useragent', 'userAgent', 'bettergn:set-useragent');
      setupSelect('select-language', 'language', 'bettergn:set-language');



      // -----------------------------------------------------------------------
      // Modal & Action Buttons
      // -----------------------------------------------------------------------
      const modal = sidebar.querySelector('#confirmation-modal');
      const modalYes = sidebar.querySelector('#modal-yes');
      const modalNo = sidebar.querySelector('#modal-no');
      const modalMsg = sidebar.querySelector('#modal-message');
      const btnReload = sidebar.querySelector('#btn-reload-gfn');
      const btnDefault = sidebar.querySelector('#btn-default-config');

      let pendingAction: 'relaunch' | 'reset' | null = null;

      const showModal = (action: 'relaunch' | 'reset') => {
        if (!modal || !modalMsg) return;
        pendingAction = action;

        if (action === 'relaunch') {
          modalMsg.textContent = 'Are you sure you want to relaunch the application?';
        } else {
          modalMsg.textContent = 'Are you sure you want to reset all settings to default?';
        }

        modal.classList.remove('hidden');
      };

      const hideModal = () => {
        if (modal) modal.classList.add('hidden');
        pendingAction = null;
      };

      if (btnReload) {
        btnReload.addEventListener('click', () => showModal('relaunch'));
      }

      if (btnDefault) {
        btnDefault.addEventListener('click', () => showModal('reset'));
      }

      if (modalNo) {
        modalNo.addEventListener('click', hideModal);
      }

      if (modalYes) {
        modalYes.addEventListener('click', () => {
          if (pendingAction === 'relaunch') {
            console.log('[BetterGN] Triggering App Relaunch...');
            ipcRenderer.invoke('bettergn:relaunch-app').catch(console.error);
          } else if (pendingAction === 'reset') {
            console.log('[BetterGN] Triggering Config Reset...');
            ipcRenderer.invoke('bettergn:reset-config').then((res) => {
              // Update UI elements to reflect defaults
              if (res && res.config) {
                const newConfig = res.config;
                // Update Toggles
                ['autofocus', 'automute', 'idleguard', 'discordRpc'].forEach(key => {
                  const el = sidebar.querySelector(`#toggle-${key.toLowerCase()}`) as HTMLElement;
                  if (el) {
                    if (newConfig[key]) {
                      el.classList.add('on');
                      el.setAttribute('aria-pressed', 'true');
                    } else {
                      el.classList.remove('on');
                      el.setAttribute('aria-pressed', 'false');
                    }
                  }
                });
                // Update Selects
                ['userAgent', 'language'].forEach(key => {
                  const el = sidebar.querySelector(`#select-${key.toLowerCase()}`) as HTMLSelectElement;
                  if (el) el.value = newConfig[key];
                });
              }
            }).catch(console.error);
          }
          hideModal();
        });
      }

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!sidebar.classList.contains('open')) return;
        const rect = sidebar.getBoundingClientRect();
        if ((e as MouseEvent).clientX > rect.right && (e as MouseEvent).clientX > 0) {
          sidebar.classList.remove('open');
        }
      });

      // local Ctrl+I Shortcut
      window.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key.toLowerCase() === 'i') {
          e.preventDefault();
          console.log('[BetterGN] Shortcut: Ctrl+I detected');
          sidebar.classList.toggle('open');
        }
      });

      console.log('[BetterGN] Sidebar fully initialized');
    }
  } catch (err) {
    console.error('[BetterGN] Sidebar init failed:', err);
  }
})();

// -----------------------------------------------------------------------------
// 3. Dynamic Visibility Spoofing
// -----------------------------------------------------------------------------
/**
 * Visibility Spoofing
 * This now acts as a reactive toggle controlled by the main process.
 */
(function setupDynamicSpoofing() {
  let active = false;

  // Listen for spoofing toggle from main process
  ipcRenderer.on('bettergn:spoof-visibility', (_event, enabled: boolean) => {
    if (active !== enabled) {
      active = enabled;
      console.log(`[BetterGN] Visibility spoofing ${active ? 'activated' : 'deactivated'}`);
    }
  });

  const isSpoofed = () => active;

  // Intercept properties
  const docProto = Document.prototype;
  const originalHidden = Object.getOwnPropertyDescriptor(docProto, 'hidden');
  const originalVisibilityState = Object.getOwnPropertyDescriptor(docProto, 'visibilityState');

  Object.defineProperty(document, 'hidden', {
    get: () => isSpoofed() ? false : (originalHidden?.get ? originalHidden.get.call(document) : false),
    configurable: true
  });

  Object.defineProperty(document, 'visibilityState', {
    get: () => isSpoofed() ? 'visible' : (originalVisibilityState?.get ? originalVisibilityState.get.call(document) : 'visible'),
    configurable: true
  });

  Object.defineProperty(document, 'webkitVisibilityState', {
    get: () => isSpoofed() ? 'visible' : (originalVisibilityState?.get ? originalVisibilityState.get.call(document) : 'visible'),
    configurable: true
  });

  const originalHasFocus = document.hasFocus;
  document.hasFocus = function () {
    return isSpoofed() ? true : originalHasFocus.call(document);
  };

  // Intercept events
  ['visibilitychange', 'webkitvisibilitychange', 'blur'].forEach(evt => {
    window.addEventListener(evt, (e) => {
      if (isSpoofed()) {
        e.stopImmediatePropagation();
      }
    }, true);
  });

  console.log('[BetterGN] Dynamic visibility spoofing ready');
})();
