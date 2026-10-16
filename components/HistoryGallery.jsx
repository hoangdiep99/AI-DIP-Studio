import React from 'react';
import { getHistory, deleteHistoryItem, clearHistory } from '../lib/history.js';
import { downloadMediaFile } from '../lib/api.js';

const TYPE_LABELS = {
  'id-photo': '🪪 Ảnh thẻ',
  'restorer': '🖼️ Phục hồi',
  'other': '📷 Khác',
};

const FILTERS = [
  { id: 'all', label: '🗂️ Tất cả' },
  { id: 'id-photo', label: '🪪 Ảnh thẻ' },
  { id: 'restorer', label: '🖼️ Phục hồi ảnh cũ' },
];

const formatDate = (ts) => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('vi-VN');
  } catch {
    return '';
  }
};

const HistoryGallery = ({ onSendToLayout, refreshToken, active = false }) => {
  const [allItems, setAllItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [preview, setPreview] = React.useState(null);
  const [error, setError] = React.useState('');

  const load = React.useCallback(async (isManual = false) => {
    if (isManual) setSyncing(true);
    else setLoading(true);
    try {
      const list = await getHistory('all');
      setAllItems(list);
    } catch (e) {
      setError(e?.message || 'Không tải được lịch sử ảnh.');
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load, refreshToken]);

  // Tự động đồng bộ mỗi khi người dùng bấm vào tab Lịch Sử
  React.useEffect(() => {
    if (active) {
      load();
    }
  }, [active, load]);

  // Tự động lắng nghe event phát ra khi vừa tạo xong ảnh mới
  React.useEffect(() => {
    const handleUpdate = () => load();
    window.addEventListener('aidip:history-updated', handleUpdate);
    return () => window.removeEventListener('aidip:history-updated', handleUpdate);
  }, [load]);

  const items = React.useMemo(() => {
    if (filter === 'all') return allItems;
    return allItems.filter((it) => it.type === filter);
  }, [allItems, filter]);

  const counts = React.useMemo(() => {
    return {
      all: allItems.length,
      'id-photo': allItems.filter((it) => it.type === 'id-photo').length,
      'restorer': allItems.filter((it) => it.type === 'restorer').length,
    };
  }, [allItems]);

  const handleDelete = async (id, event) => {
    event?.stopPropagation();
    await deleteHistoryItem(id);
    setPreview((prev) => (prev?.id === id ? null : prev));
    load();
  };

  const handleClearAll = async () => {
    const label = filter === 'all' ? 'toàn bộ' : TYPE_LABELS[filter] || 'mục đang lọc';
    if (!window.confirm(`Xóa ${label} lịch sử ảnh? Hành động này không thể hoàn tác.`)) return;
    await clearHistory(filter);
    setPreview(null);
    load();
  };

  const handleDownload = async (item) => {
    try {
      setError('');
      await downloadMediaFile(item.url, item.fileName);
    } catch (err) {
      setError(err?.message || 'Không tải được ảnh.');
    }
  };

  const handleOpenFolder = async () => {
    try {
      if (window.electronDisk?.openHistoryFolder) {
        await window.electronDisk.openHistoryFolder();
      } else {
        alert('Ảnh được lưu trong thư mục: %APPDATA%\\ai-dip-studio\\history_photos');
      }
    } catch (e) {
      setError(e?.message || 'Không mở được thư mục ảnh.');
    }
  };

  return (
    <div className="history-page module-enter">
      <div className="history-hero">
        <div>
          <h2>🕘 Lịch Sử Ảnh <span style={{ fontSize: '16px', color: 'var(--text-dim)', fontWeight: 600 }}>({allItems.length} ảnh)</span></h2>
          <p>Toàn bộ ảnh thẻ và ảnh phục hồi bạn đã tạo được lưu trữ an toàn ngay trên máy tính của bạn (%APPDATA%\ai-dip-studio) — xem lại, tải về và mở thư mục bất cứ lúc nào mà không cần tạo lại.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn-secondary history-refresh-btn" onClick={() => load(true)} disabled={loading || syncing}>
            {syncing ? '🔄 Đang đồng bộ...' : '↻ Đồng bộ / Làm mới'}
          </button>
          <button type="button" className="btn-secondary history-open-folder-btn" onClick={handleOpenFolder} title="Mở thư mục chứa file ảnh gốc trong AppData">
            📂 Mở thư mục ảnh
          </button>
          {allItems.length > 0 && (
            <button type="button" className="btn-secondary history-clear-btn" onClick={handleClearAll}>
              🧹 Xóa {filter === 'all' ? 'tất cả' : 'mục đang lọc'}
            </button>
          )}
        </div>
      </div>

      <div className="history-filter-bar">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={'history-filter-btn' + (filter === item.id ? ' active' : '')}
            onClick={() => setFilter(item.id)}
          >
            {item.label} ({counts[item.id] ?? 0})
          </button>
        ))}
      </div>

      {error && <div className="error-banner" style={{ marginTop: 12 }}>⚠ {error}</div>}

      {loading ? (
        <div className="ws-empty">
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <p>Đang tải và đồng bộ lịch sử ảnh...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="ws-empty history-empty">
          <div className="ws-empty-icon">🗂️</div>
          <p>Chưa có ảnh nào trong mục này. Khi bạn tạo ảnh thẻ hoặc phục hồi ảnh cũ, hệ thống sẽ tự động đồng bộ và lưu trữ tại đây.</p>
          <button type="button" className="btn-secondary" style={{ marginTop: 12 }} onClick={() => load(true)}>
            ↻ Thử đồng bộ lại
          </button>
        </div>
      ) : (
        <div className="history-grid">
          {items.map((item) => (
            <div key={item.id} className="history-card" onClick={() => setPreview(item)}>
              <div className="history-thumb">
                <img src={item.url} alt={item.fileName} loading="lazy" />
                <span className="history-type-badge">{TYPE_LABELS[item.type] || TYPE_LABELS.other}</span>
              </div>
              <div className="history-card-body">
                <span className="history-card-date">{formatDate(item.createdAt)}</span>
                {item.meta?.modelName && <span className="history-card-model">🤖 {item.meta.modelName}</span>}
              </div>
              <div className="history-card-actions">
                <button type="button" className="btn-secondary" onClick={(event) => { event.stopPropagation(); handleDownload(item); }}>
                  ⬇ Tải
                </button>
                {onSendToLayout && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSendToLayout({ url: item.url, size: item.meta?.size, fileName: item.fileName });
                    }}
                  >
                    🖨️ Layout
                  </button>
                )}
                <button type="button" className="history-delete-btn" onClick={(event) => handleDelete(item.id, event)} aria-label="Xóa ảnh này">
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="modal-backdrop" onClick={() => setPreview(null)}>
          <div className="history-preview-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{TYPE_LABELS[preview.type] || TYPE_LABELS.other} • {formatDate(preview.createdAt)}</h3>
              <button className="close-btn" onClick={() => setPreview(null)}>×</button>
            </div>
            <div className="history-preview-body">
              <img src={preview.url} alt={preview.fileName} />
              {preview.meta && (
                <div className="generation-meta" style={{ marginTop: 12 }}>
                  {preview.meta.modelName && <span>🤖 <strong>{preview.meta.modelName}</strong></span>}
                  {preview.meta.ratio && <span>⚙ {preview.meta.ratio} • {preview.meta.resolution}</span>}
                  {preview.meta.durationMs && <span>⏱ {Math.round(preview.meta.durationMs / 1000)}s</span>}
                </div>
              )}
              <div className="modal-actions" style={{ marginTop: 16, justifyContent: 'center', width: '100%' }}>
                <button type="button" className="btn-download-strong" onClick={() => handleDownload(preview)}>⬇ Tải ảnh về máy</button>
                {onSendToLayout && (
                  <button
                    type="button"
                    className="btn-layout-strong"
                    onClick={() => onSendToLayout({ url: preview.url, size: preview.meta?.size, fileName: preview.fileName })}
                  >
                    🖨️ Sắp xếp layout để in
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryGallery;
