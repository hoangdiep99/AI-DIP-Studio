import React from 'react';

const STEPS = [
  {
    id: 1,
    title: 'Tạo tài khoản và kích hoạt',
    items: [
      <>Truy cập vào trang web: <a href="https://aivideoauto.com/?ref=12b6bc19273b3979" target="_blank" rel="noopener noreferrer">AI VIDEO AUTO</a></>,
      'Tiến hành đăng ký một tài khoản mới.',
      'Nạp 50.000 VNĐ để kích hoạt dịch vụ hoặc chọn gói phù hợp trên AI VIDEO AUTO.',
    ],
  },
  {
    id: 2,
    title: 'Lấy mã API Token',
    items: [
      <>Sau khi đăng nhập AI VIDEO AUTO, truy cập trang Cài đặt Token tại: <a href="https://aivideoauto.com/settings/tokens" target="_blank" rel="noopener noreferrer">aivideoauto.com/settings/tokens</a></>,
      'Tạo hoặc Sao chép (Copy) API Key của bạn.',
    ],
  },
  {
    id: 3,
    title: 'Đăng nhập vào phần mềm',
    items: [
      'Trên giao diện app, mở mục ⚙️ Cấu hình API ở góc phải trên cùng.',
      'Chọn mục API Hệ thống / bên thứ ba, nhập endpoint chính là https://api.aivideoauto.com và dán API Token vừa copy.',
      'Nhấn Đăng nhập để hoàn tất kết nối và bắt đầu trải nghiệm.',
    ],
  },
];

const SetupGuide = ({ onTestThanksPopup }) => {
  return (
    <div className="guide-page module-enter">
      <div className="guide-hero">
        <h2>📘 Hướng Dẫn Kết Nối Hệ Thống</h2>
        <p>Để bắt đầu sử dụng đầy đủ các tính năng của công cụ, bạn vui lòng kết nối với hệ thống chính AI VIDEO AUTO theo 3 bước đơn giản sau.</p>
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
          <p>Mã Token là thông tin cá nhân quan trọng. Vui lòng bảo mật tuyệt đối và không chia sẻ cho bất kỳ ai ngoài các bước hướng dẫn trên để bảo vệ tài khoản của bạn.</p>
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
