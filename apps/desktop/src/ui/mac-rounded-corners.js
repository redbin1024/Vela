// @ts-check
import { invoke } from '../api.js';

let currentConfig = null;

/**
 * Reposition Traffic Lights only (after fullscreen toggle, etc.)
 */
export async function repositionTrafficLights() {
  if (!currentConfig) return;
  
  try {
    const label = window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? 'main';
    await invoke('reposition_traffic_lights', {
      window: { label },
      offsetX: currentConfig.offsetX ?? 0.0,
      offsetY: currentConfig.offsetY ?? 0.0,
    });
  } catch (error) {
    console.error('Failed to reposition traffic lights:', error);
  }
}

/**
 * Enables rounded corners for the window (macOS only)
 */
export async function enableRoundedCorners(config) {
  try {
    currentConfig = config || {};
    const label = window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? 'main';
    
    await invoke('enable_rounded_corners', {
      window: { label },
      offsetX: config?.offsetX ?? 0.0,
      offsetY: config?.offsetY ?? 0.0,
    });

    setupResizeListener();
  } catch (error) {
    console.error('Failed to enable rounded corners:', error);
    throw error;
  }
}

/**
 * Enables modern window style with rounded corners and shadow (macOS only)
 */
export async function enableModernWindowStyle(config) {
  try {
    currentConfig = config || {};
    const label = window.__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? 'main';
    
    await invoke('enable_modern_window_style', {
      window: { label },
      cornerRadius: config?.cornerRadius ?? 12.0,
      offsetX: config?.offsetX ?? 0.0,
      offsetY: config?.offsetY ?? 0.0,
    });

    setupResizeListener();
  } catch (error) {
    console.error('Failed to enable modern window style:', error);
    throw error;
  }
}

let hasResizeListener = false;

function setupResizeListener() {
  if (hasResizeListener) return;
  window.addEventListener('resize', repositionTrafficLights);
  hasResizeListener = true;
}

/**
 * Cleanup function
 */
export function cleanupRoundedCorners() {
  if (hasResizeListener) {
    window.removeEventListener('resize', repositionTrafficLights);
    hasResizeListener = false;
  }
  currentConfig = null;
}
