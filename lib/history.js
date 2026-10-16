/**
 * AI DIP Studio - Photo History (Gallery)
 * Lưu lại các ảnh đã tạo (ảnh thẻ / phục hồi ảnh) ngay trên trình duyệt bằng IndexedDB
 * để người dùng có thể xem lại và tải lại mà không cần tạo ảnh lại từ đầu (tốn credit).
 *
 * Lưu ý: Đây là lưu trữ CỤC BỘ trên máy/trình duyệt hiện tại (chưa đồng bộ server),
 * nên xóa cache/dữ liệu trình duyệt sẽ làm mất lịch sử.
 */

const DB_NAME = 'aidip_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const MAX_ITEMS = 40; // Giới hạn số ảnh lưu để tránh phình dung lượng trình duyệt

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB không được hỗ trợ trên thiết bị/trình duyệt này.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Không mở được cơ sở dữ liệu lịch sử ảnh.'));
  });
}

function runTx(db, mode, callback) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    let result;
    try {
      result = callback(store);
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const LS_BACKUP_KEY = 'aidip_history_backup';

/**
 * Chuyển url ảnh (blob:, data:, hoặc http(s)) thành data URL để lưu bền vững.
 * Hỗ trợ fetch trực tiếp kèm fallback qua Image object + Canvas.
 */
async function urlToDataUrl(url) {
  if (!url) return null;
  if (typeof url === 'string' && url.startsWith('data:')) return url;

  // 1. Thử fetch thông thường
  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (response.ok) {
      const blob = await response.blob();
      const res = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
      if (res) return res;
    }
  } catch (err) {
    // Chuyển tiếp sang fallback bên dưới
  }

  // 2. Thử vẽ qua Image element + Canvas
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const canvasRes = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Image load timeout')), 6000);
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
      img.src = url;
    });
    if (canvasRes) return canvasRes;
  } catch (e) {
    console.warn('[history] Không chuyển được ảnh sang data URL, sẽ lưu URL gốc:', e);
  }

  return null;
}

async function enforceLimit(db) {
  const all = await runTx(db, 'readonly', (store) => new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  }));
  if (all.length <= MAX_ITEMS) return;
  const sorted = [...all].sort((a, b) => a.createdAt - b.createdAt);
  const excess = sorted.slice(0, all.length - MAX_ITEMS);
  await runTx(db, 'readwrite', (store) => {
    excess.forEach((item) => store.delete(item.id));
  });
}

function saveToLocalStorageBackup(item) {
  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY);
    const list = raw ? JSON.parse(raw) : [];
    // Nếu dataUrl quá lớn (> 2.5MB), backup giữ url gọn để tránh vượt quota localStorage (5MB)
    const backupItem = {
      ...item,
      url: typeof item.url === 'string' && item.url.length > 2500000 ? (item.originalUrl || item.url.slice(0, 500)) : item.url,
    };
    const updated = [backupItem, ...list.filter((x) => x.id !== item.id)].slice(0, MAX_ITEMS);
    localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('[history] Lưu backup localStorage thất bại:', err);
  }
}

/**
 * Lưu một ảnh vừa tạo vào lịch sử.
 * @param {Object} params
 * @param {'id-photo'|'restorer'} params.type
 * @param {string} params.url - URL ảnh kết quả (blob:, data: hoặc http(s))
 * @param {Object} [params.meta] - metadata hiển thị (model, ratio, resolution, thời gian...)
 * @param {string} [params.fileName]
 */
export async function addHistoryItem({ type, url, meta = {}, fileName = '' }) {
  if (!url) return null;
  let savedItem = null;
  try {
    const dataUrl = await urlToDataUrl(url);
    const storedUrl = dataUrl || url;
    const item = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: type || 'other',
      url: storedUrl,
      originalUrl: url,
      persisted: !!dataUrl,
      meta,
      fileName: fileName || `${type || 'ai-dip-studio'}-${Date.now()}.png`,
      createdAt: Date.now(),
    };

    // 0. Lưu file ảnh (.png) trực tiếp vào thư mục %APPDATA%\ai-dip-studio\history_photos
    if (typeof window !== 'undefined' && window.electronDisk?.savePhoto) {
      try {
        const diskRes = await window.electronDisk.savePhoto({
          id: item.id,
          fileName: item.fileName,
          url: dataUrl || url,
          meta: item.meta,
          type: item.type,
          createdAt: item.createdAt,
        });
        if (diskRes?.success && diskRes.item?.url) {
          item.url = diskRes.item.url;
          item.filePath = diskRes.item.filePath;
        }
      } catch (diskErr) {
        console.warn('[history] Lưu file ra đĩa thất bại:', diskErr);
      }
    }

    // 1. Lưu vào IndexedDB chính
    try {
      const db = await openDb();
      await runTx(db, 'readwrite', (store) => store.add(item));
      await enforceLimit(db);
      db.close();
    } catch (idbErr) {
      console.warn('[history] Không ghi được IndexedDB, tiếp tục lưu backup:', idbErr);
    }

    // 2. Lưu dự phòng trong localStorage để không bao giờ mất
    saveToLocalStorageBackup(item);

    savedItem = item;

    // 3. Phát event toàn hệ thống để tab Lịch Sử tự động cập nhật ngay lập tức
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aidip:history-updated', { detail: item }));
    }
  } catch (err) {
    console.warn('[history] Lưu lịch sử ảnh thất bại:', err);
  }
  return savedItem;
}

