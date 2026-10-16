import React from 'react';
import {
  getDefaultMediaSettings,
  getIdPhotoModelRankInfo,
  getMediaOptionsFromSource,
  getPriceForModelWithSettings,
  getRecommendedImageModels,
  modelHasModePicker,
  getModelEvaluation,
  findOptimalIdPhotoModel
} from '../lib/modelCatalog.js';

const getModelKey = (model) => String(model?.id_base || model?.model || model?.name || '');

const normalizeText = (value) => String(value || '').toLowerCase();

const formatDuration = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return '';
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
};

const getModelRecommendation = (model) => {
  const name = normalizeText(`${model?.name || ''} ${model?.title || ''} ${model?.model || ''} ${model?.id_base || ''}`);
  const description = normalizeText(model?.description || '');
  const status = normalizeText(model?.status || model?.state || '');
  const text = `${name} ${description}`;

  if (status.includes('maint') || status.includes('pause') || status.includes('off')) {
    return {
      tone: 'warning',
      title: 'Model đang bảo trì',
      text: 'Không nên chọn model này lúc này. Nếu cần tạo nhanh, hãy đổi sang GPT Image 2, Seedream hoặc model đang ON.',
    };
  }

  if (text.includes('nano banana pro')) {
    return {
      tone: 'warning',
      title: 'Google Nano Pro',
      text: 'Model Nano Pro thường xuyên quá tải từ nền tảng, có thể chậm. Nếu quá 10 phút chưa có kết quả, hãy thử lại hoặc đổi model.',
    };
  }

  if (text.includes('nano banana 2') || text.includes('nano banana')) {
    return {
      tone: 'info',
      title: 'Nano Banana',
      text: 'Phù hợp ảnh chân dung/ảnh thẻ, giữ mặt tốt. Nên chọn 1K hoặc 2K để tốc độ ổn định hơn.',
    };
  }

  if (text.includes('gpt image')) {
    return {
      tone: 'success',
      title: 'GPT Image',
      text: 'Gợi ý dùng cho ảnh thẻ, phục hồi nhẹ và chỉnh sửa tự nhiên. Cân bằng tốt giữa chất lượng và độ ổn định.',
    };
  }

  if (text.includes('grok')) {
    return {
      tone: 'info',
      title: 'Grok Image',
      text: 'Tạo ảnh nhanh, chi phí vừa phải. Hợp để test prompt hoặc tạo bản nháp trước khi dùng model cao cấp.',
    };
  }

  if (text.includes('midjourney')) {
    return {
      tone: 'info',
      title: 'Midjourney',
      text: 'Mạnh về thẩm mỹ và concept, nhưng ảnh giấy tờ cần kiểm tra kỹ độ giống mặt sau khi tạo.',
    };
  }

  if (text.includes('seedream')) {
    return {
      tone: 'success',
      title: 'Seedream',
      text: 'Tốc độ khá tốt, hợp cho ảnh thương mại và phục hồi cần chi tiết. Có thể thử khi GPT Image bị chậm.',
    };
  }

  if (text.includes('kling')) {
    return {
      tone: 'info',
      title: 'Kling Image',
      text: 'Phù hợp tạo hình ảnh sáng tạo. Với ảnh thẻ nên giữ prompt đơn giản và chọn tỷ lệ chân dung.',
    };
  }

  return {
    tone: 'neutral',
    title: 'Gợi ý chọn model',
    text: 'Ưu tiên model đang ON, có đủ ratio/resolution. Nếu tạo lâu, hãy giảm độ phân giải hoặc đổi sang model Fast/Standard nếu có.',
  };
};

