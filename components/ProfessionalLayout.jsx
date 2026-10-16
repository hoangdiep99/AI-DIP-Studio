import React from 'react';
import config from '../data/config.js';
import { setPngDpi } from '../lib/pngDpi.js';

const DEFAULT_EXPORT_DPI = 300;
const MIN_EXPORT_DPI = 72;
const MAX_EXPORT_DPI = 600;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const loadImage = (src) => new Promise((resolve) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

const ProfessionalLayout = ({ incomingPhoto = null }) => {
  const [photos, setPhotos] = React.useState([]);
  const lastIncomingRef = React.useRef('');
  const fileInputRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const defaultLayoutSize = config.photoSizes.find((p) => p.id === '4x6') || config.photoSizes[0];
  const [paperSize, setPaperSize] = React.useState(config.paperSizes[0]);
  const [photoSize, setPhotoSize] = React.useState(defaultLayoutSize);
  const [autoFill, setAutoFill] = React.useState(true);
  const [gapMm, setGapMm] = React.useState(2);
  const [marginMm, setMarginMm] = React.useState(3);
  const [fitMode, setFitMode] = React.useState('cover');
  const [verticalOffset, setVerticalOffset] = React.useState(15);
  const [dpi, setDpi] = React.useState(DEFAULT_EXPORT_DPI);
  const [exporting, setExporting] = React.useState(false);
  const [exportStatus, setExportStatus] = React.useState('');
  const [exportError, setExportError] = React.useState('');

  const safeDpi = clamp(Number(dpi) || DEFAULT_EXPORT_DPI, MIN_EXPORT_DPI, MAX_EXPORT_DPI);
  const cmToPx = (cm) => Math.round((cm / 2.54) * safeDpi);
  const paperW = cmToPx(paperSize.w);
  const paperH = cmToPx(paperSize.h);
  const gap = cmToPx(gapMm * 0.1);
  const margin = cmToPx(marginMm * 0.1);
  const pixelSummary = `${Math.round(paperW)}×${Math.round(paperH)}px`;

  const handleDpiChange = (value) => {
    const next = clamp(Number(value) || DEFAULT_EXPORT_DPI, MIN_EXPORT_DPI, MAX_EXPORT_DPI);
    setExportError('');
    setExportStatus('');
    setDpi(next);
  };

  const handleFiles = React.useCallback((fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const imageFiles = files.filter((file) => file?.type?.startsWith('image/'));
    if (!imageFiles.length) {
      setExportError('File không hợp lệ. Vui lòng kéo thả hoặc chọn ảnh JPG/PNG/WEBP.');
      setExportStatus('');
      return;
    }

    setExportError('');
    setExportStatus('');
    const now = Date.now();
    const nextPhotos = imageFiles.map((file, index) => ({
      id: `${now}-${index}-${Math.random()}`,
      url: URL.createObjectURL(file),
      size: photoSize,
      fileName: file.name || `photo-${index + 1}`,
    }));
    setPhotos((prev) => [...prev, ...nextPhotos]);
  }, [photoSize]);

  const addPhoto = (event) => {
    handleFiles(event.target.files);
    event.target.value = '';
  };

  const onDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDragging(true);
  };

  const onDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragging(false);
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  React.useEffect(() => {
    if (!incomingPhoto?.url) return;
    const incomingKey = String(incomingPhoto.id || incomingPhoto.receivedAt || incomingPhoto.url);
    if (lastIncomingRef.current === incomingKey) return;
    lastIncomingRef.current = incomingKey;
    setExportError('');
    setExportStatus('');
    const nextSize = incomingPhoto.size || photoSize || defaultLayoutSize;
    setPhotoSize(nextSize);
    setPhotos((prev) => [
      ...prev,
      {
        id: incomingKey,
        url: incomingPhoto.url,
        size: nextSize,
        fileName: incomingPhoto.fileName || 'anh-the-ai-layout.png',
      },
    ]);
  }, [incomingPhoto]);

  const removePhoto = (id) => {
    setExportError('');
    setExportStatus('');
    setPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  const clearPhotos = () => {
    setExportError('');
    setExportStatus('');
    setPhotos([]);
  };

  const changeAllPhotoSize = (newSize) => {
    setPhotoSize(newSize);
    setPhotos((prev) => prev.map((photo) => ({ ...photo, size: newSize })));
  };

  const layoutInfo = React.useMemo(() => {
    const baseSize = photoSize || config.photoSizes[1];
    const itemW = cmToPx(baseSize.w);
    const itemH = cmToPx(baseSize.h);
    const usableW = Math.max(1, paperW - margin * 2);
    const usableH = Math.max(1, paperH - margin * 2);
    const columns = Math.max(1, Math.floor((usableW + gap) / (itemW + gap)));
    const rows = Math.max(1, Math.floor((usableH + gap) / (itemH + gap)));
    const capacity = columns * rows;
    const usedW = columns * itemW + (columns - 1) * gap;
    const usedH = rows * itemH + (rows - 1) * gap;
    const offsetX = margin + Math.max(0, (usableW - usedW) / 2);
    const offsetY = margin + Math.max(0, (usableH - usedH) / 2);
    const coverage = Math.min(100, Math.round((usedW * usedH / (paperW * paperH)) * 100));
    return { itemW, itemH, columns, rows, capacity, usedW, usedH, offsetX, offsetY, coverage };
  }, [photoSize, paperW, paperH, gap, margin, safeDpi]);

  const positions = React.useMemo(() => {
    if (!photos.length) return [];
    const totalSlots = autoFill ? layoutInfo.capacity : Math.min(photos.length, layoutInfo.capacity);
    const output = [];

    for (let index = 0; index < totalSlots; index += 1) {
      const source = photos[index % photos.length];
      const col = index % layoutInfo.columns;
      const row = Math.floor(index / layoutInfo.columns);
      output.push({
        ...source,
        slotId: `${source.id}-slot-${index}`,
        sourceIndex: index % photos.length,
        copyIndex: Math.floor(index / photos.length) + 1,
        x: layoutInfo.offsetX + col * (layoutInfo.itemW + gap),
        y: layoutInfo.offsetY + row * (layoutInfo.itemH + gap),
        w: layoutInfo.itemW,
        h: layoutInfo.itemH,
      });
    }

    return output;
  }, [photos, autoFill, layoutInfo, gap]);

  const previewScale = React.useMemo(() => {
    const maxW = 720;
    const maxH = 900;
    return Math.min(maxW / paperW, maxH / paperH, 1);
  }, [paperW, paperH]);

  const drawImageIntoRect = (ctx, image, x, y, w, h, mode) => {
    if (!image) {
      ctx.save();
      ctx.strokeStyle = '#cbd5e1';
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
      return;
    }

    if (mode === 'contain') {
      const scale = Math.min(w / image.width, h / image.height);
      const dw = image.width * scale;
      const dh = image.height * scale;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.drawImage(image, dx, dy, dw, dh);
      return;
    }

    const scale = Math.max(w / image.width, h / image.height);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (image.width - sw) / 2;
    // Bố cục ảnh thẻ: căn vị trí theo verticalOffset (mặc định 15% để giữ trọn vẹn mái tóc/đỉnh đầu như cỡ 4x6)
    const vFactor = Math.max(0, Math.min(1, (verticalOffset ?? 15) / 100));
    const sy = Math.max(0, Math.min(image.height - sh, (image.height - sh) * vFactor));
    ctx.drawImage(image, sx, sy, sw, sh, x, y, w, h);
  };

  const exportImage = async () => {
    if (!positions.length || exporting) return;
    setExporting(true);
    setExportStatus('');
    setExportError('');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(paperW);
      canvas.height = Math.round(paperH);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const imageCache = new Map();
      for (const position of positions) {
        if (!imageCache.has(position.url)) {
          imageCache.set(position.url, await loadImage(position.url));
        }
        const image = imageCache.get(position.url);
        drawImageIntoRect(ctx, image, position.x, position.y, position.w, position.h, fitMode);

        ctx.save();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 5]);
        ctx.strokeRect(position.x, position.y, position.w, position.h);
        ctx.restore();
      }

      const rawBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 1));
      if (!rawBlob) {
        throw new Error('Không tạo được file PNG. Vui lòng thử lại hoặc giảm số lượng ảnh.');
      }
      // canvas.toBlob() không ghi DPI vào file (luôn đọc ra 96 DPI dù kích thước pixel đã đúng),
      // nên cần chèn thêm chunk pHYs để file PNG mang đúng DPI người dùng đã chọn.
      const blob = await setPngDpi(rawBlob, safeDpi);

      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `layout-${paperSize.id}-${photoSize.id}-${safeDpi}dpi-${positions.length}-anh-${Date.now()}.png`;
      link.href = blobUrl;
      link.rel = 'noopener';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(blobUrl), 2500);
      setExportStatus(`Đã tạo file PNG ${pixelSummary} ở ${safeDpi} DPI. Nếu chưa thấy file, hãy kiểm tra thư mục Downloads hoặc quyền tải xuống của trình duyệt.`);
    } catch (error) {
      setExportError(error.message || 'Xuất file thất bại. Vui lòng thử lại.');
    } finally {
      setExporting(false);
    }
  };

  const fillLabel = autoFill
    ? `${positions.length}/${layoutInfo.capacity} ô — tự phủ kín`
    : `${positions.length}/${layoutInfo.capacity} ô`;

  return (
    <div className="module-enter" style={{ maxWidth: '100%' }}>
      <div className="layout-container layout-pro">
        <div className="control-panel layout-control" style={{ position: 'sticky', top: '96px' }}>
          <div className="panel-section">
            <div className="panel-title">Bố Cục In Ấn Chuyên Nghiệp</div>
            <p className="hint-text" style={{ marginBottom: '14px' }}>
              Tự nhân ảnh, sắp kín khổ giấy và xuất file in sắc nét.
            </p>

            <div
              className={'layout-drop-zone' + (dragging ? ' dragging' : '')}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={addPhoto}
              />
              <div className="layout-drop-icon">{dragging ? '📥' : '🖼️'}</div>
              <p>{dragging ? 'Thả ảnh vào đây để thêm layout' : 'Kéo thả hoặc '}<strong>chọn ảnh</strong></p>
              <span>JPG, PNG, WEBP — có thể chọn/kéo nhiều ảnh cùng lúc</span>
            </div>
          </div>

          <div className="layout-stats">
            <div>
              <span>Sức chứa</span>
              <strong>{layoutInfo.capacity} ảnh</strong>
            </div>
            <div>
              <span>Lưới</span>
              <strong>{layoutInfo.columns}×{layoutInfo.rows}</strong>
            </div>
            <div>
              <span>Phủ giấy</span>
              <strong>{layoutInfo.coverage}%</strong>
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">📄 Khổ giấy</div>
            <div className="option-grid">
              {config.paperSizes.map((paper) => (
                <div key={paper.id} className={"option-card" + (paperSize.id === paper.id ? " selected" : "")} onClick={() => setPaperSize(paper)}>
                  <div className="oc-label">{paper.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">📐 Cỡ ảnh</div>
            <div className="size-grid">
              {config.photoSizes.map((size) => (
                <div key={size.id} className={"size-card" + (photoSize.id === size.id ? " selected" : "")} onClick={() => changeAllPhotoSize(size)}>
                  <div className="size-rect" style={{ width: size.ratioW + 'px', height: size.ratioH + 'px' }}></div>
                  <div className="size-label">{size.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="section-label">⚙️ Tự động sắp xếp</div>
            <div className="toggle-row">
              <div>
                <strong>Tự phủ kín khổ giấy</strong>
                <p className="hint-text">Nếu chỉ có 1 ảnh, app sẽ tự nhân ảnh để lấp đầy 4R/A4.</p>
              </div>
              <button type="button" className={'toggle-switch' + (autoFill ? ' on' : '')} onClick={() => setAutoFill(!autoFill)} aria-label="Bật tự phủ kín giấy" />
            </div>

            <div className="layout-range-row">
              <label>
                Lề giấy <strong>{marginMm}mm</strong>
                <input type="range" min="0" max="12" value={marginMm} onChange={(event) => setMarginMm(Number(event.target.value))} />
              </label>
              <label>
                Khoảng cách <strong>{gapMm}mm</strong>
                <input type="range" min="0" max="8" value={gapMm} onChange={(event) => setGapMm(Number(event.target.value))} />
              </label>
              <label className="layout-dpi-control">
                DPI xuất file <strong>{safeDpi} DPI</strong>
                <input type="range" min={MIN_EXPORT_DPI} max={MAX_EXPORT_DPI} step="1" value={safeDpi} onChange={(event) => handleDpiChange(event.target.value)} />
                <div className="layout-dpi-row">
                  <input
                    type="number"
                    min={MIN_EXPORT_DPI}
                    max={MAX_EXPORT_DPI}
                    step="1"
                    value={safeDpi}
                    onChange={(event) => handleDpiChange(event.target.value)}
                    aria-label="DPI xuất file"
                  />
                  {[96, 150, 300, 500, 600].map((preset) => (
                    <button type="button" key={preset} className={safeDpi === preset ? 'active' : ''} onClick={() => handleDpiChange(preset)}>
                      {preset}
                    </button>
                  ))}
                </div>
                <span className="layout-pixel-hint">Kích thước xuất: {pixelSummary}</span>
              </label>
            </div>

            <div className="layout-fit-row">
              <button type="button" className={fitMode === 'cover' ? 'active' : ''} onClick={() => setFitMode('cover')}>Fill ảnh</button>
              <button type="button" className={fitMode === 'contain' ? 'active' : ''} onClick={() => setFitMode('contain')}>Giữ nguyên ảnh</button>
            </div>

            {fitMode === 'cover' && (
              <div className="layout-vertical-crop">
                <div className="range-header">
                  <span>↕ Vị trí khuôn mặt (Trên / Dưới)</span>
                  <span className="range-val">{verticalOffset}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="1"
                  value={verticalOffset}
                  onChange={(event) => setVerticalOffset(Number(event.target.value))}
                  aria-label="Vị trí trên dưới đồng bộ các ảnh xắp xếp"
                />
                <div className="preset-row">
                  <button
                    type="button"
                    className={'preset-btn' + (verticalOffset === 0 ? ' active' : '')}
                    onClick={() => setVerticalOffset(0)}
                  >
                    Đỉnh đầu cao (0%)
                  </button>
                  <button
                    type="button"
                    className={'preset-btn' + (verticalOffset === 15 ? ' active' : '')}
                    onClick={() => setVerticalOffset(15)}
                  >
                    Chuẩn 4x6 (15%)
                  </button>
                  <button
                    type="button"
                    className={'preset-btn' + (verticalOffset === 30 ? ' active' : '')}
                    onClick={() => setVerticalOffset(30)}
                  >
                    Hạ thấp (30%)
                  </button>
                </div>
                <span className="hint">
                  Đồng bộ vị trí trên/dưới cho tất cả ảnh 3x4, 2x3, 3.5x4.5 để giữ trọn đỉnh đầu & mái tóc như cỡ 4x6.
                </span>
              </div>
            )}
          </div>

          {photos.length > 0 && (
            <div className="panel-section">
              <div className="section-label">📋 {photos.length} ảnh gốc</div>
              <div className="layout-photos-grid">
                {photos.map((photo) => (
                  <div key={photo.id} className="layout-thumb">
                    <img src={photo.url} alt={photo.fileName || 'Ảnh layout'} />
                    <span className="badge">{photo.size.label}</span>
                    <button className="remove-btn" onClick={() => removePhoto(photo.id)} aria-label="Xóa ảnh">✕</button>
                  </div>
                ))}
              </div>

              <div className="layout-actions-stack">
                <select className="btn-secondary" value={photoSize.id} onChange={(event) => {
                  const nextSize = config.photoSizes.find((size) => size.id === event.target.value);
                  if (nextSize) changeAllPhotoSize(nextSize);
                }}>
                  {config.photoSizes.map((size) => <option key={size.id} value={size.id}>Đổi tất cả sang {size.label}cm</option>)}
                </select>
                <button type="button" className="btn-secondary" onClick={clearPhotos}>🧹 Xóa tất cả ảnh</button>
              </div>
            </div>
          )}

          {photos.length > 0 && (
            <div className="layout-export-hint">
              <span>⬇ Nút tải xuống đã được đặt ngay dưới ảnh preview để bấm tiện hơn.</span>
            </div>
          )}
        </div>

        <div
          className={'workspace layout-workspace' + (dragging ? ' layout-drop-active' : '')}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="ws-toolbar">
            <h3>Preview Layout — {paperSize.label}</h3>
            <span className="info-badge">{fillLabel} • {safeDpi} DPI • {pixelSummary}</span>
          </div>
          <div className="ws-content layout-preview-scroll">
            {photos.length === 0 ? (
              <div className={'layout-empty-drop' + (dragging ? ' dragging' : '')} onClick={() => fileInputRef.current?.click()}>
                <div className="layout-empty-icon">🖨️</div>
                <strong>Kéo thả ảnh vào đây</strong>
                <p>Hoặc bấm để chọn ảnh — app sẽ tự sắp xếp kín khổ giấy</p>
              </div>
            ) : (
              <div className="layout-result-stack">
                <div
                  className="layout-paper layout-paper-pro"
                  style={{
                    width: paperW * previewScale,
                    height: paperH * previewScale,
                    position: 'relative',
                  }}
                >
                  {positions.map((position) => (
                    <div
                      key={position.slotId}
                      className="layout-photo layout-photo-pro"
                      style={{
                        left: position.x * previewScale,
                        top: position.y * previewScale,
                        width: position.w * previewScale,
                        height: position.h * previewScale,
                      }}
                    >
                      <img
                        src={position.url}
                        alt=""
                        style={{
                          objectFit: fitMode,
                          objectPosition: fitMode === 'cover' ? `50% ${verticalOffset}%` : 'center center',
                        }}
                        loading="lazy"
                        decoding="async"
                      />
                      {position.copyIndex > 1 && <span className="layout-copy-badge">#{position.copyIndex}</span>}
                    </div>
                  ))}
                </div>

                <button className="btn-primary layout-download-btn" onClick={exportImage} disabled={exporting}>
                  {exporting ? '⏳ Đang xuất file...' : `⬇ Tải xuống ${positions.length} ảnh • ${paperSize.id} • ${safeDpi} DPI`}
                </button>
                {exportStatus && <div className="layout-export-status success">✅ {exportStatus}</div>}
                {exportError && <div className="layout-export-status error">⚠ {exportError}</div>}
              </div>
            )}
          </div>
          {photos.length === 0 && exportError && <div className="layout-preview-error">⚠ {exportError}</div>}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalLayout;