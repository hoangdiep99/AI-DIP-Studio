import React from 'react';
import { fileToBlobUrl, fileToBase64 } from '../lib/api.js';

const ImageUploader = ({ onUpload, uploaded, label, hint, onError }) => {
  const inputRef = React.useRef(null);
  const [dragging, setDragging] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      if (onError) onError('File không hợp lệ. Vui lòng chọn ảnh JPG hoặc PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      if (onError) onError(`Ảnh quá lớn (${(file.size / 1024 / 1024).toFixed(1)}MB). Tối đa 10MB.`);
      return;
    }
    setProcessing(true);
    try {
      const url = fileToBlobUrl(file);
      const base64 = await fileToBase64(file);
      onUpload({ url, base64, file });
    } catch (e) {
      if (onError) onError(e.message || 'Lỗi khi xử lý ảnh. Vui lòng thử lại.');
    } finally {
      setProcessing(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFile(file).catch(() => {});
  };

  if (uploaded) {
    return (
      <div className="uploaded-preview">
        <img src={uploaded.url} alt="Uploaded" />
        <button className="remove-btn" onClick={() => onUpload(null)}>✕</button>
      </div>
    );
  }

  return (
    <div
      className={"uploader-zone" + (dragging ? " dragging" : "")}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        onChange={(e) => { handleFile(e.target.files[0]).catch(() => {}); e.target.value = ''; }}
      />
      <div className="uploader-icon">{processing ? '⏳' : '📷'}</div>
      <p>{processing ? 'Đang xử lý ảnh...' : (label || 'Kéo thả hoặc ')}{!processing && <strong>chọn ảnh</strong>}</p>
      {hint && !processing && <p className="hint-text" style={{ marginTop: '6px' }}>{hint}</p>}
    </div>
  );
};

export default ImageUploader;