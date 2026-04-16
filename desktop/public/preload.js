const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script for secure IPC communication
 * Exposes safe APIs to the renderer process
 */

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Secure storage API
   */
  storage: {
    get: (key) => ipcRenderer.invoke('store-get', key),
    set: (key, value) => ipcRenderer.invoke('store-set', key, value),
    delete: (key) => ipcRenderer.invoke('store-delete', key),
    clear: () => ipcRenderer.invoke('store-clear'),
  },

  /**
   * System info
   */
  system: {
    platform: process.platform,
    arch: process.arch,
    version: process.version,
  },

  /**
   * App info
   */
  app: {
    name: 'DIMS-SR',
    version: '1.0.0',
    isDev: process.env.NODE_ENV === 'development',
  },

  /**
   * Security utilities
   */
  security: {
    /**
     * Sanitize user input to prevent XSS
     */
    sanitize: (input) => {
      const div = document.createElement('div');
      div.textContent = input;
      return div.innerHTML;
    },

    /**
     * Generate random token for CSRF
     */
    generateToken: () => {
      return Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    },
  },
});

console.log('[Preload] Electron API exposed to renderer');
