import React, { useState, useRef, useEffect } from 'react';

/**
 * CropModal - Khung canh thước & crop ảnh chuẩn Studio
 * Hỗ trợ:
 * - Tỉ lệ chuẩn ảnh thẻ (4:6, 3:4, 2:3, 3.5:4.5, 1:1)
 * - Di chuyển (Pan), Thu phóng (Zoom 1x-3x), Xoay nắn góc nghiêng (-20° đến +20°)
 * - Thước gióng tỉ lệ chuẩn Studio: Đỉnh đầu (12%), Trục mắt (42%), Cằm (72%), Trục giữa (50%)
 * - Xuất Canvas độ phân giải cao, khớp 100% chuẩn xác với khung nhìn người dùng thấy
 */
const RATIOS = [
  { id: '4:6', label: '4×6 cm (2:3)', ratio: 4 / 6, w: 1200, h: 1800 },
  { id: '3:4', label: '3×4 cm', ratio: 3 / 4, w: 1200, h: 1600 },
  { id: '2:3', label: '2×3 cm', ratio: 2 / 3, w: 1000, h: 1500 },
  { id: '3.5:4.5', label: '3.5×4.5 cm (Visa/Hộ chiếu)', ratio: 3.5 / 4.5, w: 1200, h: 1543 },
  { id: '1:1', label: '1×1 (Vuông)', ratio: 1, w: 1500, h: 1500 },
];

