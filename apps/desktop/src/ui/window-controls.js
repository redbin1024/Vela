// @ts-check
/**
 * Window control initialization (close button, icon fallbacks).
 * Extracted from ui.js.
 *
 * @module ui/window-controls
 */

import { getCurrentWindow } from '../api.js';

/**
 * Initialize window control event listeners.
 * - Close button: closes the application window
 * - Core loading icon: falls back to dark-icon.png on error
 * - App title icon: falls back to app-icon.png on error
 */
export function initWindowControls() {
    if (/Macintosh|Mac OS X/i.test(navigator.userAgent)) {
        document.body.classList.add('platform-mac');
    }

    const closeBtn = document.getElementById('close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            getCurrentWindow().close();
        });
    }

    const minBtn = document.getElementById('min-btn');
    if (minBtn) {
        minBtn.addEventListener('click', () => {
            getCurrentWindow().minimize();
        });
    }

    const maxBtn = document.getElementById('max-btn');
    if (maxBtn) {
        maxBtn.addEventListener('click', async () => {
            const win = getCurrentWindow();
            try {
                // @ts-ignore - isMaximized is a promise in tauri v2
                const max = await win.isMaximized();
                if (max) {
                    await win.unmaximize();
                } else {
                    await win.maximize();
                }
            } catch (e) {
                // fallback
                await win.maximize();
            }
        });
    }

    const coreLoadingIcon = document.getElementById('core-loading-icon');
    if (coreLoadingIcon) {
        /** @type {HTMLImageElement} */ (coreLoadingIcon).addEventListener('error', function() {
            /** @type {HTMLImageElement} */ (this).src = 'dark-icon.png';
        }, { once: true });
    }

    const appTitleIcon = document.getElementById('app-title-icon');
    if (appTitleIcon) {
        /** @type {HTMLImageElement} */ (appTitleIcon).addEventListener('error', function() {
            /** @type {HTMLImageElement} */ (this).src = 'app-icon.png';
        }, { once: true });
    }
}
