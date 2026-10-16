import React from 'react';
import config from '../data/config.js';
import { downloadMediaFile } from '../lib/api.js';
import { generatePhoto } from '../lib/generate.js';
import { buildIdPhotoPrompt } from '../lib/promptBuilder.js';
import { getDefaultMediaSettings, getMediaOptionsFromSource, findPreferredDefaultModel, PREFERRED_ID_PHOTO_SETTINGS } from '../lib/modelCatalog.js';

import { addHistoryItem } from '../lib/history.js';
import { analyzeImageWithAI, buildSmartSuggestions } from '../lib/visionAnalysis.js';
import ImageUploader from './ImageUploader.jsx';
import ModelPicker from './ModelPicker.jsx';
import ComparisonSlider from './ComparisonSlider.jsx';
import { OutfitVisual, HairVisual } from './StudioVisualIcons.jsx';
import CropModal from './CropModal.jsx';
import BatchIdPhotoGenerator from './BatchIdPhotoGenerator.jsx';


const getModelLabel = (model) => model?.name || model?.title || model?.model || model?.id_base || 'Model AI';

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const normalizeRatio = (w, h) => {
  const aw = Number(w);
  const ah = Number(h);
  if (!Number.isFinite(aw) || !Number.isFinite(ah) || aw <= 0 || ah <= 0) return '';
  const scale = 10;
  const wi = Math.round(aw * scale);
  const hi = Math.round(ah * scale);
  const divisor = gcd(wi, hi);
  return `${wi / divisor}:${hi / divisor}`;
};

const getSizeRatio = (size) => size ? normalizeRatio(size.w, size.h) : '';

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms < 0) return '--';
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
};

const AccordionSection = ({ id, icon, title, summary, openSections, onToggle, children }) => {
  const isOpen = !!openSections[id];
  return (
    <div className={'panel-section accordion-section' + (isOpen ? ' open' : '')}>
      <button
        type="button"
        className="accordion-trigger"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
      >
        <span className="accordion-title">
          <span className="accordion-icon">{icon}</span>
          <span>{title}</span>
        </span>
        <span className="accordion-summary">{summary}</span>
        <span className="accordion-chevron">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="accordion-content">
          {children}
        </div>
      )}
    </div>
  );
};

// Kích thước ảnh thẻ mặc định khi mới mở app: 4×6 (phổ biến nhất tại VN).
// Người dùng vẫn có thể tự đổi lại bất kỳ lúc nào ở mục "Kích thước".
const DEFAULT_PHOTO_SIZE = config.photoSizes.find((item) => item.id === '4x6') || config.photoSizes[0];

