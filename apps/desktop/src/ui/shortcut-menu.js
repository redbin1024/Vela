// @ts-check
/**
 * Shortcut Operations Menu - Title bar menu logic.
 *
 * @module ui/shortcut-menu
 */

import { appStore } from './state.js';
import { invoke, getProxies, switchProxy, closeAllConnections, getCurrentWindow } from '../api.js';
import { COMMANDS } from '@vela/shared';
import { switchToConfig } from './lifecycle.js';
import { invalidateProxiesCache } from './cache.js';
import { invalidateRunConfigCache } from './run-config-cache.js';

let isMenuOpen = false;

/**
 * Initialize shortcut operations menu event listeners.
 */
export function initShortcutMenu() {
    const trigger = document.getElementById('app-title-click-trigger');
    const menu = document.getElementById('shortcut-menu');

    if (!trigger || !menu) return;

    const toggleMenu = (/** @type {Event} */ e) => {
        e.preventDefault();
        e.stopPropagation();
        
        isMenuOpen = !isMenuOpen;
        if (isMenuOpen) {
            menu.classList.remove('hidden');
            syncShortcutMenuState().catch(err => console.error('[ShortcutMenu] sync failed', err));
        } else {
            menu.classList.add('hidden');
        }
    };

    // Toggle menu display on left and right click
    trigger.addEventListener('click', toggleMenu);
    trigger.addEventListener('contextmenu', toggleMenu);

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!isMenuOpen) return;
        const target = /** @type {Element} */ (e.target);
        if (!target.closest('#app-title-click-trigger')) {
            menu.classList.add('hidden');
            isMenuOpen = false;
        }
    });

    // Bind item click event listeners
    setupMenuItemListeners();
}

/**
 * Set up click listeners for all shortcut action items.
 */
function setupMenuItemListeners() {
    // Show Main
    const showMainBtn = document.getElementById('shortcut-show-main');
    if (showMainBtn) {
        showMainBtn.addEventListener('click', () => {
            // Dropdown menu is inside window, simply close the menu
            const menu = document.getElementById('shortcut-menu');
            if (menu) menu.classList.add('hidden');
            isMenuOpen = false;
        });
    }

    // System Proxy Toggle
    const sysProxyBtn = document.getElementById('shortcut-sys-proxy');
    if (sysProxyBtn) {
        sysProxyBtn.addEventListener('click', () => {
            const toggle = /** @type {HTMLInputElement | null} */ (document.getElementById('sys-proxy-toggle'));
            if (toggle) {
                toggle.click();
                // Close menu
                const menu = document.getElementById('shortcut-menu');
                if (menu) menu.classList.add('hidden');
                isMenuOpen = false;
            }
        });
    }

    // TUN Mode Toggle
    const tunBtn = document.getElementById('shortcut-tun-mode');
    if (tunBtn) {
        tunBtn.addEventListener('click', () => {
            const toggle = /** @type {HTMLInputElement | null} */ (document.getElementById('tun-proxy-toggle'));
            if (toggle) {
                toggle.click();
                const menu = document.getElementById('shortcut-menu');
                if (menu) menu.classList.add('hidden');
                isMenuOpen = false;
            }
        });
    }

    // Proxy Modes
    const ruleBtn = document.getElementById('shortcut-mode-rule');
    if (ruleBtn) {
        ruleBtn.addEventListener('click', () => {
            const btn = /** @type {HTMLButtonElement | null} */ (document.querySelector('[data-mode="rule"]'));
            if (btn) btn.click();
            const menu = document.getElementById('shortcut-menu');
            if (menu) menu.classList.add('hidden');
            isMenuOpen = false;
        });
    }

    const globalBtn = document.getElementById('shortcut-mode-global');
    if (globalBtn) {
        globalBtn.addEventListener('click', () => {
            const btn = /** @type {HTMLButtonElement | null} */ (document.querySelector('[data-mode="global"]'));
            if (btn) btn.click();
            const menu = document.getElementById('shortcut-menu');
            if (menu) menu.classList.add('hidden');
            isMenuOpen = false;
        });
    }

    const directBtn = document.getElementById('shortcut-mode-direct');
    if (directBtn) {
        directBtn.addEventListener('click', () => {
            const btn = /** @type {HTMLButtonElement | null} */ (document.querySelector('[data-mode="direct"]'));
            if (btn) btn.click();
            const menu = document.getElementById('shortcut-menu');
            if (menu) menu.classList.add('hidden');
            isMenuOpen = false;
        });
    }

    // Quit Application
    const quitBtn = document.getElementById('shortcut-quit');
    if (quitBtn) {
        quitBtn.addEventListener('click', () => {
            getCurrentWindow().close();
        });
    }

    // Setup Hover for nested dropdown menus
    setupNestedMenuHover();
}

