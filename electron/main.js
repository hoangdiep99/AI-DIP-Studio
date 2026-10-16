/**
 * Electron main process cho AI DIP Studio.
 * Mở cửa sổ desktop và load bản build tĩnh trong dist/index.html.
 * Hỗ trợ hệ thống Auto-Update 1-click tải trực tiếp không cần mở trình duyệt.
 * File này dùng cú pháp ES Module vì package.json có "type": "module".
 */
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function getWindowState() {
  try {
    const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');
    if (fs.existsSync(windowStateFile)) {
      return JSON.parse(fs.readFileSync(windowStateFile, 'utf-8'));
    }
  } catch (e) {}
  return { width: 1360, height: 860, isMaximized: false };
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');
    const isMaximized = win.isMaximized();
    if (!isMaximized) {
      const bounds = win.getBounds();
      fs.writeFileSync(windowStateFile, JSON.stringify({ ...bounds, isMaximized: false }, null, 2), 'utf-8');
    } else {
      fs.writeFileSync(windowStateFile, JSON.stringify({ isMaximized: true }, null, 2), 'utf-8');
    }
  } catch (e) {}
}

function createWindow() {
  const state = getWindowState();
  const windowOptions = {
    width: state.width || 1360,
    height: state.height || 860,
    minWidth: 960,
    minHeight: 640,
    title: 'AI DIP Studio v2.1.5',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#0a0a0f',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  };
  if (state.x !== undefined && state.y !== undefined && !state.isMaximized) {
    windowOptions.x = state.x;
    windowOptions.y = state.y;
  }
  mainWindow = new BrowserWindow(windowOptions);

  if (state.isMaximized) {
    mainWindow.maximize();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('resize', () => saveWindowState(mainWindow));
  mainWindow.on('move', () => saveWindowState(mainWindow));
  mainWindow.on('close', () => saveWindowState(mainWindow));

  // Hỗ trợ F12 / Ctrl+Shift+I (DevTools) và F5 (Reload)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.key === 'F5' || (input.control && input.key.toLowerCase() === 'r')) {
      mainWindow.reload();
      event.preventDefault();
    }
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process gone:', details);
    if (details.reason !== 'clean-exit') {
      mainWindow?.reload();
    }
  });

  // Mở link ngoài bằng trình duyệt hệ thống
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('FAILED TO LOAD:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// === IPC: TỰ ĐỘNG TẢI BẢN CẬP NHẬT TRONG APP (KHÔNG MỞ TRÌNH DUYỆT) ===
ipcMain.handle('start-download-update', async (event, downloadUrl) => {
  try {
    if (!downloadUrl) throw new Error('Không có URL tải hợp lệ');
    const tempFileName = `AI-DIP-Studio-Setup-vUpdate-${Date.now()}.exe`;
    const tempFilePath = path.join(os.tmpdir(), tempFileName);

    // Dùng fetch của Node (tự động theo dõi HTTP 302 redirect từ GitHub sang AWS S3)
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`Lỗi kết nối tải: HTTP ${res.status}`);

    const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
    const fileStream = fs.createWriteStream(tempFilePath);

    const reader = res.body.getReader();
    let downloadedBytes = 0;
    let lastTime = Date.now();
    let lastBytes = 0;
    let currentSpeed = '0 MB/s';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      fileStream.write(Buffer.from(value));
      downloadedBytes += value.length;

      const now = Date.now();
      if (now - lastTime >= 350 || downloadedBytes === totalBytes) {
        const timeDiffSec = (now - lastTime) / 1000;
        const bytesDiff = downloadedBytes - lastBytes;
        if (timeDiffSec > 0) {
          const speedMbps = (bytesDiff / (1024 * 1024 * timeDiffSec)).toFixed(1);
          currentSpeed = `${speedMbps} MB/s`;
        }
        lastTime = now;
        lastBytes = downloadedBytes;

        const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 50;
        const downloadedMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
        const totalMb = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : '--';

        event.sender.send('update-download-progress', {
          percent,
          downloadedBytes,
          totalBytes,
          downloadedMb,
          totalMb,
          speed: currentSpeed,
          done: false,
        });
      }
    }

    await new Promise((resolve, reject) => {
      fileStream.end((err) => (err ? reject(err) : resolve()));
    });

    const finalMb = (downloadedBytes / (1024 * 1024)).toFixed(1);
    event.sender.send('update-download-progress', {
      percent: 100,
      downloadedBytes,
      totalBytes: downloadedBytes,
      downloadedMb: finalMb,
      totalMb: finalMb,
      speed: currentSpeed,
      done: true,
      filePath: tempFilePath,
    });

    return { success: true, filePath: tempFilePath };
  } catch (err) {
    console.error('Lỗi tải bản cập nhật:', err);
    return { success: false, error: err.message };
  }
});

// === IPC: KÍCH HOẠT CÀI ĐẶT & THOÁT APP ĐỂ GHI ĐÈ FILE ===
ipcMain.handle('install-and-restart', async (_event, filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('File cài đặt không tồn tại trên ổ cứng');
    }

    // Khởi chạy trình cài đặt Inno Setup độc lập
    const installerProcess = spawn(filePath, ['/CLOSEAPPLICATIONS'], {
      detached: true,
      stdio: 'ignore',
    });
    installerProcess.unref();

    // Thoát ứng dụng hiện tại để bộ cài Inno Setup cập nhật file không bị xung đột
    setTimeout(() => {
      app.quit();
    }, 600);

    return { success: true };
  } catch (err) {
    console.error('Lỗi khởi chạy bộ cài:', err);
    return { success: false, error: err.message };
  }
});