const IdPhotoGenerator = ({ models = [], loadingModels, modelError = '', onSendToLayout }) => {
  // Mặc định ưu tiên "Nano Banana 2" + resolution 1K + mode VIP 2 — theo phản hồi
  // thực tế của người dùng là cấu hình tạo ảnh nhanh nhất khi mới mở app.
  const defaultModel = findPreferredDefaultModel(models);
  const defaultRatio = getSizeRatio(DEFAULT_PHOTO_SIZE);
  const [selectedModel, setSelectedModel] = React.useState(defaultModel);
  const [modelSettings, setModelSettings] = React.useState(
    getDefaultMediaSettings(defaultModel, { ratio: defaultRatio, ...PREFERRED_ID_PHOTO_SETTINGS })
  );

  React.useEffect(() => {
    if (Array.isArray(models) && models.length > 0 && !selectedModel) {
      const preferredModel = findPreferredDefaultModel(models);
      setSelectedModel(preferredModel);
      setModelSettings(getDefaultMediaSettings(preferredModel, { ratio: defaultRatio, ...PREFERRED_ID_PHOTO_SETTINGS }));
    }
  }, [models, selectedModel]);



  const handleModelChange = (nextModel) => {
    setSelectedModel(nextModel);
    setModelSettings(getDefaultMediaSettings(nextModel, modelSettings));
  };

  const handleSizeChange = (nextSize) => {
    setSize(nextSize);
    if (!selectedModel) return;

    const ratio = getSizeRatio(nextSize);
    const opts = getMediaOptionsFromSource(selectedModel);
    const matchingRatio = opts.ratios.find((item) => String(item.type).trim() === String(ratio).trim());
    if (matchingRatio) {
      setModelSettings((prev) => ({ ...prev, ratio: matchingRatio.type }));
    }
  };

  const [uploaded, setUploaded] = React.useState(null);
  const [bg, setBg] = React.useState(config.backgrounds[0]);
  const [customBgColor, setCustomBgColor] = React.useState('#1a4b8c');
  const [gender, setGender] = React.useState(config.genders?.[0] || { id: 'male', label: 'Nam' });
  const [outfit, setOutfit] = React.useState(config.outfits[0]);
  const [hairStyle, setHairStyle] = React.useState(config.hairStyles?.male?.[0] || null);
  const [selectedBeauty, setSelectedBeauty] = React.useState(['skin-clean', 'freq-separation', 'skin-bright', 'eye-bright']);
  const [size, setSize] = React.useState(DEFAULT_PHOTO_SIZE);
  const [extraRequest, setExtraRequest] = React.useState('');

  const [retouch, setRetouch] = React.useState(50);
  const [result, setResult] = React.useState(null);
  const [resultMeta, setResultMeta] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [generatorMode, setGeneratorMode] = React.useState('single'); // 'single' | 'batch'
  const [cropTarget, setCropTarget] = React.useState(null); // null | 'uploaded' | 'result'
  const [liveElapsed, setLiveElapsed] = React.useState(0);
  const [error, setError] = React.useState(null);
  const [logEntries, setLogEntries] = React.useState([]);
  const [openSections, setOpenSections] = React.useState({
    model: true,
    background: false,
    size: false,
    gender: false,
    outfit: false,
    hair: false,
    beauty: false,
  });
  const timerRef = React.useRef(null);
  const abortControllerRef = React.useRef(null);
  const generationIdRef = React.useRef(0);

  const toggleSection = React.useCallback((id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleCancelGenerate = React.useCallback(() => {
    generationIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    setLoading(false);
    setError('Đã huỷ tác vụ tạo ảnh.');
  }, []);

  const [analyzingImage, setAnalyzingImage] = React.useState(false);
  const [smartAnalysis, setSmartAnalysis] = React.useState(null);

  const hairChoices = config.hairStyles?.[gender.id] || [];
  const selectedBeautyObjects = (config.idBeautyOptions || []).filter((item) => selectedBeauty.includes(item.id));

  const applySmartSuggestions = React.useCallback((analysis) => {
    if (!analysis) return;
    if (analysis.gender) {
      const targetGender = (config.genders || []).find((g) => g.id === analysis.gender) || config.genders?.[0];
      if (targetGender) setGender(targetGender);
    }
    if (analysis.suggestedOutfit) {
      setOutfit(analysis.suggestedOutfit);
    }
    if (analysis.suggestedBg) {
      setBg(analysis.suggestedBg);
    }
    if (analysis.suggestedHair) {
      setHairStyle(analysis.suggestedHair);
    }
    if (Array.isArray(analysis.suggestedBeautyIds) && analysis.suggestedBeautyIds.length > 0) {
      setSelectedBeauty(analysis.suggestedBeautyIds);
    }
  }, []);

  const handleToggleGender = React.useCallback(() => {
    if (!smartAnalysis) return;
    const nextGenderId = smartAnalysis.gender === 'female' ? 'male' : 'female';
    const newSuggestions = buildSmartSuggestions({
      gender: nextGenderId,
      age: smartAnalysis.age,
      hasGlasses: smartAnalysis.hasGlasses
    });
    const updatedAnalysis = {
      ...smartAnalysis,
      gender: nextGenderId,
      genderLabel: nextGenderId === 'female' ? 'Nữ' : 'Nam',
      genderEmoji: nextGenderId === 'female' ? '👩' : '👨',
      detectedHair: nextGenderId === 'female' ? 'Tóc dài buông vai' : 'Tóc nam tự nhiên',
      ...newSuggestions
    };
    setSmartAnalysis(updatedAnalysis);
    applySmartSuggestions(updatedAnalysis);
  }, [smartAnalysis, applySmartSuggestions]);

  const handleImageUpload = React.useCallback(async (uploadData) => {
    setUploaded(uploadData);
    if (!uploadData?.base64) {
      setSmartAnalysis(null);
      return;
    }

    setAnalyzingImage(true);
    try {
      const [analysis] = await Promise.all([
        analyzeImageWithAI(uploadData.file, uploadData.base64),
        new Promise((resolve) => setTimeout(resolve, 500))
      ]);
      setSmartAnalysis(analysis);
      applySmartSuggestions(analysis);
    } catch (err) {
      console.warn('Lỗi phân tích chân dung:', err);
    } finally {
      setAnalyzingImage(false);
    }
  }, [applySmartSuggestions]);

  const handleGenderSelect = (nextGender) => {
    setGender(nextGender);
    const nextHair = config.hairStyles?.[nextGender.id]?.[0] || null;
    setHairStyle(nextHair);
  };

  const toggleBeauty = (id) => {
    setSelectedBeauty((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const handleGenerate = async () => {
    if (!uploaded) { setError('Vui lòng tải ảnh chân dung lên'); return; }
    const currentModel = selectedModel || defaultModel;
    if (!currentModel) { setError('Model AI chưa sẵn sàng. Vui lòng đợi hoặc tải lại trang.'); return; }
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const generationId = generationIdRef.current + 1;
    generationIdRef.current = generationId;
    const startedAt = performance.now();
    setLoading(true);
    setLiveElapsed(0);
    setError(null);
    setLogEntries([]);
    setResultMeta(null);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setLiveElapsed(performance.now() - startedAt);
    }, 1000);

    try {
      const prompt = buildIdPhotoPrompt({
        background: bg,
        outfit,
        size,
        retouchLevel: retouch,
        gender,
        hairStyle,
        beautyOptions: selectedBeautyObjects,
        extraRequest,
      });
      const resUrl = await generatePhoto({
        prompt,
        base64Image: uploaded.base64,
        selectedModel: currentModel,
        settings: modelSettings,
        mimeType: uploaded.file?.type || 'image/jpeg',
        signal: controller.signal
      });
      if (controller.signal.aborted || generationId !== generationIdRef.current) return;
      const durationMs = performance.now() - startedAt;
      setResult(resUrl);
      const meta = {
        durationMs,
        modelName: getModelLabel(currentModel),
        ratio: modelSettings.ratio || 'auto',
        resolution: modelSettings.resolution || 'auto',
        mode: modelSettings.mode || '',
        generatedAt: new Date().toLocaleString('vi-VN'),
        size,
      };
      setResultMeta(meta);
      // Lưu vào lịch sử ảnh (Gallery) để xem lại/tải lại sau, không chặn UI nếu lưu lỗi.
      addHistoryItem({ type: 'id-photo', url: resUrl, meta, fileName: `anh-the-ai-${Date.now()}.png` });
    } catch (e) {
      if (e?.name === 'AbortError' || controller.signal.aborted || generationId !== generationIdRef.current) {
        return;
      }
      const message = e?.message || 'Lỗi xử lý ảnh';

      const detailPayload = e?.raw ?? e?.response ?? e?.detail ?? null;
      const detailText = detailPayload
        ? typeof detailPayload === 'string'
          ? detailPayload
          : JSON.stringify(detailPayload, null, 2)
        : e?.stack || JSON.stringify(e, null, 2) || message;
      setError(message);
      setLogEntries((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString('vi-VN'),
          stage: 'Tạo Ảnh',
          message,
          detail: detailText,
        }
      ]);
    } finally {
      if (generationId === generationIdRef.current) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        timerRef.current = null;
        abortControllerRef.current = null;
        setLoading(false);
      }
    }
  };

  const handleDownload = async (format = 'png') => {
    try {
      setError(null);
      await downloadMediaFile(result, `anh-the-ai-${Date.now()}.${format}`, { format });
    } catch (e) {
      const message = e?.message || 'Không tải được ảnh. Vui lòng thử lại.';
      const detailPayload = e?.raw ?? e?.response ?? e?.detail ?? null;
      const detailText = detailPayload
        ? typeof detailPayload === 'string'
          ? detailPayload
          : JSON.stringify(detailPayload, null, 2)
        : e?.stack || JSON.stringify(e, null, 2) || message;
      setError(message);
      setLogEntries((prev) => [
        ...prev,
        {
          time: new Date().toLocaleTimeString('vi-VN'),
          stage: 'Tải ảnh',
          message,
          detail: detailText,
        }
      ]);
    }
  };

  return (
    <div className="id-photo-wrapper">
      {/* Tab chuyển đổi Đơn Lẻ ⇄ Hàng Loạt */}
      <div className="history-filter-bar" style={{ marginBottom: 16 }}>
        <button
          type="button"
          className={'history-filter-btn' + (generatorMode === 'single' ? ' active' : '')}
          onClick={() => setGeneratorMode('single')}
        >
          👤 Tạo Đơn Lẻ (1 Ảnh)
        </button>
        <button
          type="button"
          className={'history-filter-btn' + (generatorMode === 'batch' ? ' active' : '')}
          onClick={() => setGeneratorMode('batch')}
        >
          👥 Xử Lý Hàng Loạt (Batch Mode)
        </button>
      </div>

      {generatorMode === 'batch' ? (
        <BatchIdPhotoGenerator models={models} onSendToLayout={onSendToLayout} />
      ) : (
        <div className="split-layout module-enter smooth-layout">
          <div className="control-panel">
            <div className="panel-section">
              <div className="panel-title">Ảnh Thẻ Thông Minh</div>
              <p className="hint-text" style={{ marginBottom: '14px' }}>
                Biến selfie thành ảnh thẻ chuẩn quốc tế trong vài giây
              </p>
              <ImageUploader onUpload={handleImageUpload} uploaded={uploaded} hint="JPG, PNG — ảnh chân dung rõ mặt (tối đa 10MB)" onError={setError} />

              {uploaded && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setCropTarget('uploaded')}
                    style={{ width: '100%', fontSize: 13, padding: '7px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    📐 Canh Thước & Crop Ảnh Gốc
                  </button>
                </div>
              )}

          {analyzingImage && (
            <div className="smart-analysis-card analyzing">
              <div className="analysis-spinner-row">
                <span className="analysis-pulse-icon">🧠</span>
                <div>
                  <strong>AI đang quét khuôn mặt & độ tuổi...</strong>
                  <p>Phân tích diện mạo, đường nét và tự động cấu hình gợi ý tối ưu</p>
                </div>
              </div>
            </div>
          )}

          {!analyzingImage && smartAnalysis && uploaded && (
            <div className="smart-analysis-card success">
              <div className="analysis-header">
                <div className="analysis-title">
                  <span className="analysis-sparkle">✨</span>
                  <strong>AI Đã Phân Tích Chân Dung</strong>
                </div>
                <span className="analysis-confidence">Độ chính xác: {smartAnalysis.confidence}%</span>
              </div>
              <div className="analysis-pill-row">
                <button
                  type="button"
                  className="analysis-pill interactive-gender-pill"
                  onClick={handleToggleGender}
                  title="Nhấp để đổi nhanh giới tính Nam ⇄ Nữ"
                >
                  {smartAnalysis.genderEmoji} <strong>{smartAnalysis.genderLabel}</strong>
                  <span className="pill-action-badge">⇄ Đổi</span>
                </button>
                <span className="analysis-pill">
                  🎂 <strong>~{smartAnalysis.age} tuổi</strong> ({smartAnalysis.ageGroupLabel})
                </span>
                {smartAnalysis.detectedHair && (
                  <span className="analysis-pill">
                    💇 <strong>{smartAnalysis.detectedHair}</strong>
                  </span>
                )}
              </div>
              <div className="analysis-rationale">
                💡 <em>{smartAnalysis.rationale}</em>
              </div>
              <div className="analysis-footer">
                <span className="analysis-applied-info">
                  ✓ Tự động chọn: <strong>{smartAnalysis.suggestedOutfit?.label}</strong> • <strong>{smartAnalysis.suggestedBg?.label}</strong>
                </span>
                <button
                  type="button"
                  className="btn-reapply-suggestions"
                  onClick={() => applySmartSuggestions(smartAnalysis)}
                  title="Áp dụng lại toàn bộ cấu hình tối ưu"
                >
                  🔄 Áp dụng lại
                </button>
              </div>
            </div>
          )}

          <button className="btn-primary idphoto-quick-create" onClick={handleGenerate} disabled={loading || !uploaded || (!selectedModel && !defaultModel)}>
            {loading ? `⏳ Đang xử lý ${formatDuration(liveElapsed)}...` : (!selectedModel && !defaultModel) ? '⏳ Đang tải model...' : '🪪 Tạo Ảnh Thẻ'}
          </button>
          <textarea
            className="idphoto-extra-request"
            value={extraRequest}
            onChange={(e) => setExtraRequest(e.target.value)}
            placeholder="Yêu cầu thêm cho AI (không bắt buộc)..."
            rows={2}
            maxLength={300}
          />
          <p className="hint-text idphoto-quick-hint">Nếu tạo lâu, thử giảm độ phân giải hoặc chọn model Fast/Standard.</p>
        </div>

        <AccordionSection
          id="model"
          icon="🤖"
          title="Lựa chọn Model AI"
          summary={getModelLabel(selectedModel || defaultModel)}
          openSections={openSections}
          onToggle={toggleSection}
        >
          <ModelPicker
            models={models}
            loading={loadingModels}
            error={modelError}
            selectedModel={selectedModel || defaultModel}
            settings={modelSettings}
            onModelChange={handleModelChange}
            onSettingsChange={setModelSettings}
            embedded
          />
        </AccordionSection>

        <AccordionSection
          id="background"
          icon="🎨"
          title="Phông nền chuẩn"
          summary={bg?.label}
          openSections={openSections}
          onToggle={toggleSection}
        >
          <div className="option-grid">
            {config.backgrounds.map(b => (
              <div key={b.id} className={"option-card" + (bg.id === b.id ? " selected" : "")} onClick={() => setBg(b)}>
                <div className="color-swatch" style={{ background: b.color }}></div>
                <div className="oc-label">{b.label}</div>
                <div className="oc-desc">{b.desc}</div>
              </div>
            ))}
            <div
              className={"option-card" + (bg.id === 'custom' ? " selected" : "")}
              onClick={() => setBg({ id: 'custom', label: 'Tuỳ chọn', color: customBgColor, desc: 'Màu tự chọn' })}
            >
              <div className="color-swatch" style={{ background: customBgColor }}></div>
              <div className="oc-label">🎨 Tuỳ chọn</div>
              <div className="oc-desc">Chọn màu riêng</div>
            </div>
          </div>
          {bg.id === 'custom' && (
            <div className="custom-bg-color-row" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="color"
                value={customBgColor}
                onChange={(e) => {
                  const nextColor = e.target.value;
                  setCustomBgColor(nextColor);
                  setBg({ id: 'custom', label: 'Tuỳ chọn', color: nextColor, desc: 'Màu tự chọn' });
                }}
                style={{ width: '44px', height: '36px', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer', background: 'none', padding: '2px' }}
              />
              <input
                type="text"
                value={customBgColor}
                onChange={(e) => {
                  const nextColor = e.target.value;
                  setCustomBgColor(nextColor);
                  setBg({ id: 'custom', label: 'Tuỳ chọn', color: nextColor, desc: 'Màu tự chọn' });
                }}
                placeholder="#1a4b8c"
                style={{ flex: 1, padding: '9px 10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text)' }}
              />
            </div>
          )}
        </AccordionSection>

        <AccordionSection
          id="size"
          icon="📐"
          title="Kích thước ảnh thẻ"
          summary={`${size?.label}cm (${size?.desc || 'Chuẩn'})`}
          openSections={openSections}
          onToggle={toggleSection}
        >
          <div className="size-grid">
            {config.photoSizes.map(s => (
              <div key={s.id} className={"size-card" + (size.id === s.id ? " selected" : "")} onClick={() => handleSizeChange(s)}>
                <div className="size-rect" style={{ width: s.ratioW + 'px', height: s.ratioH + 'px' }}></div>
                <div className="size-label">{s.label}</div>
                <div className="size-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection
          id="gender"
          icon="👤"
          title="Giới tính"
          summary={gender?.label}
          openSections={openSections}
          onToggle={toggleSection}
        >
          <div className="gender-grid">
            {(config.genders || []).map(g => (
              <div key={g.id} className={"option-card gender-card" + (gender.id === g.id ? " selected" : "")} onClick={() => handleGenderSelect(g)}>
                <div className="gender-icon">{g.icon}</div>
                <div className="oc-label">{g.label}</div>
              </div>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection
          id="outfit"
          icon="👔"
          title="Trang phục studio"
          summary={outfit?.label}
          openSections={openSections}
          onToggle={toggleSection}
        >
          {/* Nhóm Nam */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', margin: '4px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>👨</span> Trang phục Nam
          </div>
          <div className="option-grid outfit-grid visual-grid" style={{ marginBottom: 16 }}>
            {config.outfits.filter(o => o.category === 'male').map(o => (
              <div key={o.id} className={"option-card visual-card" + (outfit.id === o.id ? " selected" : "")} onClick={() => setOutfit(o)}>
                <OutfitVisual id={o.id} />
                <div className="oc-label">{o.label}</div>
                <div className="oc-desc">{o.desc}</div>
              </div>
            ))}
          </div>

          {/* Nhóm Nữ */}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f472b6', margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>👩</span> Trang phục Nữ
          </div>
          <div className="option-grid outfit-grid visual-grid" style={{ marginBottom: 16 }}>
            {config.outfits.filter(o => o.category === 'female').map(o => (
              <div key={o.id} className={"option-card visual-card" + (outfit.id === o.id ? " selected" : "")} onClick={() => setOutfit(o)}>
                <OutfitVisual id={o.id} />
                <div className="oc-label">{o.label}</div>
                <div className="oc-desc">{o.desc}</div>
              </div>
            ))}
          </div>

          {/* Nhóm Chung / Học đường */}
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-dim, #94a3b8)', margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>👔</span> Trang phục Chung / Học đường
          </div>
          <div className="option-grid outfit-grid visual-grid">
            {config.outfits.filter(o => o.category === 'unisex').map(o => (
              <div key={o.id} className={"option-card visual-card" + (outfit.id === o.id ? " selected" : "")} onClick={() => setOutfit(o)}>
                <OutfitVisual id={o.id} />
                <div className="oc-label">{o.label}</div>
                <div className="oc-desc">{o.desc}</div>
              </div>
            ))}
          </div>
        </AccordionSection>

        <AccordionSection
          id="hair"
          icon="💇"
          title="Kiểu tóc chân dung"
          summary={hairStyle?.label || 'Giữ tóc gốc'}
          openSections={openSections}
          onToggle={toggleSection}
        >
          <div className="hair-grid visual-grid">
            {hairChoices.map(h => (
              <div key={h.id} className={"option-card hair-card visual-card" + (hairStyle?.id === h.id ? " selected" : "")} onClick={() => setHairStyle(h)}>
                <HairVisual id={h.id} gender={gender.id} />
                <div className="oc-label">{h.label}</div>
              </div>
            ))}
          </div>
          <p className="hint-text">Chọn “Giữ tóc gốc” nếu muốn giữ nguyên mái tóc thật và chỉ làm gọn viền tóc con.</p>
        </AccordionSection>

        <AccordionSection
          id="beauty"
          icon="✨"
          title="Làm đẹp & Chỉnh sửa"
          summary={`${selectedBeauty.length} mục • ${retouch}%`}
          openSections={openSections}
          onToggle={toggleSection}
        >
          <div className="beauty-grid">
            {(config.idBeautyOptions || []).map(item => (
              <div key={item.id} className={"beauty-card" + (selectedBeauty.includes(item.id) ? " selected" : "")} onClick={() => toggleBeauty(item.id)}>
                <span className="beauty-icon">{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="slider-row" style={{ marginTop: '12px' }}>
            <input type="range" className="range-slider" min="0" max="100" value={retouch}
              onChange={(e) => setRetouch(parseInt(e.target.value))} />
          </div>
          <p className="hint-text">0 = Tự nhiên • 100 = Làm đẹp nâng cao. Tách tần số giữ vân da thật, tránh làm mặt nhựa.</p>
        </AccordionSection>
      </div>

      <div className="workspace">
        <div className="ws-toolbar">
          <h3>Kết Quả</h3>
        </div>
        <div className="ws-content">
          {loading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <div className="loading-text">AI đang tạo ảnh thẻ bằng {getModelLabel(selectedModel || defaultModel)}...</div>
              <div className="generation-live-time">⏱ {formatDuration(liveElapsed)}</div>
              <button type="button" className="btn-cancel loading-cancel-btn" onClick={handleCancelGenerate}>
                Huỷ
              </button>
            </div>
          )}
          {!result && !loading && (
            <div className="ws-empty">
              <div className="ws-empty-icon">🪪</div>
              <p>Tải ảnh lên và nhấn "Tạo Ảnh Thẻ" để xem kết quả</p>
            </div>
          )}
          {result && !loading && uploaded && (
            <div className="result-display">
              <ComparisonSlider before={uploaded.url} after={result} beforeLabel="Gốc" afterLabel="Ảnh thẻ" />
              {resultMeta && (
                <div className="generation-meta">
                  <span>⏱ Tổng time: <strong>{formatDuration(resultMeta.durationMs)}</strong></span>
                  <span>🤖 Model: <strong>{resultMeta.modelName}</strong></span>
                  <span>⚙ {resultMeta.ratio} • {resultMeta.resolution}{resultMeta.mode ? ` • ${resultMeta.mode}` : ''}</span>
                </div>
              )}
              <div className="result-actions">
                <button type="button" className="btn-download-strong" onClick={() => handleDownload('png')}>
                  ⬇ Tải PNG
                </button>
                <button type="button" className="btn-download-strong btn-download-jpg" onClick={() => handleDownload('jpg')}>
                  ⬇ Tải JPG
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setCropTarget('result')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  📐 Canh Thước & Crop Lại
                </button>
                <button
                  type="button"
                  className="btn-layout-strong"
                  onClick={() => onSendToLayout?.({
                    url: result,
                    sourceUrl: uploaded.url,
                    size,
                    fileName: `anh-the-ai-${Date.now()}.png`,
                  })}
                >
                  🖨️ Sắp xếp layout để in
                </button>
              </div>
            </div>
          )}
          {result && !loading && !uploaded && (
            <div className="result-image-wrapper">
              <img src={result} alt="Result" />
            </div>
          )}

          {error && (
            <div className="error-banner result-bottom-error">
              <div className="result-error-title">⚠ {error}</div>
              {logEntries.length > 0 && (
                <pre className="result-error-detail">{logEntries[logEntries.length - 1].detail}</pre>
              )}
            </div>
          )}

          {logEntries.length > 0 && (
            <div className="result-log-card">
              <div className="result-log-header">
                <div>
                  <strong>🧾 Log lỗi</strong>
                  <p className="hint-text" style={{ margin: '6px 0 0' }}>Sao chép nhanh để gửi lỗi cho người hỗ trợ.</p>
                </div>
                <button
                  type="button"
                  className="btn-secondary btn-copy-log"
                  onClick={async () => {
                    const text = logEntries.map((entry) => {
                      return `[${entry.time}] ${entry.stage}: ${entry.message}\n${entry.detail}`;
                    }).join('\n\n');
                    await navigator.clipboard.writeText(text);
                  }}
                >
                  📋 Sao chép log
                </button>
              </div>
              <div className="result-log-scroll">
                <table className="result-log-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Loại</th>
                      <th>Nội dung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logEntries.map((entry, index) => (
                      <tr key={`${entry.time}-${entry.stage}-${index}`}>
                        <td>{entry.time}</td>
                        <td>{entry.stage}</td>
                        <td>
                          <details open>
                            <summary>{entry.message}</summary>
                            <pre>{entry.detail}</pre>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      )}

      {cropTarget && (
        <CropModal
          imageUrl={cropTarget === 'uploaded' ? uploaded?.url : result}
          initialRatio={size.id === '3x4' ? '3:4' : size.id === '2x3' ? '2:3' : size.id === '3.5x4.5' ? '3.5:4.5' : size.id === '1x1' ? '1:1' : '4:6'}
          onConfirm={(croppedUrl) => {
            if (cropTarget === 'uploaded') {
              setUploaded((prev) => ({ ...prev, url: croppedUrl, base64: croppedUrl }));
            } else if (cropTarget === 'result') {
              setResult(croppedUrl);
            }
            setCropTarget(null);
          }}
          onCancel={() => setCropTarget(null)}
        />
      )}
    </div>
  );
};

export default IdPhotoGenerator;
