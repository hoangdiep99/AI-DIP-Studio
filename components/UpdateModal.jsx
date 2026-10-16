import React, { useState, useEffect } from 'react';
import { openUpdateDownload, CURRENT_VERSION } from '../lib/updateService.js';

export const UpdateModal = ({ updateInfo, checking, onCheckAgain, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    percent: 0,
    downloadedMb: '0',
    totalMb: '0',
    speed: '0 MB/s',
    done: false,
    filePath: '',
  });
  const [downloadError, setDownloadError] = useState('');
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (window.electronUpdater?.onDownloadProgress) {
      const cleanup = window.electronUpdater.onDownloadProgress((data) => {
        setDownloadProgress(data);
        if (data.done && data.filePath) {
          setDownloading(false);
        }
      });
      return cleanup;
    }
  }, []);

  if (!updateInfo && !checking) return null;

  const isNew = updateInfo?.isUpdateAvailable;
  const isElectronAvailable = typeof window !== 'undefined' && !!window.electronUpdater?.startDownload;

  const handleStartInAppUpdate = async () => {
    if (!isElectronAvailable) {
      // Fallback mở link nếu chạy trên trình duyệt web thông thường
      openUpdateDownload(updateInfo?.downloadUrlWindows);
      return;
    }

    setDownloading(true);
    setDownloadError('');
    setDownloadProgress({
      percent: 0,
      downloadedMb: '0',
      totalMb: '0',
      speed: '0 MB/s',
      done: false,
      filePath: '',
    });

    try {
      const res = await window.electronUpdater.startDownload(updateInfo?.downloadUrlWindows);
      if (!res.success) {
        setDownloadError(res.error || 'Lỗi trong quá trình tải bản cập nhật');
        setDownloading(false);
      }
    } catch (err) {
      setDownloadError(err.message || 'Không thể kết nối tải bản cập nhật');
      setDownloading(false);
    }
  };

  const handleTriggerInstall = async () => {
    if (!downloadProgress.filePath) return;
    setInstalling(true);
    try {
      await window.electronUpdater.installUpdate(downloadProgress.filePath);
    } catch (err) {
      setDownloadError(err.message || 'Lỗi khởi chạy bộ cài đặt');
      setInstalling(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={downloading ? undefined : onClose}>
      <div className="config-modal-card update-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="update-modal-title">
            <span className="update-rocket-icon">🚀</span>
            <h3>Cập Nhật Phần Mềm</h3>
            <span className="version-pill">v{updateInfo?.currentVersion || CURRENT_VERSION}</span>
          </div>
          {!downloading && <button className="close-btn" onClick={onClose}>×</button>}
        </div>

        <div className="modal-body update-modal-body">
          {checking ? (
            <div className="update-checking-state">
              <div className="update-spinner"></div>
              <h4>Đang kết nối GitHub...</h4>
              <p>Kiểm tra phiên bản phát hành mới nhất từ repo tác giả</p>
            </div>
          ) : isNew ? (
            <div className="update-available-state">
              <div className="update-banner-new">
                <span className="update-party-icon">🎉</span>
                <div>
                  <strong>ĐÃ CÓ PHIÊN BẢN MỚI: v{updateInfo.latestVersion}</strong>
                  <p>Phát hành ngày {updateInfo.releaseDate || 'gần đây'} • Tải & Cài đặt tự động 1-Click</p>
                </div>
              </div>

              {/* KHỐI HIỂN THỊ TIẾN TRÌNH TẢI XUỐNG TRONG APP */}
              {(downloading || downloadProgress.done) && (
                <div className="update-download-card">
                  <div className="update-progress-header">
                    <span className="update-download-status">
                      {downloadProgress.done ? '✓ Đã tải xong bộ cài đặt mới!' : '⏳ Đang tải bản cập nhật vào máy...'}
                    </span>
                    <span className="update-progress-percent">{downloadProgress.percent}%</span>
                  </div>

                  <div className="update-progress-bar-bg">
                    <div
                      className={`update-progress-bar-fill ${downloadProgress.done ? 'done' : ''}`}
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>

                  <div className="update-progress-meta">
                    <span>{downloadProgress.downloadedMb} MB / {downloadProgress.totalMb} MB</span>
                    <span>⚡ Tốc độ: {downloadProgress.speed}</span>
                  </div>

                  {downloadProgress.done && (
                    <div className="update-ready-box">
                      <p>✨ Bản cài đặt đã sẵn sàng. Nhấn nút bên dưới để cập nhật và khởi động lại ứng dụng:</p>
                      <button
                        type="button"
                        className="btn-submit btn-install-now"
                        onClick={handleTriggerInstall}
                        disabled={installing}
                      >
                        {installing ? '⏳ Đang khởi chạy...' : '⚡ Cài Đặt & Khởi Động Lại Ngay'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {downloadError && (
                <div className="error-banner update-error-banner">
                  <span>⚠ {downloadError}</span>
                  <button type="button" className="btn-retry-link" onClick={handleStartInAppUpdate}>
                    Thử lại
                  </button>
                </div>
              )}

              <div className="update-info-card">
                <h4>{updateInfo.title}</h4>
                <div className="update-changelog-box">
                  <strong>Nội dung cập nhật mới:</strong>
                  <pre className="update-changelog-text">{updateInfo.changelog || 'Không có mô tả chi tiết.'}</pre>
                </div>
              </div>

              {!downloading && !downloadProgress.done && (
                <div className="modal-actions update-modal-actions">
                  <button
                    type="button"
                    className="btn-submit btn-update-download"
                    onClick={handleStartInAppUpdate}
                  >
                    🚀 Cập Nhật Tự Động (1-Click)
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => openUpdateDownload(updateInfo.githubRepo)}
                  >
                    🌐 Xem trên GitHub
                  </button>
                  <button type="button" className="btn-cancel" onClick={onClose}>
                    Để sau
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="update-latest-state">
              <div className="update-latest-icon">✓</div>
              <h4>Bạn đang dùng phiên bản mới nhất!</h4>
              <p>
                Phiên bản hiện tại <strong>v{updateInfo?.currentVersion || CURRENT_VERSION}</strong> đã là bản cập nhật mới nhất từ GitHub.
              </p>

              <div className="update-changelog-box" style={{ marginTop: '14px' }}>
                <strong>Tính năng nổi bật trong bản v{updateInfo?.currentVersion || CURRENT_VERSION}:</strong>
                <pre className="update-changelog-text">{updateInfo?.changelog || 'Các tính năng tạo ảnh thẻ AI, phục hồi ảnh cũ và layout in ấn.'}</pre>
              </div>

              <div className="modal-actions update-modal-actions">
                <button type="button" className="btn-secondary" onClick={onCheckAgain} disabled={checking}>
                  ↻ Kiểm tra lại
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => openUpdateDownload(updateInfo?.githubRepo)}
                >
                  🌐 Kho GitHub
                </button>
                <button type="button" className="btn-submit" onClick={onClose}>
                  Đã hiểu
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