const CropModal = ({ imageUrl, initialRatio = '4:6', onConfirm, onCancel }) => {
  const [selectedRatioId, setSelectedRatioId] = useState(initialRatio);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGuides, setShowGuides] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);

  const currentRatioObj = RATIOS.find((r) => r.id === selectedRatioId) || RATIOS[0];
  const viewH = 380;
  const viewW = Math.round(viewH * currentRatioObj.ratio);

  // Cập nhật kích thước ảnh gốc khi tải xong
  const handleImageLoad = (e) => {
    const nw = e.target.naturalWidth || e.target.width;
    const nh = e.target.naturalHeight || e.target.height;
    if (nw && nh) {
      setImgSize({ w: nw, h: nh });
      setImgLoaded(true);
    }
  };

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth) {
      setImgSize({
        w: imgRef.current.naturalWidth,
        h: imgRef.current.naturalHeight,
      });
      setImgLoaded(true);
    }
  }, [imageUrl]);

  // baseScale để ảnh ban đầu phủ kín (cover) khung crop viewport
  const baseScale = (imgSize.w > 0 && imgSize.h > 0)
    ? Math.max(viewW / imgSize.w, viewH / imgSize.h)
    : 1;

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Kéo chuột mượt mà ngay cả khi chuột di chuyển ra ngoài viền khung
  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e) => {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const onMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(0.5, prev + delta), 3.5));
  };

  const handleApply = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const nw = img.naturalWidth || img.width;
    const nh = img.naturalHeight || img.height;
    if (!nw || !nh) return;

    const targetW = currentRatioObj.w;
    const targetH = currentRatioObj.h;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Tỉ lệ scale giữa kích thước xuất canvas và viewport trên màn hình
    const scaleFactor = targetW / viewW;

    ctx.save();
    // Di chuyển về tâm canvas + offset dịch chuyển đồng bộ tỉ lệ thực
    ctx.translate(targetW / 2 + pan.x * scaleFactor, targetH / 2 + pan.y * scaleFactor);
    ctx.rotate((rotation * Math.PI) / 180);

    // finalScale trên Canvas khớp 100% tỉ lệ hiển thị (baseScale * zoom * scaleFactor)
    const finalScale = baseScale * zoom * scaleFactor;
    ctx.scale(finalScale, finalScale);
    ctx.drawImage(img, -nw / 2, -nh / 2, nw, nh);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/png', 0.98);
    onConfirm(croppedDataUrl, currentRatioObj);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel} style={{ zIndex: 9999 }}>
      <div
        className="config-modal-card crop-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 680, width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <h3>📐 Khung Canh Thước & Cắt Ảnh Studio</h3>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          {/* Tỉ lệ chọn */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim)' }}>Khổ ảnh:</span>
            {RATIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={'history-filter-btn' + (selectedRatioId === item.id ? ' active' : '')}
                onClick={() => {
                  setSelectedRatioId(item.id);
                  setPan({ x: 0, y: 0 });
                }}
                style={{ padding: '6px 12px', fontSize: 12 }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Vùng xem trước & tương tác Crop */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 400,
              background: '#090a0f',
              borderRadius: 12,
              border: '2px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Viewport Frame */}
            <div
              ref={containerRef}
              style={{
                position: 'relative',
                width: viewW,
                height: viewH,
                maxHeight: viewH,
                maxWidth: '92%',
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.72)',
                border: '2px solid var(--accent, #6366f1)',
                overflow: 'hidden',
                borderRadius: 4,
              }}
            >
              {/* Ảnh gốc với transform đồng bộ chuẩn baseScale, pan, zoom, rotation */}
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                onLoad={handleImageLoad}
                draggable={false}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) rotate(${rotation}deg) scale(${baseScale * zoom})`,
                  transformOrigin: 'center center',
                  pointerEvents: 'none',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  userSelect: 'none',
                  transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                }}
              />

              {/* Thước gióng chuẩn thẻ Studio (Overlay) */}
              {showGuides && (
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {/* Đường đỉnh tóc ~ 12% */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12%',
                      left: 0,
                      right: 0,
                      borderTop: '1px dashed #fbbf24',
                      opacity: 0.85,
                    }}
                  >
                    <span style={{ position: 'absolute', right: 4, top: -14, fontSize: 10, color: '#fbbf24', fontWeight: 700 }}>
                      Đỉnh tóc (12%)
                    </span>
                  </div>

                  {/* Đường trục mắt ~ 42% */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '42%',
                      left: 0,
                      right: 0,
                      borderTop: '1px dashed #38bdf8',
                      opacity: 0.85,
                    }}
                  >
                    <span style={{ position: 'absolute', right: 4, top: -14, fontSize: 10, color: '#38bdf8', fontWeight: 700 }}>
                      Mắt (42%)
                    </span>
                  </div>

                  {/* Đường cằm ~ 72% */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '72%',
                      left: 0,
                      right: 0,
                      borderTop: '1px dashed #34d399',
                      opacity: 0.85,
                    }}
                  >
                    <span style={{ position: 'absolute', right: 4, top: -14, fontSize: 10, color: '#34d399', fontWeight: 700 }}>
                      Cằm (72%)
                    </span>
                  </div>

                  {/* Trục giữa đối xứng mặt 50% */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: '50%',
                      borderLeft: '1px dashed rgba(255,255,255,0.4)',
                    }}
                  />

                  {/* Vùng oval mặt mờ */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12%',
                      left: '18%',
                      right: '18%',
                      bottom: '28%',
                      borderRadius: '50% / 60%',
                      border: '1px dotted rgba(255,255,255,0.25)',
                    }}
                  />
                </div>
              )}
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 12,
                fontSize: 11,
                color: 'rgba(255,255,255,0.6)',
                pointerEvents: 'none',
              }}
            >
              💡 Kéo chuột để di chuyển • Cuộn chuột để phóng to/thu nhỏ
            </div>
          </div>

          {/* Thanh công cụ điều khiển */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: '4px 0' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <label>🔍 Phóng to / Thu nhỏ:</label>
                <strong>{Math.round(zoom * 100)}%</strong>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <label>🔄 Xoay góc nghiêng vai/đầu:</label>
                <strong>{rotation}°</strong>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="0.5"
                value={rotation}
                onChange={(e) => setRotation(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
            </div>
          </div>

          {/* Nút bật tắt thước gióng & reset */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(e) => setShowGuides(e.target.checked)}
              />
              <span>📐 Hiện thước canh Studio (Đỉnh đầu - Mắt - Cằm)</span>
            </label>

            <button type="button" className="btn-secondary" onClick={handleReset} style={{ padding: '6px 12px', fontSize: 12 }}>
              ↺ Đặt lại vị trí ban đầu
            </button>
          </div>

          {/* Modal Actions */}
          <div className="modal-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Hủy
            </button>
            <button type="button" className="btn-submit" onClick={handleApply}>
              ✓ Cắt & Áp Dụng Ảnh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropModal;