/**
 * Handle hover behaviors for nested subscription and nodes lists.
 */
function setupNestedMenuHover() {
    const subTrigger = document.getElementById('shortcut-subscriptions-trigger');
    const subMenu = document.getElementById('shortcut-subscriptions-menu');
    const nodeTrigger = document.getElementById('shortcut-nodes-trigger');
    const nodeMenu = document.getElementById('shortcut-nodes-menu');

    if (subTrigger && subMenu) {
        const parent = subTrigger.parentElement;
        if (parent) {
            parent.addEventListener('mouseenter', () => {
                subMenu.classList.remove('hidden');
                // Hide node menu when subscription menu is shown
                if (nodeMenu) nodeMenu.classList.add('hidden');
            });
            parent.addEventListener('mouseleave', () => {
                subMenu.classList.add('hidden');
            });
        }
    }

    if (nodeTrigger && nodeMenu) {
        const parent = nodeTrigger.parentElement;
        if (parent) {
            parent.addEventListener('mouseenter', () => {
                nodeMenu.classList.remove('hidden');
                if (subMenu) subMenu.classList.add('hidden');
            });
            parent.addEventListener('mouseleave', () => {
                nodeMenu.classList.add('hidden');
            });
        }
    }
}

/**
 * Synchronize the shortcut operations menu checkbox and radio state, 
 * and trigger dynamic lists reloading.
 */
async function syncShortcutMenuState() {
    // 1. SysProxy Check
    const sysProxyDot = document.querySelector('.shortcut-sys-proxy-dot');
    if (sysProxyDot) {
        sysProxyDot.textContent = appStore.get('isSysProxyEnabled') ? '●' : '○';
    }

    // 2. TUN Check
    const tunDot = document.querySelector('.shortcut-tun-mode-dot');
    if (tunDot) {
        tunDot.textContent = appStore.get('isTunEnabled') ? '●' : '○';
    }

    // 3. Outbound Mode Checks
    const mode = appStore.get('currentOutboundMode') || 'rule';
    const ruleDot = document.querySelector('.shortcut-mode-rule-dot');
    const globalDot = document.querySelector('.shortcut-mode-global-dot');
    const directDot = document.querySelector('.shortcut-mode-direct-dot');

    if (ruleDot) ruleDot.textContent = mode === 'rule' ? '●' : '○';
    if (globalDot) globalDot.textContent = mode === 'global' ? '●' : '○';
    if (directDot) directDot.textContent = mode === 'direct' ? '●' : '○';

    // 4. Load Subscription list & Node list concurrently
    await Promise.all([
        loadShortcutSubscriptions(),
        loadShortcutNodes()
    ]);
}

/**
 * Fetch and render subscription files in the submenu.
 */
async function loadShortcutSubscriptions() {
    const subMenu = document.getElementById('shortcut-subscriptions-menu');
    if (!subMenu) return;

    try {
        const [configsList, settings] = await Promise.all([
            invoke(COMMANDS.LIST_CONFIGS),
            invoke(COMMANDS.GET_SETTINGS)
        ]);

        const activeConfig = settings.last_config || 'config.yaml';
        subMenu.innerHTML = '';

        if (!configsList || configsList.length === 0) {
            subMenu.innerHTML = '<div class="px-3 py-1.5 text-2xs text-zinc-500 italic">No configs</div>';
            return;
        }

        configsList.forEach((/** @type {any} */ c) => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5 flex items-center gap-2 text-zinc-300';
            
            const isActive = c.name === activeConfig;
            btn.innerHTML = `
                <span class="font-mono text-[9px] w-3 text-center">${isActive ? '●' : '○'}</span>
                <span class="truncate flex-1">${c.name}</span>
            `;

            btn.addEventListener('click', async () => {
                // Close menu
                const menu = document.getElementById('shortcut-menu');
                if (menu) menu.classList.add('hidden');
                isMenuOpen = false;

                try {
                    const customArgs = settings.custom_args || [];
                    await switchToConfig(c.name, customArgs);
                } catch (e) {
                    console.error('[ShortcutMenu] switch config failed', e);
                }
            });

            subMenu.appendChild(btn);
        });

    } catch (err) {
        console.error('[ShortcutMenu] load subscriptions failed', err);
        subMenu.innerHTML = '<div class="px-3 py-1.5 text-2xs text-red-400">Load error</div>';
    }
}

/**
 * Fetch and render proxies in the submenu.
 */
async function loadShortcutNodes() {
    const nodeMenu = document.getElementById('shortcut-nodes-menu');
    if (!nodeMenu) return;

    try {
        const pd = await getProxies();
        nodeMenu.innerHTML = '';

        if (!pd || !pd.proxies) {
            nodeMenu.innerHTML = '<div class="px-3 py-1.5 text-2xs text-zinc-500 italic">No proxies</div>';
            return;
        }

        // Get main selector group using exact same logic as tray.js
        let mainGroup = appStore.get('uiGroupName') || appStore.get('uiPrimaryGroupName');
        if (!mainGroup || !pd.proxies[mainGroup]) {
            const groupNames = Object.keys(pd.proxies).filter(name => {
                const type = pd.proxies[name].type?.toLowerCase() || '';
                return type === 'selector' || type === 'select';
            });
            mainGroup = groupNames[0];
        }

        if (!mainGroup || !pd.proxies[mainGroup]) {
            nodeMenu.innerHTML = '<div class="px-3 py-1.5 text-2xs text-zinc-500 italic">No selector group</div>';
            return;
        }

        const group = pd.proxies[mainGroup];
        const allNodes = group.all || [];

        if (allNodes.length === 0) {
            nodeMenu.innerHTML = '<div class="px-3 py-1.5 text-2xs text-zinc-500 italic">Empty group</div>';
            return;
        }

        allNodes.forEach((/** @type {string} */ nodeName) => {
            const btn = document.createElement('button');
            btn.className = 'w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5 flex items-center gap-2 text-zinc-300';
            
            const isActive = nodeName === group.now;
            btn.innerHTML = `
                <span class="font-mono text-[9px] w-3 text-center">${isActive ? '●' : '○'}</span>
                <span class="truncate flex-1" title="${nodeName}">${nodeName}</span>
            `;

            btn.addEventListener('click', async () => {
                // Close menu
                const menu = document.getElementById('shortcut-menu');
                if (menu) menu.classList.add('hidden');
                isMenuOpen = false;

                try {
                    const success = await switchProxy(mainGroup, nodeName);
                    if (success) {
                        invalidateProxiesCache();
                        invalidateRunConfigCache();

                        // Sync state
                        appStore.set('uiGroupName', mainGroup);
                        await closeAllConnections();

                        // Refresh proxies and sync
                        import('./proxies.js').then(m => m.syncCoreConfig());

                        const currentNodeEl = document.getElementById('current-node-name');
                        if (currentNodeEl) currentNodeEl.textContent = nodeName;

                        const proxiesPage = document.querySelector('[data-page="proxies"]');
                        if (proxiesPage && !proxiesPage.classList.contains('hidden')) {
                            import('./proxies.js').then(m => m.renderProxies());
                        }
                    }
                } catch (e) {
                    console.error('[ShortcutMenu] switch proxy failed', e);
                }
            });

            nodeMenu.appendChild(btn);
        });

    } catch (err) {
        console.error('[ShortcutMenu] load nodes failed', err);
        nodeMenu.innerHTML = '<div class="px-3 py-1.5 text-2xs text-red-400">Load error</div>';
    }
}
