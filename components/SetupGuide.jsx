import React from 'react';

const STEPS = [
  {
    id: 1,
    title: 'Tạo tài khoản và kích hoạt',
    items: [
      <>Truy cập vào trang web: <a href="https://omnivi.ai/vi" target="_blank" rel="noopener noreferrer">OMNIVI.AI</a></>,
      'Tiến hành đăng ký hoặc đăng nhập tài khoản (tài khoản và số dư từ AI VIDEO AUTO cũ đã được chuyển sang tự động).',
      'Nạp tiền hoặc chọn gói dịch vụ phù hợp trên OmniVi.AI để sử dụng.',
    ],
  },
  {
    id: 2,
    title: 'Lấy mã API Key (Token)',
    items: [
      <>Sau khi đăng nhập OmniVi.AI, truy cập mục Cài đặt Tài khoản tại: <a href="https://omnivi.ai/vi/account" target="_blank" rel="noopener noreferrer">omnivi.ai/vi/account</a></>,
      'Mở thẻ API, tạo hoặc sao chép (Copy) API Key của bạn.',
    ],
  },
  {
    id: 3,
    title: 'Đăng nhập vào phần mềm',
    items: [
      'Trên giao diện app, mở mục ⚙️ Cấu hình API ở góc phải trên cùng.',
      'Chọn mục API Hệ thống, kiểm tra endpoint chính là https://omnivi.ai/api/v2 (mặc định) và dán API Key vừa copy.',
      'Nhấn Đăng nhập để hoàn tất kết nối và bắt đầu tạo ảnh ngay.',
    ],
  },
];

const SetupGuide = ({ onTestThanksPopup }) => {
  return (
    <div className="guide-page module-enter">
      <div className="guide-hero">
        <h2>📘 Hướng Dẫn Kết Nối Hệ Thống OmniVi.AI</h2>
        <p>Để bắt đầu sử dụng đầy đủ các tính năng tạo ảnh thẻ AI và phục hồi ảnh, bạn vui lòng kết nối với hệ thống OmniVi.AI theo 3 bước đơn giản sau.</p>
      </div>

      <div className="guide-steps">
        {STEPS.map((step) => (
          <div key={step.id} className="guide-step-card">
            <div className="guide-step-number">{step.id}</div>
            <div className="guide-step-body">
              <h3>Bước {step.id}: {step.title}</h3>
              <ul>
                {step.items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="guide-warning">
        <span className="guide-warning-icon">⚠️</span>
        <div>
          <strong>Lưu ý bảo mật</strong>
          <p>Mã API Key là thông tin cá nhân quan trọng. Vui lòng bảo mật tuyệt đối và không chia sẻ cho bất kỳ ai ngoài các bước hướng dẫn trên để bảo vệ số dư tài khoản của bạn.</p>
        </div>
      </div>

      {onTestThanksPopup && (
        <div className="guide-test-thanks-row">
          <button type="button" className="btn-secondary" onClick={onTestThanksPopup}>
            💛 Lời cảm ơn (test popup)
          </button>
        </div>
      )}
    </div>
  );
};

export default SetupGuide;