/**
 * Lấy danh sách lịch sử, sắp mới nhất trước.
 * Tự động đồng bộ và phục hồi giữa Disk (%APPDATA%), IndexedDB và LocalStorage backup.
 * @param {'all'|'id-photo'|'restorer'} [type]
 */
export async function getHistory(type) {
  let items = [];
  try {
    const db = await openDb();
    items = await runTx(db, 'readonly', (store) => new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    }));
    db.close();
  } catch (err) {
    console.warn('[history] Không tải được lịch sử từ IndexedDB:', err);
  }

  // Kết hợp và phục hồi từ file trên đĩa (%APPDATA%\ai-dip-studio\history.json)
  if (typeof window !== 'undefined' && window.electronDisk?.getHistory) {
    try {
      const diskList = await window.electronDisk.getHistory();
      if (Array.isArray(diskList) && diskList.length > 0) {
        const diskMap = new Map(diskList.map((x) => [x.id, x]));
        // Ưu tiên cập nhật thông tin chuẩn xác từ đĩa (loại ảnh 'id-photo'/'restorer', filePath, url)
        items = items.map((it) => {
          const dItem = diskMap.get(it.id);
          if (dItem) {
            return { ...it, ...dItem };
          }
          return it;
        });
        const idSet = new Set(items.map((x) => x.id));
        diskList.forEach((dItem) => {
          if (!idSet.has(dItem.id)) {
            items.push(dItem);
          }
        });
      }
      // Tự động xuất các ảnh có sẵn trong IndexedDB ra file ảnh .png trên đĩa nếu chưa có
      if (window.electronDisk?.savePhoto) {
        items.forEach((it) => {
          if (!it.filePath && it.url) {
            window.electronDisk.savePhoto(it).catch(() => {});
          }
        });
      }
    } catch (diskErr) {
      console.warn('[history] Đọc từ đĩa thất bại:', diskErr);
    }
  }

  // Kết hợp và phục hồi từ localStorage nếu thiếu dữ liệu
  try {
    const raw = localStorage.getItem(LS_BACKUP_KEY);
    if (raw) {
      const backupList = JSON.parse(raw);
      if (Array.isArray(backupList) && backupList.length > 0) {
        const idSet = new Set(items.map((x) => x.id));
        const missing = backupList.filter((b) => !idSet.has(b.id));
        if (missing.length > 0) {
          items.push(...missing);
          // Đồng bộ lại vào IndexedDB để lần sau tải nhanh
          try {
            const db = await openDb();
            await runTx(db, 'readwrite', (store) => {
              missing.forEach((it) => store.put(it));
            });
            db.close();
          } catch (syncErr) {
            console.warn('[history] Sync ngược từ backup vào IndexedDB thất bại:', syncErr);
          }
        }
      }
    }
  } catch (lsErr) {
    console.warn('[history] Đọc backup localStorage thất bại:', lsErr);
  }

  const filtered = type && type !== 'all' ? items.filter((item) => item.type === type) : items;
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteHistoryItem(id) {
  try {
    try {
      const db = await openDb();
      await runTx(db, 'readwrite', (store) => store.delete(id));
      db.close();
    } catch (idbErr) {
      console.warn('[history] Xóa IndexedDB thất bại:', idbErr);
    }

    try {
      const raw = localStorage.getItem(LS_BACKUP_KEY);
      if (raw) {
        const list = JSON.parse(raw);
        const nextList = list.filter((x) => x.id !== id);
        localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(nextList));
      }
    } catch (lsErr) {
      console.warn('[history] Xóa backup localStorage thất bại:', lsErr);
    }

    if (typeof window !== 'undefined' && window.electronDisk?.deleteHistoryItem) {
      window.electronDisk.deleteHistoryItem(id).catch(() => {});
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aidip:history-updated'));
    }
    return true;
  } catch (err) {
    console.warn('[history] Xóa ảnh lịch sử thất bại:', err);
    return false;
  }
}

/**
 * Xóa toàn bộ lịch sử, hoặc chỉ xóa theo type nếu truyền vào.
 */
export async function clearHistory(type) {
  try {
    const itemsToDelete = await getHistory(type);
    const idsToDelete = new Set(itemsToDelete.map((x) => x.id));

    try {
      const db = await openDb();
      if (!type || type === 'all') {
        await runTx(db, 'readwrite', (store) => store.clear());
      } else {
        await runTx(db, 'readwrite', (store) => {
          itemsToDelete.forEach((item) => store.delete(item.id));
        });
      }
      db.close();
    } catch (idbErr) {
      console.warn('[history] Xóa IndexedDB thất bại:', idbErr);
    }

    try {
      const raw = localStorage.getItem(LS_BACKUP_KEY);
      if (raw) {
        if (!type || type === 'all') {
          localStorage.removeItem(LS_BACKUP_KEY);
        } else {
          const list = JSON.parse(raw);
          const nextList = list.filter((x) => !idsToDelete.has(x.id));
          localStorage.setItem(LS_BACKUP_KEY, JSON.stringify(nextList));
        }
      }
    } catch (lsErr) {
      console.warn('[history] Xóa backup localStorage thất bại:', lsErr);
    }

    if (typeof window !== 'undefined' && window.electronDisk?.clearHistory) {
      window.electronDisk.clearHistory(type).catch(() => {});
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aidip:history-updated'));
    }
    return true;
  } catch (err) {
    console.warn('[history] Xóa lịch sử thất bại:', err);
    return false;
  }
}