const getOptionHint = (key, value) => {
  const v = normalizeText(value);
  if (key === 'ratio') {
    if (v === 'auto') return 'Auto: để model tự chọn tỷ lệ theo ảnh gốc.';
    if (v === '1:1') return '1:1: vuông, hợp avatar/hồ sơ.';
    if (v === '3:4' || v === '4:5' || v === '2:3') return 'Tỷ lệ dọc, hợp ảnh thẻ/chân dung.';
    if (v === '9:16') return 'Dọc cao, hợp mobile/story.';
    if (v === '16:9' || v === '21:9') return 'Ngang rộng, không tối ưu cho ảnh thẻ.';
  }
  if (key === 'resolution') {
    if (v.includes('1k') || v === 'standard') return 'Nhanh hơn, tiết kiệm Credits, phù hợp test.';
    if (v.includes('2k')) return 'Cân bằng chất lượng và tốc độ.';
    if (v.includes('4k') || v.includes('8k') || v.includes('10k') || v.includes('12k')) return 'Rất nét nhưng có thể lâu hơn và tốn Credits hơn.';
  }
  if (key === 'mode') {
    if (v.includes('fast') || v.includes('vip 1')) return 'Tốc độ cao, ổn định — nên dùng khi cần nhanh.';
    if (v.includes('standard')) return 'Cân bằng giữa chi phí và tốc độ.';
    if (v.includes('relax') || v.includes('slow')) return 'Tiết kiệm hơn nhưng xử lý chậm.';
    if (v.includes('vip 2') || v.includes('vip 3')) return 'Ưu tiên tốc độ cao hơn, thường tốn Credits hơn.';
  }
  return '';
};

const OptionSelect = ({ label, value, options, settingKey, onChange }) => {
  const hint = getOptionHint(settingKey, value);
  return (
    <div className="model-option-row">
      <label>{label}</label>
      <select value={value || ''} onChange={(event) => onChange(settingKey, event.target.value)}>
        {options.map((item) => (
          <option key={item.type} value={item.type}>
            {item.name || item.type}{item.price ? ` • ${item.price} cr` : ''}
          </option>
        ))}
      </select>
      {hint && <small className="model-option-hint">{hint}</small>}
    </div>
  );
};

