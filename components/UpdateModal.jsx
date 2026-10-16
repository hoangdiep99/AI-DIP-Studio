import React from 'react';
import { openUpdateDownload } from '../lib/updateService.js';

export const UpdateModal = ({ updateInfo, checking, onCheckAgain, onClose }) => {
  if (!updateInfo && !checking) return null;

  const isNew = updateInfo?.isUpdateAvailable;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="config-modal-card update-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="update-modal-title">
            <span className="update-rocket-icon">🚀</span>
            <h3>Cập Nhật Phần Mềm</h3>
            <span className="version-pill">v{updateInfo?.currentVersion || '2.0.0'}</span>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body update-modal-body">
          {checking ? (
            <div className="update-checking-state">
              <div className="update-spinner"></div>
              <h4>Đang kết nối GitHub...</h4>
              <p>Kiểm tra thông tin bản phát hành mới nhất từ tác giả hoangdiep99</p>
            </div>
          ) : isNew ? (
            <div className="update-available-state">
              <div className="update-banner-new">
                <span className="update-party-icon">🎉</span>
                <div>
                  <strong>ĐÃ CÓ PHIÊN BẢN MỚI: v{updateInfo.latestVersion}</strong>
                  <p>Phát hành ngày {updateInfo.releaseDate || 'gần đây'}</p>
                </div>
              </div>

              <div className="update-info-card">
                <h4>{updateInfo.title}</h4>
                <div className="update-changelog-box">
                  <strong>Nội dung cập nhật mới:</strong>
                  <pre className="update-changelog-text">{updateInfo.changelog || 'Không có mô tả chi tiết.'}</pre>
                </div>
              </div>

              <div className="modal-actions update-modal-actions">
                <button
                  type="button"
                  className="btn-submit btn-update-download"
                  onClick={() => openUpdateDownload(updateInfo.downloadUrlWindows)}
                >
                  🚀 Tải bản cập nhật mới (.exe)
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
            </div>
          ) : (
            <div className="update-latest-state">
              <div className="update-latest-icon">✓</div>
              <h4>Bạn đang dùng phiên bản mới nhất!</h4>
              <p>
                Phiên bản hiện tại <strong>v{updateInfo?.currentVersion || '2.0.0'}</strong> đã là bản cập nhật mới nhất từ GitHub.
              </p>

              <div className="update-changelog-box" style={{ marginTop: '14px' }}>
                <strong>Tính năng nổi bật trong bản v{updateInfo?.currentVersion || '2.0.0'}:</strong>
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
