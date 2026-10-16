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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'AI DIP Studio v2.0.10',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    backgroundColor: '#0a0a0f',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

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