// === IPC: LƯU & QUẢN LÝ ẢNH LỊCH SỬ DẠNG FILE TRỰC TIẾP TRÊN Ổ CỨNG (%APPDATA%) ===
function getAppStoragePaths() {
  const userData = app.getPath('userData');
  const historyDir = path.join(userData, 'history_photos');
  const historyJson = path.join(userData, 'history.json');
  const apiConfigJson = path.join(userData, 'api_config.json');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }
  return { userData, historyDir, historyJson, apiConfigJson };
}

ipcMain.handle('save-history-photo', async (_event, item) => {
  try {
    if (!item || !item.url) return { success: false, error: 'Thiếu dữ liệu ảnh' };
    const { historyDir, historyJson } = getAppStoragePaths();

    const timestamp = item.createdAt || Date.now();
    const baseName = item.fileName ? item.fileName.replace(/\.(png|jpe?g|webp)$/i, '') : `anh-the-ai-${timestamp}`;
    const safeName = `${baseName.replace(/[\\/:*?"<>|]+/g, '_')}.png`;
    const targetFilePath = path.join(historyDir, safeName);

    if (typeof item.url === 'string' && item.url.startsWith('data:')) {
      const base64Data = item.url.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(targetFilePath, Buffer.from(base64Data, 'base64'));
    } else if (typeof item.url === 'string' && item.url.startsWith('http')) {
      try {
        const resp = await fetch(item.url);
        if (resp.ok) {
          const buffer = Buffer.from(await resp.arrayBuffer());
          fs.writeFileSync(targetFilePath, buffer);
        }
      } catch (fetchErr) {
        console.warn('Không tải được URL remote về lưu đĩa:', fetchErr.message);
      }
    }

    let historyList = [];
    try {
      if (fs.existsSync(historyJson)) {
        historyList = JSON.parse(fs.readFileSync(historyJson, 'utf-8'));
      }
    } catch (e) {
      historyList = [];
    }

    const fileUrl = `file:///${targetFilePath.replace(/\\/g, '/')}`;
    const diskItem = {
      id: item.id || `hist-${timestamp}-${Math.random().toString(36).slice(2, 9)}`,
      type: item.type || 'other',
      fileName: safeName,
      filePath: targetFilePath,
      url: fs.existsSync(targetFilePath) ? fileUrl : item.url,
      meta: item.meta || {},
      createdAt: timestamp,
    };

    historyList = [diskItem, ...historyList.filter((x) => x.id !== diskItem.id)].slice(0, 100);
    fs.writeFileSync(historyJson, JSON.stringify(historyList, null, 2), 'utf-8');

    return { success: true, item: diskItem };
  } catch (err) {
    console.error('Lỗi lưu ảnh ra ổ cứng:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-disk-history', async () => {
  try {
    const { historyDir, historyJson } = getAppStoragePaths();
    if (!fs.existsSync(historyJson)) return [];
    const content = fs.readFileSync(historyJson, 'utf-8');
    const list = JSON.parse(content);
    if (!Array.isArray(list)) return [];

    return list.map((item) => {
      const p = item.filePath || path.join(historyDir, item.fileName);
      const exists = fs.existsSync(p);
      return {
        ...item,
        url: exists ? `file:///${p.replace(/\\/g, '/')}` : item.url,
        exists,
      };
    });
  } catch (err) {
    console.error('Lỗi đọc lịch sử từ đĩa:', err);
    return [];
  }
});

ipcMain.handle('delete-disk-history-item', async (_event, id) => {
  try {
    const { historyJson } = getAppStoragePaths();
    if (!fs.existsSync(historyJson)) return true;
    const list = JSON.parse(fs.readFileSync(historyJson, 'utf-8'));
    const itemToDelete = list.find((x) => x.id === id);
    if (itemToDelete && itemToDelete.filePath && fs.existsSync(itemToDelete.filePath)) {
      try { fs.unlinkSync(itemToDelete.filePath); } catch (e) {}
    }
    const nextList = list.filter((x) => x.id !== id);
    fs.writeFileSync(historyJson, JSON.stringify(nextList, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('clear-disk-history', async (_event, type) => {
  try {
    const { historyJson } = getAppStoragePaths();
    if (!fs.existsSync(historyJson)) return true;
    const list = JSON.parse(fs.readFileSync(historyJson, 'utf-8'));
    const toDelete = type && type !== 'all' ? list.filter((x) => x.type === type) : list;
    toDelete.forEach((it) => {
      if (it.filePath && fs.existsSync(it.filePath)) {
        try { fs.unlinkSync(it.filePath); } catch (e) {}
      }
    });
    const remaining = type && type !== 'all' ? list.filter((x) => x.type !== type) : [];
    fs.writeFileSync(historyJson, JSON.stringify(remaining, null, 2), 'utf-8');
    return true;
  } catch (err) {
    return false;
  }
});

ipcMain.handle('open-history-folder', async () => {
  try {
    const { historyDir } = getAppStoragePaths();
    await shell.openPath(historyDir);
    return { success: true, path: historyDir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-api-config-disk', async (_event, config) => {
  try {
    if (!config) return false;
    const { apiConfigJson } = getAppStoragePaths();
    fs.writeFileSync(apiConfigJson, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Lỗi lưu api_config.json ra đĩa:', err);
    return false;
  }
});

ipcMain.handle('get-api-config-disk', async () => {
  try {
    const { apiConfigJson } = getAppStoragePaths();
    if (!fs.existsSync(apiConfigJson)) return null;
    return JSON.parse(fs.readFileSync(apiConfigJson, 'utf-8'));
  } catch (err) {
    return null;
  }
});

ipcMain.handle('get-user-data-path', async () => {
  return app.getPath('userData');
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
