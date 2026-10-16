const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronUpdater', {
  isElectron: true,
  startDownload: (downloadUrl) => ipcRenderer.invoke('start-download-update', downloadUrl),
  installUpdate: (filePath) => ipcRenderer.invoke('install-and-restart', filePath),
  onDownloadProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('update-download-progress', handler);
    return () => ipcRenderer.removeListener('update-download-progress', handler);
  },
});

contextBridge.exposeInMainWorld('electronDisk', {
  savePhoto: (data) => ipcRenderer.invoke('save-history-photo', data),
  getHistory: () => ipcRenderer.invoke('get-disk-history'),
  deleteHistoryItem: (id) => ipcRenderer.invoke('delete-disk-history-item', id),
  clearHistory: (type) => ipcRenderer.invoke('clear-disk-history', type),
  openHistoryFolder: () => ipcRenderer.invoke('open-history-folder'),
  saveApiConfig: (config) => ipcRenderer.invoke('save-api-config-disk', config),
  getApiConfig: () => ipcRenderer.invoke('get-api-config-disk'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
});
