import React, { useState, useRef, useCallback } from 'react';
import config from '../data/config.js';
import { downloadMediaFile, fileToBlobUrl, fileToBase64 } from '../lib/api.js';
import { generatePhoto } from '../lib/generate.js';
import { buildIdPhotoPrompt } from '../lib/promptBuilder.js';
import { getDefaultMediaSettings, findPreferredDefaultModel, PREFERRED_ID_PHOTO_SETTINGS } from '../lib/modelCatalog.js';
import { addHistoryItem } from '../lib/history.js';
import { OutfitVisual } from './StudioVisualIcons.jsx';

const DEFAULT_SIZE = config.photoSizes.find((item) => item.id === '4x6') || config.photoSizes[0];

const BatchIdPhotoGenerator = ({ models = [], onSendToLayout }) => {
  const [queue, setQueue] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [selectedBg, setSelectedBg] = useState(config.backgrounds[0]);
  const [selectedOutfit, setSelectedOutfit] = useState(config.outfits[0]);
  const [selectedSize, setSelectedSize] = useState(DEFAULT_SIZE);
  const [genderMode, setGenderMode] = useState('auto'); // 'auto' | 'male' | 'female'
  const [retouch, setRetouch] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [batchError, setBatchError] = useState('');

  const stopRequestedRef = useRef(false);
  const inputRef = useRef(null);

  const defaultModel = findPreferredDefaultModel(models);
  const [selectedModel, setSelectedModel] = useState(defaultModel);

  React.useEffect(() => {
    if (Array.isArray(models) && models.length > 0 && !selectedModel) {
      setSelectedModel(findPreferredDefaultModel(models));
    }
  }, [models, selectedModel]);

  const handleFiles = async (files) => {
    if (!files || files.length === 0) return;
    const newItems = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const url = fileToBlobUrl(file);
        const base64 = await fileToBase64(file);
        newItems.push({
          id: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file,
          fileName: file.name,
          url,
          base64,
          status: 'pending', // 'pending' | 'processing' | 'done' | 'error'
          resultUrl: null,
          error: null,
        });
      } catch (e) {
        console.warn('Lỗi đọc file:', file.name, e);
      }
    }
    setQueue((prev) => [...prev, ...newItems]);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleRemoveItem = (id) => {
    if (isRunning) return;
    setQueue((prev) => prev.filter((it) => it.id !== id));
  };

  const handleClearAll = () => {
    if (isRunning) return;
    setQueue([]);
    setCurrentIndex(-1);
    setBatchError('');
  };

  const runBatch = async () => {
    if (queue.length === 0 || isRunning) return;
    setIsRunning(true);
    stopRequestedRef.current = false;
    setBatchError('');

    const currentModel = selectedModel || findPreferredDefaultModel(models);
    const modelSettings = getDefaultMediaSettings(currentModel, { ...PREFERRED_ID_PHOTO_SETTINGS });

    for (let i = 0; i < queue.length; i++) {
      if (stopRequestedRef.current) break;
      const item = queue[i];
      if (item.status === 'done') continue; // Bỏ qua ảnh đã tạo xong

      setCurrentIndex(i);
      setQueue((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'processing', error: null } : it))
      );

      try {
        let genderObj = config.genders?.[0] || { id: 'male', label: 'Nam' };
        if (genderMode === 'female') {
          genderObj = config.genders?.[1] || { id: 'female', label: 'Nữ' };
        } else if (genderMode === 'auto') {
          // Thử đoán qua tên file nếu có chứa 'nu', 'female', 'chi', 'co', 'ba'
          const lowerName = item.fileName.toLowerCase();
          if (/nu|female|chi|co|ba|girl|women/.test(lowerName)) {
            genderObj = { id: 'female', label: 'Nữ' };
          } else {
            genderObj = { id: 'male', label: 'Nam' };
          }
        }

        const prompt = buildIdPhotoPrompt({
          background: selectedBg,
          outfit: selectedOutfit,
          size: selectedSize,
          retouchLevel: retouch,
          gender: genderObj,
          hairStyle: null,
          beautyOptions: [],
          extraRequest: '',
        });

        const resUrl = await generatePhoto({
          prompt,
          base64Image: item.base64,
          selectedModel: currentModel,
          settings: modelSettings,
          mimeType: item.file?.type || 'image/jpeg',
        });

        if (stopRequestedRef.current) break;

        const outFileName = `the-${item.fileName.replace(/\.[^/.]+$/, '')}-${selectedSize.id}.png`;

        // Tự động lưu vào thư mục AppData Lịch Sử Ảnh
        addHistoryItem({
          type: 'id-photo',
          url: resUrl,
          meta: {
            modelName: currentModel?.name || 'AI Model',
            size: selectedSize,
            batch: true,
          },
          fileName: outFileName,
        });

        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? { ...it, status: 'done', resultUrl: resUrl, outFileName }
              : it
          )
        );
      } catch (err) {
        if (stopRequestedRef.current) break;
        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? { ...it, status: 'error', error: err.message || 'Lỗi xử lý ảnh' }
              : it
          )
        );
      }
    }

    setIsRunning(false);
    setCurrentIndex(-1);
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    setIsRunning(false);
  };

  const handleDownloadAll = async () => {
    const doneItems = queue.filter((it) => it.status === 'done' && it.resultUrl);
    for (const it of doneItems) {
      try {
        await downloadMediaFile(it.resultUrl, it.outFileName || `anh-the-${it.id}.png`);
      } catch (e) {
        console.warn('Lỗi tải ảnh:', it.fileName);
      }
    }
  };

  const handleOpenFolder = async () => {
    try {
      if (window.electronDisk?.openHistoryFolder) {
        await window.electronDisk.openHistoryFolder();
      }
    } catch (e) {}
  };

  const doneCount = queue.filter((it) => it.status === 'done').length;
  const progressPercent = queue.length > 0 ? Math.round((doneCount / queue.length) * 100) : 0;

  return (
    <div className="batch-generator-view module-enter">
      {/* Cấu hình chung cho cả lô ảnh */}
      <div className="panel-section" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>👥 Xử Lý Ảnh Thẻ Hàng Loạt</h3>
            <p className="hint-text" style={{ marginTop: 4 }}>
              Kéo thả danh sách ảnh (học sinh, nhân viên công ty...) để AI tự động làm ảnh thẻ đồng bộ theo lô.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {window.electronDisk?.openHistoryFolder && (
              <button type="button" className="btn-secondary" onClick={handleOpenFolder} title="Mở thư mục lưu file ảnh trên máy tính">
                📂 Mở thư mục ảnh
              </button>
            )}
            {doneCount > 0 && (
              <button type="button" className="btn-submit" onClick={handleDownloadAll}>
                ⬇️ Tải tất cả ({doneCount} ảnh)
              </button>
            )}
          </div>
        </div>

        {/* Thanh chọn cấu hình nhanh */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
          {/* Trang phục */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>
              👔 Trang phục áp dụng:
            </label>
            <select
              value={selectedOutfit.id}
              onChange={(e) => setSelectedOutfit(config.outfits.find((o) => o.id === e.target.value) || config.outfits[0])}
              disabled={isRunning}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {config.outfits.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Phông nền */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>
              🎨 Phông nền:
            </label>
            <select
              value={selectedBg.id}
              onChange={(e) => setSelectedBg(config.backgrounds.find((b) => b.id === e.target.value) || config.backgrounds[0])}
              disabled={isRunning}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {config.backgrounds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kích thước */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>
              📐 Kích thước thẻ:
            </label>
            <select
              value={selectedSize.id}
              onChange={(e) => setSelectedSize(config.photoSizes.find((s) => s.id === e.target.value) || DEFAULT_SIZE)}
              disabled={isRunning}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {config.photoSizes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({s.desc})
                </option>
              ))}
            </select>
          </div>

          {/* Giới tính */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>
              👤 Giới tính:
            </label>
            <select
              value={genderMode}
              onChange={(e) => setGenderMode(e.target.value)}
              disabled={isRunning}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              <option value="auto">🤖 Tự động phát hiện theo tên/khuôn mặt</option>
              <option value="male">Nam (Ưu tiên Sơ mi/Vest nam)</option>
              <option value="female">Nữ (Ưu tiên Sơ mi/Áo dài nữ)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Khu vực Upload nhiều file */}
      <div
        className={'uploader-zone' + (dragging ? ' dragging' : '')}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{ padding: '24px 16px', marginBottom: 18 }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        <div className="uploader-icon">📁</div>
        <p>Kéo thả nhiều ảnh cùng lúc hoặc <strong>bấm vào đây để chọn danh sách ảnh</strong></p>
        <p className="hint-text" style={{ marginTop: 4 }}>
          Hỗ trợ chọn 5, 10, 20 hoặc 50 ảnh thẻ JPG, PNG
        </p>
      </div>

      {/* Tiến trình xử lý (Progress Bar) */}
      {queue.length > 0 && (
        <div style={{ marginBottom: 18, background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>
              Tiến trình: {doneCount}/{queue.length} ảnh ({progressPercent}%)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {!isRunning ? (
                <button
                  type="button"
                  className="btn-submit"
                  onClick={runBatch}
                  disabled={queue.length === 0}
                  style={{ padding: '8px 16px' }}
                >
                  🚀 Bắt đầu tạo hàng loạt ({queue.length - doneCount} ảnh)
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={handleStop}
                  style={{ padding: '8px 16px', background: '#dc2626', color: '#fff' }}
                >
                  ⏹️ Tạm dừng
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={handleClearAll}
                disabled={isRunning}
                style={{ padding: '8px 14px' }}
              >
                🧹 Xóa danh sách
              </button>
            </div>
          </div>

          {/* Thanh progress */}
          <div style={{ width: '100%', height: 10, background: 'var(--bg-elevated)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #38bdf8)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Danh sách Hàng đợi chi tiết */}
      {queue.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {queue.map((item, index) => {
            const isCurrent = isRunning && index === currentIndex;
            return (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 10,
                  borderRadius: 10,
                  background: isCurrent ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-surface)',
                  border: isCurrent ? '1px solid var(--accent)' : '1px solid var(--border)',
                  position: 'relative',
                }}
              >
                {/* Ảnh gốc */}
                <div style={{ width: 54, height: 72, borderRadius: 6, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                  <img src={item.url} alt="gốc" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>

                {/* Mũi tên chuyển đổi */}
                <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>➔</span>

                {/* Kết quả hoặc trạng thái */}
                <div style={{ width: 54, height: 72, borderRadius: 6, overflow: 'hidden', background: 'var(--bg-elevated)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.status === 'done' && item.resultUrl ? (
                    <img src={item.resultUrl} alt="kết quả" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : item.status === 'processing' ? (
                    <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                  ) : item.status === 'error' ? (
                    <span style={{ color: '#ef4444', fontSize: 20 }}>✕</span>
                  ) : (
                    <span style={{ color: 'var(--text-dim)', fontSize: 18 }}>⏳</span>
                  )}
                </div>

                {/* Thông tin & nút tải */}
                <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                  <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }} title={item.fileName}>
                    {item.fileName}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {item.status === 'pending' && <span style={{ color: 'var(--text-dim)' }}>⏳ Đang chờ</span>}
                    {item.status === 'processing' && <span style={{ color: 'var(--accent)', fontWeight: 700 }}>⚡ Đang xử lý...</span>}
                    {item.status === 'done' && <span style={{ color: '#22c55e', fontWeight: 700 }}>✓ Xong</span>}
                    {item.status === 'error' && <span style={{ color: '#ef4444', fontWeight: 700 }} title={item.error}>✕ Thất bại</span>}
                  </div>
                  {item.status === 'done' && item.resultUrl && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => downloadMediaFile(item.resultUrl, item.outFileName || `anh-the-${item.id}.png`)}
                        style={{ padding: '3px 8px', fontSize: 11 }}
                      >
                        ⬇ Tải
                      </button>
                      {onSendToLayout && (
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => onSendToLayout({ url: item.resultUrl, size: selectedSize, fileName: item.outFileName })}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          🖨️ In
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Nút xóa item khỏi hàng đợi */}
                {!isRunning && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    style={{ position: 'absolute', top: 4, right: 6, background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14 }}
                    title="Xóa khỏi danh sách"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BatchIdPhotoGenerator;