const ModelPicker = ({
  models = [],
  loading = false,
  error = '',
  selectedModel,
  settings = {},
  onModelChange,
  onSettingsChange,
  embedded = false,
}) => {
  const displayModels = React.useMemo(() => getRecommendedImageModels(models), [models]);
  const optimalInfo = React.useMemo(() => findOptimalIdPhotoModel(models), [models]);
  const currentModel = selectedModel || displayModels[0] || models[0] || null;
  const opts = getMediaOptionsFromSource(currentModel);
  const activeSettings = currentModel ? { ...getDefaultMediaSettings(currentModel, settings), ...settings } : settings;
  const price = currentModel ? getPriceForModelWithSettings(currentModel, activeSettings) : null;
  const recommendation = currentModel ? getModelRecommendation(currentModel) : null;
  const currentRankInfo = currentModel ? getIdPhotoModelRankInfo(currentModel) : null;
  const currentEvaluation = currentModel ? getModelEvaluation(currentModel) : null;

  const updateSetting = (key, value) => {
    onSettingsChange?.({ ...activeSettings, [key]: value });
  };

  const handleApplyOptimal = () => {
    if (!optimalInfo?.model) return;
    onModelChange?.(optimalInfo.model);
    onSettingsChange?.({
      ...getDefaultMediaSettings(optimalInfo.model, activeSettings),
      ...optimalInfo.settings
    });
  };

  const handleModelSelect = (event) => {
    const next = displayModels.find((item) => getModelKey(item) === event.target.value)
      || models.find((item) => getModelKey(item) === event.target.value);
    if (!next) return;
    onModelChange?.(next);
    onSettingsChange?.(getDefaultMediaSettings(next, activeSettings));
  };

  return (
    <div className={(embedded ? 'model-picker embedded' : 'panel-section model-picker')}>
      {!embedded && (
        <div className="model-picker-header">
          <div className="model-picker-title">🤖 Lựa chọn Model AI</div>
          <span className="model-count">{loading ? 'Đang tải...' : `${models.length} model khả dụng`}</span>
        </div>
      )}
      {embedded && (
        <div className="model-picker-compact-count">
          {loading ? 'Đang tải model AI...' : `${models.length} model khả dụng từ API`}
        </div>
      )}

      {optimalInfo?.model && (
        <div className="model-optimal-banner">
          <div className="optimal-banner-header">
            <span className="optimal-pulse-dot"></span>
            <span className="optimal-title">
              🌐 Web Check: Model <strong>{optimalInfo.model.name || optimalInfo.model.model}</strong> tối ưu nhất cho ảnh thẻ
            </span>
          </div>
          <div className="optimal-banner-desc">
            {optimalInfo.evaluation?.speed} • {optimalInfo.evaluation?.suitability}
          </div>
          {getModelKey(currentModel) !== getModelKey(optimalInfo.model) && (
            <button
              type="button"
              className="btn-apply-optimal-model"
              onClick={handleApplyOptimal}
            >
              🎯 1-Click: Chọn Model Tối Ưu Cho Ảnh Thẻ
            </button>
          )}
        </div>
      )}

      <select
        className="model-select-card"
        value={getModelKey(currentModel)}
        onChange={handleModelSelect}
        disabled={loading || !displayModels.length}
      >
        {loading && <option>Đang tải model AI...</option>}
        {!loading && !displayModels.length && <option>Chưa có model khả dụng</option>}
        {!loading && displayModels.map((item) => {
          const evalData = getModelEvaluation(item);
          const rankInfo = getIdPhotoModelRankInfo(item);
          const avgText = rankInfo.avgDurationMs ? ` • TB ${formatDuration(rankInfo.avgDurationMs)}` : '';
          const tagPrefix = evalData?.tag ? `[${evalData.tag}] ` : '';
          return (
            <option key={getModelKey(item)} value={getModelKey(item)}>
              {tagPrefix}{item.name || item.title || item.model || item.id_base}{avgText}
            </option>
          );
        })}
      </select>

      {error && <p className="hint-text" style={{ color: 'var(--danger)' }}>⚠ {error}</p>}

      {currentModel && (
        <div className="model-meta">
          <strong>{currentModel.name || currentModel.title || currentModel.model || currentModel.id_base}</strong>
          {currentModel.description && <p>{currentModel.description}</p>}
          <div className="model-badges">
            {currentEvaluation?.badge && (
              <span className={`model-badge ${currentEvaluation.badgeClass || ''}`}>
                {currentEvaluation.badge}
              </span>
            )}
            {currentEvaluation?.speed && (
              <span className="model-badge badge-speed">
                {currentEvaluation.speed}
              </span>
            )}
            {currentModel.server && <span className="model-badge">{currentModel.server}</span>}
            {currentModel.status && <span className="model-badge">{currentModel.status}</span>}
            {price !== null && price !== undefined && <span className="model-badge">{price} Credits</span>}
            {opts.ratios.length > 0 && <span className="model-badge">{opts.ratios.length} ratios</span>}
            {opts.resolutions.length > 0 && <span className="model-badge">{opts.resolutions.length} res</span>}
            {opts.modes.length > 0 && <span className="model-badge">{opts.modes.length} modes</span>}
          </div>
        </div>
      )}

      {recommendation && (
        <div className={`model-recommendation ${recommendation.tone}`}>
          <div className="model-rec-title">⚡ {recommendation.title}</div>
          <p>{recommendation.text}</p>
        </div>
      )}

      {currentModel && (
        <div className="model-options">
          {opts.ratios.length > 0 && (
            <OptionSelect
              label="Tỷ lệ ảnh"
              settingKey="ratio"
              value={activeSettings.ratio || ''}
              options={opts.ratios}
              onChange={updateSetting}
            />
          )}

          {opts.resolutions.length > 0 && (
            <OptionSelect
              label="Độ phân giải"
              settingKey="resolution"
              value={activeSettings.resolution || ''}
              options={opts.resolutions}
              onChange={updateSetting}
            />
          )}

          {modelHasModePicker(currentModel) && opts.modes.length > 0 && (
            <OptionSelect
              label="Chế độ"
              settingKey="mode"
              value={activeSettings.mode || ''}
              options={opts.modes}
              onChange={updateSetting}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ModelPicker;