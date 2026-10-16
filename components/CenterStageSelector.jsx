import React from 'react';
import config from '../data/config.js';
import ModelPicker from './ModelPicker.jsx';
import { OutfitVisual, HairVisual } from './StudioVisualIcons.jsx';

const SECTION_TABS = [
  { id: 'outfit', icon: '👔', label: 'Trang phục studio', badge: '12 mẫu' },
  { id: 'hair', icon: '💇', label: 'Kiểu tóc chân dung', badge: '11 mẫu' },
  { id: 'background', icon: '🎨', label: 'Phông nền chuẩn', badge: '4 chuẩn' },
  { id: 'size', icon: '📐', label: 'Kích thước thẻ', badge: '4x6 / 3x4' },
  { id: 'gender', icon: '👤', label: 'Giới tính', badge: 'Nam / Nữ' },
  { id: 'beauty', icon: '✨', label: 'Làm đẹp & Da', badge: 'Chuyên sâu' },
  { id: 'model', icon: '🤖', label: 'Lựa chọn Model AI', badge: 'Tối ưu' },
];

export const CenterStageSelector = ({
  activeSection = 'outfit',
  onSelectSection,
  // Model state
  models = [],
  loadingModels = false,
  modelError = '',
  selectedModel,
  defaultModel,
  modelSettings = {},
  handleModelChange,
  setModelSettings,
  // Background state
  bg,
  setBg,
  customBgColor,
  setCustomBgColor,
  // Size state
  size,
  handleSizeChange,
  // Gender state
  gender,
  handleGenderSelect,
  // Outfit state
  outfit,
  setOutfit,
  // Hair state
  hairStyle,
  setHairStyle,
  hairChoices = [],
  // Beauty state
  selectedBeauty = [],
  toggleBeauty,
  retouch,
  setRetouch,
}) => {
  return (
    <div className="center-stage-container module-enter">
      {/* 1. THANH ĐIỀU HƯỚNG NHANH CÁC MỤC TRUNG TÂM */}
      <div className="stage-nav-bar">
        {SECTION_TABS.map((tab) => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`stage-nav-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectSection?.(tab.id)}
            >
              <span className="stage-nav-icon">{tab.icon}</span>
              <span className="stage-nav-label">{tab.label}</span>
              {tab.badge && <span className="stage-nav-badge">{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {/* 2. KHU VỰC HIỂN THỊ NỔI BẬT LỰA CHỌN */}
      <div className="stage-content-body">
        {/* === MỤC: TRANG PHỤC STUDIO === */}
        {activeSection === 'outfit' && (
          <div className="stage-section-view">
            <div className="stage-header-banner">
              <div className="stage-banner-title">
                <span className="stage-banner-icon">👔</span>
                <div>
                  <h4>Bộ Sưu Tập Trang Phục Chân Dung & Ảnh Thẻ</h4>
                  <p>Chọn trang phục chuyên nghiệp — hệ thống tự động chuẩn hóa form dáng áo và cà vạt chuẩn studio</p>
                </div>
              </div>
              <div className="stage-current-selection">
                Đang chọn: <strong>{outfit?.label}</strong>
              </div>
            </div>

            <div className="stage-grid stage-outfit-grid">
              {config.outfits.map((o) => {
                const isSelected = outfit?.id === o.id;
                return (
                  <div
                    key={o.id}
                    className={`stage-card stage-outfit-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setOutfit?.(o)}
                  >
                    {isSelected && <span className="stage-card-check">✓ Đang chọn</span>}
                    <div className="stage-visual-box">
                      <OutfitVisual id={o.id} />
                    </div>
                    <div className="stage-card-info">
                      <div className="stage-card-name">{o.label}</div>
                      <div className="stage-card-desc">{o.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === MỤC: KIỂU TÓC CHÂN DUNG === */}
        {activeSection === 'hair' && (
          <div className="stage-section-view">
            <div className="stage-header-banner">
              <div className="stage-banner-title">
                <span className="stage-banner-icon">💇</span>
                <div>
                  <h4>Bộ Sưu Tập Kiểu Tóc Chân Dung ({gender?.label || 'Chân dung'})</h4>
                  <p>Chọn kiểu tóc tự nhiên, làm gọn viền tóc con và giữ trọn vẹn đỉnh đầu chuẩn tỉ lệ 4x6</p>
                </div>
              </div>
              <div className="stage-current-selection">
                Đang chọn: <strong>{hairStyle?.label || 'Giữ tóc gốc'}</strong>
              </div>
            </div>

            <div className="stage-grid stage-hair-grid">
              {hairChoices.map((h) => {
                const isSelected = (hairStyle?.id || 'keep') === h.id;
                return (
                  <div
                    key={h.id}
                    className={`stage-card stage-hair-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setHairStyle?.(h)}
                  >
                    {isSelected && <span className="stage-card-check">✓ Đang chọn</span>}
                    <div className="stage-visual-box">
                      <HairVisual id={h.id} gender={gender?.id || 'male'} />
                    </div>
                    <div className="stage-card-info">
                      <div className="stage-card-name">{h.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="stage-hint-bottom">
              💡 <em>Khuyên dùng: Chọn “Giữ tóc gốc” nếu muốn giữ nguyên mái tóc thật và chỉ làm gọn viền tóc con chuẩn thẻ.</em>
            </p>
          </div>
        )}

        {/* === MỤC: PHÔNG NỀN CHUẨN === */}
        {activeSection === 'background' && (
          <div className="stage-section-view">
            <div className="stage-header-banner">
              <div className="stage-banner-title">
                <span className="stage-banner-icon">🎨</span>
                <div>
                  <h4>Phông Nền Ảnh Thẻ & Chân Dung Chuẩn Quốc Tế</h4>
                  <p>Xanh thẻ 33A Hộ chiếu/CCCD, Phông trắng quốc tế Visa, Xám studio nghệ thuật</p>
                </div>
              </div>
              <div className="stage-current-selection">
                Đang chọn: <strong>{bg?.label}</strong>
              </div>
            </div>

            <div className="stage-grid stage-bg-grid">
              {config.backgrounds.map((b) => {
                const isSelected = bg?.id === b.id;
                return (
                  <div
                    key={b.id}
                    className={`stage-card stage-bg-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setBg?.(b)}
                  >
                    {isSelected && <span className="stage-card-check">✓ Đang chọn</span>}
                    <div className="stage-color-swatch" style={{ background: b.color }} />
                    <div className="stage-card-info">
                      <div className="stage-card-name">{b.label}</div>
                      <div className="stage-card-desc">{b.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="stage-custom-color-box">
              <span className="stage-custom-label">Hoặc chọn màu tùy thích:</span>
              <input
                type="color"
                value={customBgColor || '#1a4b8c'}
                onChange={(e) => {
                  const nextColor = e.target.value;
                  setCustomBgColor?.(nextColor);
                  setBg?.({ id: 'custom', label: 'Tùy chọn', color: nextColor, desc: 'Màu tự chọn' });
                }}
                className="stage-color-picker"
              />
              <span className="stage-custom-code">{customBgColor || '#1a4b8c'}</span>
            </div>
          </div>
        )}

        {/* === MỤC: KÍCH THƯỚC ẢNH THẺ === */}
        {activeSection === 'size' && (
          <div className="stage-section-view">
            <div className="stage-header-banner">
              <div className="stage-banner-title">
                <span className="stage-banner-icon">📐</span>
                <div>
                  <h4>Kích Thước Chuẩn Ảnh Thẻ & Tỉ Lệ Đồ Họa</h4>
                  <p>Hệ thống tự động canh giữ tỷ lệ 32% từ đỉnh đầu, tránh bị crop mất tóc hay cằm</p>
                </div>
              </div>
              <div className="stage-current-selection">
                Đang chọn: <strong>{size?.label}cm ({size?.desc})</strong>
              </div>
            </div>

            <div className="stage-grid stage-size-grid">
              {config.photoSizes.map((s) => {
                const isSelected = size?.id === s.id;
                return (
                  <div
                    key={s.id}
                    className={`stage-card stage-size-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSizeChange?.(s)}
                  >
                    {isSelected && <span className="stage-card-check">✓ Đang chọn</span>}
                    <div className="stage-size-preview-rect" style={{ width: `${s.ratioW * 1.5}px`, height: `${s.ratioH * 1.5}px` }}>
                      <span>{s.label}</span>
                    </div>
                    <div className="stage-card-info">
                      <div className="stage-card-name">{s.label} cm</div>
                      <div className="stage-card-desc">{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === MỤC: GIỚI TÍNH === */}
        {activeSection === 'gender' && (
          <div className="stage-section-view">
            <div className="stage-header-banner">
              <div className="stage-banner-title">
                <span className="stage-banner-icon">👤</span>
                <div>
                  <h4>Lựa Chọn Giới Tính Chân Dung</h4>
                  <p>Tự động điều chỉnh phom dáng áo vest, kiểu tóc và tông màu trang điểm phù hợp</p>
                </div>
              </div>
              <div className="stage-current-selection">
                Đang chọn: <strong>{gender?.label}</strong>
              </div>
            </div>

            <div className="stage-grid stage-gender-grid">
              {(config.genders || []).map((g) => {
                const isSelected = gender?.id === g.id;
                return (
                  <div
                    key={g.id}
                    className={`stage-card stage-gender-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleGenderSelect?.(g)}
                  >
                    {isSelected && <span className="stage-card-check">✓ Đang chọn</span>}
                    <div className="stage-gender-big-icon">{g.icon}</div>
                    <div className="stage-card-info">
                      <div className="stage-card-name">{g.label}</div>
                      <div className="stage-card-desc">
                        {g.id === 'female' ? 'Vest nữ, Áo dài, tóc dài/búi, mịn da tự nhiên' : 'Vest nam cà vạt, sơ mi, tóc rẽ ngôi, chỉnh chu'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* === MỤC: LÀM ĐẸP & CHỈNH SỬA === */}
        {activeSection === 'beauty' && (
          <div className="stage-section-view">
            <div className="stage-header-banner">
              <div className="stage-banner-title">
                <span className="stage-banner-icon">✨</span>
                <div>
                  <h4>Bộ Công Cụ Làm Đẹp & Tinh Chỉnh Nét Mặt Studio</h4>
                  <p>Công nghệ tách tần số (Frequency Separation) giữ nguyên kết cấu vân da thật, không làm giả hay nhựa mặt</p>
                </div>
              </div>
              <div className="stage-current-selection">
                Đã chọn: <strong>{selectedBeauty.length} mục • Mức độ: {retouch}%</strong>
              </div>
            </div>

            <div className="stage-grid stage-beauty-grid">
              {(config.idBeautyOptions || []).map((item) => {
                const isSelected = selectedBeauty.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className={`stage-card stage-beauty-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleBeauty?.(item.id)}
                  >
                    <div className="stage-beauty-icon">{item.icon}</div>
                    <div className="stage-card-info">
                      <div className="stage-card-name">{item.label}</div>
                    </div>
                    <span className={`stage-checkbox ${isSelected ? 'checked' : ''}`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="stage-retouch-slider-box">
              <div className="stage-slider-header">
                <span>Cường độ mịn da & giữ vân da: <strong>{retouch}%</strong></span>
                <span className="stage-slider-badge">{retouch < 35 ? 'Tự nhiên' : retouch < 70 ? 'Cân bằng Studio' : 'Nét căng'}</span>
              </div>
              <input
                type="range"
                className="range-slider stage-slider-input"
                min="0"
                max="100"
                value={retouch}
                onChange={(e) => setRetouch?.(parseInt(e.target.value, 10))}
              />
              <div className="stage-slider-labels">
                <span>0% (Mặt mộc hoàn toàn)</span>
                <span>50% (Chuẩn Studio khuyên dùng)</span>
                <span>100% (Da trắng hồng mịn màng)</span>
              </div>
            </div>
          </div>
        )}

        {/* === MỤC: LỰA CHỌN MODEL AI === */}
        {activeSection === 'model' && (
          <div className="stage-section-view stage-model-view">
            <div className="stage-header-banner">
              <div className="stage-banner-title">
                <span className="stage-banner-icon">🤖</span>
                <div>
                  <h4>Lựa Chọn Model AI Chuyên Tạo Ảnh Thẻ</h4>
                  <p>Tối ưu tốc độ cao, giữ trọn nét mặt gốc và tạo chi tiết trang phục sắc nét</p>
                </div>
              </div>
              <div className="stage-current-selection">
                Đang chọn: <strong>{selectedModel?.name || defaultModel?.name || 'Nano Banana 2'}</strong>
              </div>
            </div>

            <div className="stage-model-container">
              <ModelPicker
                models={models}
                loading={loadingModels}
                error={modelError}
                selectedModel={selectedModel || defaultModel}
                settings={modelSettings}
                onModelChange={handleModelChange}
                onSettingsChange={setModelSettings}
                embedded
                hideRatio
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CenterStageSelector;
