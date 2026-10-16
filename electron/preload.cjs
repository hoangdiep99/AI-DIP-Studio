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
