import React from 'react';
import config from '../data/config.js';
import { downloadMediaFile } from '../lib/api.js';
import { generatePhoto } from '../lib/generate.js';
import { buildRestorePrompt } from '../lib/promptBuilder.js';
import { getDefaultMediaSettings, findPreferredDefaultModel, PREFERRED_RESTORE_SETTINGS } from '../lib/modelCatalog.js';

import { addHistoryItem } from '../lib/history.js';
import ImageUploader from './ImageUploader.jsx';

import ComparisonSlider from './ComparisonSlider.jsx';
import ModelPicker from './ModelPicker.jsx';
import AccordionSection from './AccordionSection.jsx';

const PhotoRestorer = ({ models = [], loadingModels, modelError = '', onSendToLayout }) => {
  // Mặc định ưu tiên "Nano Banana 2" + resolution 1K + mode VIP 2 — theo phản hồi
  // thực tế của người dùng là cấu hình tạo ảnh nhanh nhất khi mới mở app.
  const defaultModel = findPreferredDefaultModel(models);
  const [selectedModel, setSelectedModel] = React.useState(defaultModel);
  const [modelSettings, setModelSettings] = React.useState(getDefaultMediaSettings(defaultModel, PREFERRED_RESTORE_SETTINGS));

  React.useEffect(() => {
    if (Array.isArray(models) && models.length > 0 && !selectedModel) {
      const preferredModel = findPreferredDefaultModel(models);
      setSelectedModel(preferredModel);
      setModelSettings(getDefaultMediaSettings(preferredModel, PREFERRED_RESTORE_SETTINGS));
    }
  }, [models, selectedModel]);


  const handleModelChange = (nextModel) => {
    setSelectedModel(nextModel);
    setModelSettings(getDefaultMediaSettings(nextModel, modelSettings));
  };

  const [uploaded, setUploaded] = React.useState(null);
  const [level, setLevel] = React.useState(config.restorationLevels[1]);
  const [activePanel, setActivePanel] = React.useState('enhance');
  const [precisionMode, setPrecisionMode] = React.useState(false);
  const [preset, setPreset] = React.useState(config.worshipRestorePresets[0]);
  const [selectedEnhancements, setSelectedEnhancements] = React.useState(['face', 'denoise']);
  const [outputQuality, setOutputQuality] = React.useState(config.restoreOutputQualities[0]);
  const [extraRequest, setExtraRequest] = React.useState('');
  const [result, setResult] = React.useState(null);
  const [resultMeta, setResultMeta] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [liveElapsed, setLiveElapsed] = React.useState(0);
  const [error, setError] = React.useState(null);
  const [logEntries, setLogEntries] = React.useState([]);
  // Thu gọn từng nhóm tuỳ chọn bằng accordion để form ngắn lại, người dùng không phải
  // cuộn qua lại giữa nút "Bắt đầu phục hồi" và các mục lựa chọn.
  const [openSections, setOpenSections] = React.useState({
    model: true,
    request: false,
    precision: false,
    preset: true,
    enhancements: false,
    level: false,
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
    setError('Đã huỷ tác vụ phục hồi ảnh.');
  }, []);


  const getModelLabel = (model) => model?.name || model?.title || model?.model || model?.id_base || 'Model AI';
  const formatDuration = (ms) => {
    if (!Number.isFinite(ms) || ms < 0) return '--';
    const totalSeconds = Math.max(1, Math.round(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes <= 0) return `${seconds}s`;
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  };

  const toggleEnhancement = (id) => {
    setSelectedEnhancements((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const selectedEnhancementObjects = config.restoreEnhancements.filter((item) => selectedEnhancements.includes(item.id));
  const colorize = selectedEnhancements.includes('colorize');
  const upscale = outputQuality.id === '4k'
    ? config.upscaleFactors.find((item) => item.id === '4x')
    : outputQuality.id === '2k'
    ? config.upscaleFactors.find((item) => item.id === '2x')
    : config.upscaleFactors[1];

  const extraRequestSummary = extraRequest.trim()
    ? (extraRequest.trim().length > 24 ? `${extraRequest.trim().slice(0, 24)}…` : extraRequest.trim())
    : 'Không có';

  const handleGenerate = async () => {
    if (!uploaded) {
      setError('Vui lòng tải ảnh cũ lên trước khi phục hồi.');
      return;
    }
    const currentModel = selectedModel || defaultModel;
    if (!currentModel) {
      setError('Model AI chưa sẵn sàng. Vui lòng đợi hoặc tải lại trang.');
      return;
    }
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const generationId = generationIdRef.current + 1;
    generationIdRef.current = generationId;
    const startedAt = performance.now();
    setLoading(true);
    setLiveElapsed(0);
    setResultMeta(null);
    setError(null);
    setLogEntries([]);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setLiveElapsed(performance.now() - startedAt);
    }, 1000);
    try {
      const prompt = buildRestorePrompt({
        damageLevel: level,
        colorize,
        upscale,
        preset,
        enhancements: selectedEnhancementObjects,
        precisionMode,
        outputQuality,
        extraRequest,
      });
      const resUrl = await generatePhoto({
        prompt,
        base64Image: uploaded.base64,
        selectedModel: currentModel,
        settings: { ...modelSettings, resolution: modelSettings.resolution || outputQuality.resolution || 'standard' },
        mimeType: uploaded.file?.type || 'image/jpeg',
        signal: controller.signal,
      });
      if (controller.signal.aborted || generationId !== generationIdRef.current) return;
      const durationMs = performance.now() - startedAt;
      setResult(resUrl);
      const meta = {
        durationMs,
        modelName: getModelLabel(currentModel),
        ratio: modelSettings.ratio || 'auto',
        resolution: modelSettings.resolution || outputQuality.resolution || 'auto',
        mode: modelSettings.mode || '',
        generatedAt: new Date().toLocaleString('vi-VN'),
      };
      setResultMeta(meta);
      // Lưu vào lịch sử ảnh (Gallery) để xem lại/tải lại sau, không chặn UI nếu lưu lỗi.
      addHistoryItem({ type: 'restorer', url: resUrl, meta, fileName: `phuc-hoi-anh-cu-${Date.now()}.png` });
    } catch (e) {
      if (e?.name === 'AbortError' || controller.signal.aborted || generationId !== generationIdRef.current) {
        return;
      }
      const message = e?.message || 'Lỗi phục hồi ảnh';

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
          stage: 'Phục hồi ảnh',
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
      await downloadMediaFile(result, `phuc-hoi-anh-cu-${Date.now()}.${format}`, { format });
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
    <div className="restore-page module-enter">
      <div className="restore-hero">
        <h2>Phục Hồi Ảnh Cũ Bằng AI</h2>
        <p>Tự động sửa chữa vết xước, làm rõ nét và phục dựng ảnh chân dung thờ cúng chuyên nghiệp.</p>
      </div>

      <div className="restore-layout">
        <div className="restore-drop-card">
          <ImageUploader
            onUpload={setUploaded}
            uploaded={uploaded}
            label="Nhấn hoặc kéo ảnh vào đây"
            hint="Định dạng PNG, JPG, hoặc WEBP — tối đa 10MB"
            onError={setError}
          />
          {loading && (
            <div className="restore-progress-card">
              <div className="spinner"></div>
              <div>
                <strong>AI đang phục hồi ảnh...</strong>
                <p>{getModelLabel(selectedModel || defaultModel)} • {formatDuration(liveElapsed)}</p>
              </div>
              <button type="button" className="btn-cancel restore-cancel-btn" onClick={handleCancelGenerate}>
                Huỷ
              </button>
            </div>
          )}

          {result && !loading && uploaded && (
            <div className="restore-compare">
              <ComparisonSlider before={uploaded.url} after={result} beforeLabel="Gốc" afterLabel="Phục hồi" />
            </div>
          )}
          {resultMeta && !loading && (
            <div className="generation-meta restore-meta">
              <span>⏱ Tổng time: <strong>{formatDuration(resultMeta.durationMs)}</strong></span>
              <span>🤖 Model: <strong>{resultMeta.modelName}</strong></span>
              <span>⚙ {resultMeta.ratio} • {resultMeta.resolution}{resultMeta.mode ? ` • ${resultMeta.mode}` : ''}</span>
            </div>
          )}
          {result && !loading && (
            <div className="restore-download-actions">
              {onSendToLayout && (
                <button
                  type="button"
                  className="btn-primary restore-download-btn"
                  onClick={() => onSendToLayout(result)}
                  style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff' }}
                >
                  🖨️ Chuyển sang In Ấn
                </button>
              )}
              <button type="button" className="btn-secondary restore-download-btn" onClick={() => handleDownload('png')}>
                ⬇ Tải PNG
              </button>
              <button type="button" className="btn-secondary restore-download-btn" onClick={() => handleDownload('jpg')}>
                ⬇ Tải JPG
              </button>
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

        <div className="restore-controls">
          <div className="restore-tabs">
            <button
              className={activePanel === 'enhance' ? 'active' : ''}
              onClick={() => setActivePanel('enhance')}
            >
              Tăng cường
            </button>
            <button
              className={activePanel === 'mask' ? 'active' : ''}
              onClick={() => setActivePanel('mask')}
            >
              Chỉnh sửa vùng chọn
            </button>
          </div>

          {activePanel === 'enhance' ? (
            <>
              <button className="btn-primary restore-submit" onClick={handleGenerate} disabled={loading || !uploaded || (!selectedModel && !defaultModel)}>
                {loading ? `⏳ Đang phục hồi ${formatDuration(liveElapsed)}...` : '✨ Bắt đầu phục hồi ảnh'}
              </button>
              <p className="hint-text restore-quick-hint">Nút luôn hiển thị — chọn xong tuỳ chọn bên dưới là bấm được ngay, không cần cuộn lên.</p>

              <div className="restore-accordion-scroll">
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
                  id="request"
                  icon="📝"
                  title="Yêu cầu thêm (tùy chọn)"
                  summary={extraRequestSummary}
                  openSections={openSections}
                  onToggle={toggleSection}
                >
                  <textarea
                    className="restore-textarea"
                    rows="4"
                    value={extraRequest}
                    onChange={(event) => setExtraRequest(event.target.value)}
                    placeholder="Ví dụ: làm cho màu áo xanh hơn, xóa vật thể, giữ nền cũ..."
                  />
                </AccordionSection>

                <AccordionSection
                  id="precision"
                  icon="✧"
                  title="Chế độ Ảnh Thờ Precision"
                  summary={precisionMode ? 'Đang bật' : 'Đang tắt'}
                  openSections={openSections}
                  onToggle={toggleSection}
                >
                  <div className="precision-card">
                    <div>
                      <span className="precision-icon">✧</span>
                      <strong>Chế độ Ảnh Thờ Precision</strong>
                      <button
                        className="tooltip-btn"
                        type="button"
                        title="Tối ưu cho ảnh chân dung thờ cúng: trang nghiêm, giữ nhận diện khuôn mặt và thần thái gốc."
                      >
                        (?)
                      </button>
                    </div>
                    <button
                      type="button"
                      className={'switch-pill' + (precisionMode ? ' on' : '')}
                      onClick={() => setPrecisionMode(!precisionMode)}
                      aria-label="Bật chế độ ảnh thờ precision"
                    >
                      <span />
                    </button>
                  </div>
                </AccordionSection>

                <AccordionSection
                  id="preset"
                  icon="🖼"
                  title="Kiểu phục dựng"
                  summary={preset.label}
                  openSections={openSections}
                  onToggle={toggleSection}
                >
                  <div className="preset-list">
                    {config.worshipRestorePresets.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={preset.id === item.id ? 'selected' : ''}
                        onClick={() => setPreset(item)}
                      >
                        <strong>{item.label}</strong>
                        <span>{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </AccordionSection>

                <AccordionSection
                  id="enhancements"
                  icon="🛠"
                  title="Tùy chọn phục hồi"
                  summary={`${selectedEnhancements.length} mục`}
                  openSections={openSections}
                  onToggle={toggleSection}
                >
                  <div className="restore-option-grid">
                    {config.restoreEnhancements.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={selectedEnhancements.includes(item.id) ? 'selected' : ''}
                        onClick={() => toggleEnhancement(item.id)}
                      >
                        <span>{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </AccordionSection>

                <AccordionSection
                  id="level"
                  icon="📊"
                  title="Mức độ hư tổn"
                  summary={level.label}
                  openSections={openSections}
                  onToggle={toggleSection}
                >
                  <div className="restore-segment">
                    {config.restorationLevels.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={level.id === item.id ? 'active' : ''}
                        onClick={() => setLevel(item)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <p className="hint-text">{level.desc}</p>
                </AccordionSection>
              </div>
            </>

          ) : (
            <div className="mask-placeholder">
              <div>✎</div>
              <h3>Chỉnh sửa vùng chọn</h3>
              <p>Tính năng mask vùng chọn sẽ được mở rộng ở phiên bản sau. Hiện tại bạn có thể nhập yêu cầu vùng cần sửa vào ô “Yêu cầu thêm”.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoRestorer;
