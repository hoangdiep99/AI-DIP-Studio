/**
 * Model Catalog & API Body Builder for AI DIP Studio
 * Clean source: normalized helpers for image model options and generateImage body.
 */

const OFFLINE_STATUSES = new Set(['maintenance', 'off', 'disabled', 'inactive', 'offline', 'down']);

export function normalizeMediaOption(opt) {
  if (opt != null && typeof opt === 'object') {
    const type = String(opt.type || opt.value || opt.id || '').trim();
    const name = String(opt.name || opt.label || type || '').trim();
    return {
      type: type || name,
      name: name || type,
      group: opt.group != null ? String(opt.group) : undefined,
      group_subtitle: opt.group_subtitle != null ? String(opt.group_subtitle) : undefined,
      description: opt.description != null ? String(opt.description) : undefined,
      price: typeof opt.price === 'number' ? opt.price : undefined,
      status: opt.status != null ? String(opt.status) : undefined,
      value: opt.value != null ? String(opt.value) : undefined,
    };
  }

  const raw = String(opt ?? '').trim();
  const asNum = Number(raw);
  return {
    type: raw,
    name: Number.isFinite(asNum) && raw !== '' ? `${raw}s` : raw,
  };
}

export function normalizeMediaOptions(options) {
  if (!Array.isArray(options)) return [];
  return options.map(normalizeMediaOption).filter((item) => item.type);
}

function isNanoBananaProModel(model) {
  if (!model || typeof model !== 'object') return false;
  const text = `${model.name || ''} ${model.title || ''} ${model.model || ''} ${model.id_base || ''}`.toLowerCase();
  return /nano banana pro|google_image_gen_banana_pro/i.test(text);
}

function getModelRatioOptions(model) {
  const rawRatios = normalizeMediaOptions(model?.ratios);
  const ratioTypes = rawRatios.map((item) => String(item.type || '').trim()).filter(Boolean);
  const hasAuto = ratioTypes.some((type) => String(type).toLowerCase() === 'auto');

  if (!isNanoBananaProModel(model)) {
    return rawRatios;
  }

  const preferredOrder = ['auto', '3:4', '2:3', '16:9', '9:16', '4:5'];
  const normalized = rawRatios.map((item) => ({
    type: String(item.type || '').trim(),
    name: item.name || String(item.type || '').trim(),
  })).filter((item) => item.type);

  const ratioMap = new Map(normalized.map((item) => [String(item.type || '').toLowerCase(), item]));
  const ordered = preferredOrder.map((type) => {
    const key = type.toLowerCase();
    if (ratioMap.has(key)) return ratioMap.get(key);
    return { type, name: type };
  });

  if (!hasAuto) {
    ordered[0] = { type: 'auto', name: 'auto' };
  }

  return ordered;
}

function getModelModes(model) {
  return normalizeMediaOptions(model?.modes);
}

export function modelHasModePicker(model) {
  return Array.isArray(getModelModes(model)) && getModelModes(model).length > 0;
}

export function getMediaOptionsFromSource(source) {
  if (!source) {
    return { ratios: [], resolutions: [], durations: [], modes: [] };
  }
  return {
    ratios: getModelRatioOptions(source),
    resolutions: normalizeMediaOptions(source.resolutions),
    durations: normalizeMediaOptions(source.durations),
    modes: getModelModes(source),
  };
}

export function pickValidOptionType(options, current) {
  const list = normalizeMediaOptions(options);
  const cur = String(current || '').trim();
  if (cur && list.some((item) => item.type === cur)) return cur;

  // Nếu người dùng yêu cầu tỷ lệ dọc ảnh thẻ (2:3 hoặc 3:4) nhưng model không có đúng nhãn đó,
  // tự động ánh xạ sang tỷ lệ chân dung tối ưu nhất có sẵn (ưu tiên 2:3, 3:4, 4:5, 9:16)
  if (cur === '2:3' || cur === '3:4' || cur === '4:6') {
    const portraitMatch = list.find((item) => /^(2:3|3:4|4:5|4:6|9:16)$/i.test(item.type));
    if (portraitMatch) return portraitMatch.type;
  }

  // Đối với ảnh thẻ, nếu có sẵn tỷ lệ đứng (3:4, 2:3) thì ưu tiên hơn rơi vào auto hoặc 1:1
  const defaultPortrait = list.find((item) => /^(2:3|3:4)$/i.test(item.type));
  if (defaultPortrait) return defaultPortrait.type;

  return list[0]?.type || '';
}

export function resolveImageActionType(model) {
  const fromModel = String(model?.action_type || model?.actionType || '').trim();
  if (fromModel) return fromModel;
  return 'create';
}

export function isModelStatusOnline(model) {
  const raw = String(model?.status ?? model?.state ?? '').toLowerCase().trim();
  if (!raw) return true;
  return !OFFLINE_STATUSES.has(raw) && raw !== 'off' && raw !== 'pause';
}

export function isImageModel(model) {
  if (!model || typeof model !== 'object') return false;

  const raw = `${model.name || ''} ${model.title || ''} ${model.model || ''} ${model.id_base || ''} ${model.description || ''} ${model.server || ''}`.toLowerCase();
  const typeHint = String(model.type || model.category || model.group || model.server || '').toLowerCase();

  const imageSignals = ['image', 'photo', 'picture', 'portrait', 'avatar', 'face', 'frame'];
  const nonImageSignals = ['video', 'audio', 'music', 'voice', 'lipsync', 'lip sync', 'lip-sync', 'dance', 'seedance', 'movie', 'clip', 'sound', 'song', 'sing', 'karaoke', 'tts', 'speech', 'stream', 'record'];

  if (nonImageSignals.some((term) => raw.includes(term) || typeHint.includes(term))) return false;
  if (imageSignals.some((term) => raw.includes(term) || typeHint.includes(term))) return true;

  if (model.durations || model.duration || model.video || model.audio || model.music || model.voice) return false;
  if (model.ratios || model.resolutions || model.modes) return true;

  return true;
}

const PRIORITY_IMAGE_MODELS = [
  /nano banana 2(\.1)?\b|google_image_gen_banana_2/i,
  /gpt-image|gpt image 2|imagegen_2_0/i,
  /seedream-5|seedream/i,
  /nano banana pro/i,
  /nano banana$/i,
  /grok image/i
];

const ID_PHOTO_MODEL_STATS_KEY = 'aidip_id_photo_model_stats_v1';

function normalizeModelText(model) {
  return `${model?.name || ''} ${model?.title || ''} ${model?.model || ''} ${model?.id_base || ''} ${model?.description || ''}`.toLowerCase();
}

function hasFastIdPhotoSignal(model) {
  const text = normalizeModelText(model);
  return /nano banana 2|google_image_gen_banana_2|gpt image 2|imagegen_2_0|seedream/i.test(text) && !/cheap|maintenance/i.test(text);
}

function hasUnstableSignal(model) {
  const status = String(model?.status || model?.state || '').toLowerCase();
  if (status.includes('maint') || status.includes('off') || status.includes('pause') || status.includes('disabled')) return true;
  const text = normalizeModelText(model);
  return /maintenance|bảo trì|paused|offline|overload|quá tải/i.test(text);
}

function readModelStats() {
  if (typeof localStorage === 'undefined') return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(ID_PHOTO_MODEL_STATS_KEY) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writeModelStats(stats) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ID_PHOTO_MODEL_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    // Không chặn tạo ảnh nếu trình duyệt chặn localStorage.
  }
}

export function getModelStatsKey(model) {
  return getModelKey(model);
}

export function recordIdPhotoModelRun(model, { durationMs = null, success = false, error = '' } = {}) {
  const key = getModelStatsKey(model);
  if (!key) return;
  const stats = readModelStats();
  const previous = stats[key] || { runs: 0, successes: 0, failures: 0, avgDurationMs: null, lastError: '', lastRunAt: 0 };
  const nextRuns = Number(previous.runs || 0) + 1;
  const nextSuccesses = Number(previous.successes || 0) + (success ? 1 : 0);
  const nextFailures = Number(previous.failures || 0) + (success ? 0 : 1);
  const validDuration = Number.isFinite(durationMs) && durationMs > 0;
  const previousAvg = Number(previous.avgDurationMs || 0);
  const avgDurationMs = success && validDuration
    ? previousAvg > 0
      ? Math.round((previousAvg * Math.max(0, nextSuccesses - 1) + durationMs) / Math.max(1, nextSuccesses))
      : Math.round(durationMs)
    : previous.avgDurationMs || null;

  stats[key] = {
    runs: nextRuns,
    successes: nextSuccesses,
    failures: nextFailures,
    avgDurationMs,
    lastError: success ? '' : String(error || '').slice(0, 220),
    lastRunAt: Date.now(),
  };
  writeModelStats(stats);
}

export function getIdPhotoModelRankInfo(model) {
  const stats = readModelStats()[getModelStatsKey(model)] || null;
  const runs = Number(stats?.runs || 0);
  const successes = Number(stats?.successes || 0);
  const failures = Number(stats?.failures || 0);
  const avgDurationMs = Number(stats?.avgDurationMs || 0);
  const successRate = runs > 0 ? successes / runs : null;
  const isFastByDefault = hasFastIdPhotoSignal(model);
  const isUnstableByDefault = hasUnstableSignal(model);
  const isFastByHistory = successes >= 1 && avgDurationMs > 0 && avgDurationMs <= 90000;
  const isUnstableByHistory = failures >= 2 && (successRate === null || successRate < 0.5);

  return {
    stats,
    runs,
    successes,
    failures,
    avgDurationMs,
    successRate,
    recommended: (isFastByDefault || isFastByHistory) && !isUnstableByHistory && !isUnstableByDefault,
    unstable: isUnstableByDefault || isUnstableByHistory,
  };
}

function getModelPriorityScore(model) {
  const text = normalizeModelText(model);
  const priorityIndex = PRIORITY_IMAGE_MODELS.findIndex((matcher) => matcher.test(text));
  if (priorityIndex !== -1) {
    let score = (PRIORITY_IMAGE_MODELS.length - priorityIndex) * 100;
    const rankInfo = getIdPhotoModelRankInfo(model);
    if (rankInfo.successes > 0) score += Math.min(120, rankInfo.successes * 20);
    if (rankInfo.avgDurationMs > 0) {
      if (rankInfo.avgDurationMs <= 60000) score += 80;
      else if (rankInfo.avgDurationMs <= 120000) score += 35;
      else if (rankInfo.avgDurationMs >= 300000) score -= 90;
    }
    score -= Math.min(220, rankInfo.failures * 80);
    if (hasUnstableSignal(model)) score -= 180;
    return score;
  }

  let score = 0;
  const rankInfo = getIdPhotoModelRankInfo(model);
  if (hasFastIdPhotoSignal(model)) score += 80;
  if (text.includes('fast')) score += 20;
  if (text.includes('cheap')) score += 15;
  if (text.includes('vip')) score += 10;
  if (text.includes('standard')) score += 8;
  if (text.includes('low')) score += 5;
  if (text.includes('image') && !text.includes('video')) score += 2;
  if (rankInfo.successes > 0) score += Math.min(100, rankInfo.successes * 20);
  if (rankInfo.avgDurationMs > 0 && rankInfo.avgDurationMs <= 90000) score += 60;
  score -= Math.min(220, rankInfo.failures * 80);
  if (hasUnstableSignal(model)) score -= 180;
  return score;
}

function sortModelsByPriority(models) {
  return [...models].sort((a, b) => {
    const aScore = getModelPriorityScore(a);
    const bScore = getModelPriorityScore(b);
    if (aScore !== bScore) return bScore - aScore;

    const aText = `${a?.name || ''} ${a?.title || ''} ${a?.model || ''} ${a?.id_base || ''}`.toLowerCase();
    const bText = `${b?.name || ''} ${b?.title || ''} ${b?.model || ''} ${b?.id_base || ''}`.toLowerCase();
    return aText.localeCompare(bText);
  });
}

export function getRecommendedImageModels(models) {
  if (!Array.isArray(models)) return [];
  return sortModelsByPriority(models);
}

// Gợi ý mặc định khi vào app: người dùng đã test và thấy "Nano Banana 2" với
// resolution 1K + mode VIP 2 cho tốc độ tạo ảnh nhanh và ổn định nhất.
// (Không nhầm với "Nano Banana 2 x Cheap" hoặc "Nano Banana Pro".)
export const PREFERRED_ID_PHOTO_SETTINGS = { resolution: '1k', mode: 'vip2' };
export const PREFERRED_RESTORE_SETTINGS = { ratio: 'auto', resolution: '1k', mode: 'vip2' };

export function getModelEvaluation(model) {
  if (!model) return null;
  const text = normalizeModelText(model);
  const status = String(model?.status || model?.state || '').toLowerCase();
  const isMaintenance = status.includes('maint') || status.includes('off') || status.includes('pause') || status.includes('disabled');

  if (isMaintenance) {
    return {
      tier: 'maintenance',
      badge: '⚠ Đang bảo trì',
      badgeClass: 'badge-maint',
      speed: 'Tạm ngưng',
      suitability: 'Server đang bảo trì — không nên chọn',
      isOptimal: false,
      tag: 'BẢO TRÌ'
    };
  }

  // Nano Banana 2 & 2.1 (Google Veo)
  if (/banana 2(\.1)?\b|google_image_gen_banana_2/i.test(text) && !/cheap|pro/i.test(text)) {
    return {
      tier: 'top_recommended',
      badge: '⭐ Tối ưu ảnh thẻ (Chuẩn nhất)',
      badgeClass: 'badge-recommended',
      speed: '⚡ Siêu tốc (~8-15s)',
      suitability: 'Đạt chuẩn 100% tỷ lệ mặt, giữ nguyên đường nét thật, trong trẻo tự nhiên',
      isOptimal: true,
      tag: 'TỐI ƯU ẢNH THẺ',
      recommendedSettings: { ratio: 'auto', resolution: '1k', mode: 'vip2' }
    };
  }

  // GPT Image 2 / Flare
  if (/gpt-image|gpt image 2|imagegen_2_0/i.test(text)) {
    return {
      tier: 'fast_stable',
      badge: '⚡ Nhanh & Ổn định',
      badgeClass: 'badge-fast',
      speed: '⚡ Nhanh (~12-20s)',
      suitability: 'Ánh sáng studio cân đối, màu sắc tự nhiên, xử lý mượt',
      isOptimal: false,
      tag: 'NHANH & ỔN ĐỊNH'
    };
  }

  // Nano Banana Pro
  if (/banana pro|google_image_gen_banana_pro/i.test(text) && !/cheap|reason/i.test(text)) {
    return {
      tier: 'pro_detail',
      badge: '💎 Chi tiết Pro (4K)',
      badgeClass: 'badge-pro',
      speed: '⏳ ~25-45s',
      suitability: 'Độ chi tiết cực cao, phù hợp phục hồi ảnh và in phóng lớn',
      isOptimal: false,
      tag: 'CHI TIẾT CAO CẤP'
    };
  }

  // Seedream
  if (/seedream/i.test(text)) {
    return {
      tier: 'creative',
      badge: '✨ Sắc nét chi tiết',
      badgeClass: 'badge-creative',
      speed: '⚡ Nhanh (~15-25s)',
      suitability: 'Chi tiết tóc và da lên nét, độ tương phản studio tốt',
      isOptimal: false,
      tag: 'NÉT CHI TIẾT'
    };
  }

  // Imagen
  if (/imagen/i.test(text)) {
    return {
      tier: 'budget',
      badge: '🌿 Tiết kiệm Credits',
      badgeClass: 'badge-budget',
      speed: '⚡ Nhanh',
      suitability: 'Chi phí credits thấp nhất, hợp thử nghiệm',
      isOptimal: false,
      tag: 'TIẾT KIỆM'
    };
  }

  return {
    tier: 'standard',
    badge: 'Standard AI',
    badgeClass: 'badge-standard',
    speed: 'Bình thường',
    suitability: 'Model khả dụng',
    isOptimal: false,
    tag: 'ONLINE'
  };
}

/**
 * Tự động tìm model tối ưu nhất cho ảnh thẻ từ danh sách trực tuyến
 */
export function findOptimalIdPhotoModel(models) {
  if (!Array.isArray(models) || models.length === 0) return null;
  // Lọc chỉ lấy model đang ON, không bị bảo trì
  const onlineModels = models.filter((m) => {
    const status = String(m?.status || m?.state || '').toLowerCase();
    return !status.includes('maint') && !status.includes('off') && !status.includes('pause') && !status.includes('disabled');
  });

  const pool = onlineModels.length ? onlineModels : models;
  const sorted = sortModelsByPriority(pool);
  
  // Ưu tiên model Nano Banana 2 hoặc 2.1
  const optimal = sorted.find((m) => {
    const evalData = getModelEvaluation(m);
    return evalData?.isOptimal;
  });

  const bestModel = optimal || sorted[0] || null;
  return {
    model: bestModel,
    evaluation: getModelEvaluation(bestModel),
    settings: { ratio: 'auto', resolution: '1k', mode: 'vip2' }
  };
}

/**
 * Chọn model mặc định khi mở app: ưu tiên "Nano Banana 2" (không phải bản
 * Cheap/Pro) vì đây là lựa chọn người dùng xác nhận tạo ảnh nhanh nhất.
 * Nếu danh sách model không có, rơi về model đầu tiên theo thứ tự ưu tiên hiện có.
 */
export function findPreferredDefaultModel(models) {
  if (!Array.isArray(models) || models.length === 0) return null;
  const optimal = findOptimalIdPhotoModel(models);
  return optimal?.model || models[0] || null;
}


const IMAGE_MODEL_FALLBACKS = [
  {
    id_base: 'imagegen_2_0',
    model: 'imagegen_2_0',
    name: 'GPT Image 2',
    title: 'GPT Image 2',
    description: 'Model ảnh nhanh và chuẩn, phù hợp ảnh thẻ, chân dung và quảng cáo.',
    server: 'Open',
    status: 'ON',
    ratios: [{ type: '1:1', name: '1:1' }, { type: '3:4', name: '3:4' }, { type: '4:3', name: '4:3' }],
    resolutions: [{ type: '1k', name: '1K' }, { type: '2k', name: '2K' }, { type: '4k', name: '4K' }],
    modes: [{ type: 'low', name: 'low' }, { type: 'medium', name: 'medium' }, { type: 'high', name: 'high' }]
  },
  {
    id_base: 'grok_imagine',
    model: 'grok_imagine',
    name: 'Grok Image',
    title: 'Grok Image',
    description: 'Model tạo ảnh nhanh, hợp tạo đồ chân thực và ảnh mẫu.',
    server: 'Grok',
    status: 'ON',
    ratios: [{ type: '1:1', name: '1:1' }, { type: '3:4', name: '3:4' }],
    resolutions: [{ type: '1k', name: '1K' }, { type: '2k', name: '2K' }, { type: '4k', name: '4K' }],
    modes: [{ type: 'quality', name: 'quality' }]
  },
  {
    id_base: 'google_image_gen_banana_pro',
    model: 'google_image_gen_banana_pro',
    name: 'Nano Banana Pro',
    title: 'Nano Banana Pro',
    description: 'Nano Banana Pro phù hợp ảnh chân dung, hỗ trợ nhiều tốc độ và độ nét.',
    server: 'Google_veo',
    status: 'ON',
    ratios: [{ type: '1:1', name: '1:1' }, { type: '3:4', name: '3:4' }],
    resolutions: [{ type: '1k', name: '1K' }, { type: '2k', name: '2K' }, { type: '4k', name: '4K' }],
    modes: [{ type: 'relaxed', name: 'relaxed' }, { type: 'standard', name: 'standard' }, { type: 'fast', name: 'fast' }, { type: 'vip', name: 'vip' }]
  },
  {
    id_base: 'google_image_gen_banana_2_cheap',
    model: 'google_image_gen_banana_2_cheap',
    name: 'Nano Banana 2 x Cheap',
    title: 'Nano Banana 2 x Cheap',
    description: 'Nano Banana 2 x Cheap cho ảnh nhanh, chi phí thấp và vẫn giữ mặt tốt.',
    server: 'Google_veo',
    status: 'ON',
    ratios: [{ type: '1:1', name: '1:1' }, { type: '3:4', name: '3:4' }],
    resolutions: [{ type: '1k', name: '1K' }, { type: '2k', name: '2K' }],
    modes: [{ type: 'cheap', name: 'cheap' }]
  },
  {
    id_base: 'google_image_gen_banana_2',
    model: 'google_image_gen_banana_2',
    name: 'Nano Banana 2',
    title: 'Nano Banana 2',
    description: 'Nano Banana 2 cho ảnh thẻ, tốc độ cao và chi phí hợp lý.',
    server: 'Google_veo',
    status: 'ON',
    ratios: [{ type: '1:1', name: '1:1' }, { type: '3:4', name: '3:4' }],
    resolutions: [{ type: '1k', name: '1K' }, { type: '2k', name: '2K' }],
    modes: [{ type: 'vip', name: 'vip' }, { type: 'vip2', name: 'vip2' }, { type: 'vip3', name: 'vip3' }]
  },
  {
    id_base: 'google_image_gen_banana',
    model: 'google_image_gen_banana',
    name: 'Nano Banana',
    title: 'Nano Banana',
    description: 'Nano Banana phù hợp ảnh thẻ/chân dung, độ ổn định cao.',
    server: 'Google_veo',
    status: 'ON',
    ratios: [{ type: '1:1', name: '1:1' }, { type: '3:4', name: '3:4' }],
    resolutions: [{ type: '1k', name: '1K' }, { type: '2k', name: '2K' }],
    modes: [{ type: 'standard', name: 'standard' }, { type: 'fast', name: 'fast' }]
  }
];

function getModelKey(model) {
  return String(model?.id_base || model?.model || model?.id || model?.model_id || model?.name || '').trim();
}

export function sanitizeImageModelList(models) {
  if (!Array.isArray(models)) return [...IMAGE_MODEL_FALLBACKS];
  const filtered = models
    .filter((item) => item && (item.model || item.id_base || item.id || item.model_id || item.name))
    .filter(isModelStatusOnline)
    .filter(isImageModel);

  const normalized = sortModelsByPriority(filtered);
  if (normalized.length >= 6) return normalized;

  const existing = new Set(normalized.map((item) => getModelKey(item)));
  const supplement = IMAGE_MODEL_FALLBACKS.filter((item) => !existing.has(getModelKey(item)));
  return sortModelsByPriority([...normalized, ...supplement]);
}

const MODEL_PRICE_TABLES = [
  {
    match: /gpt image 2|imagegen_2_0|gpt_image_2/i,
    table: {
      low: { '1k': 720, '2k': 900, '4k': 1080, '4k_upscale': 1400, '8k': 1500, '10k': 2000, '12k': 2500 },
      medium: { '1k': 1296, '2k': 2592, '4k': 3888, '8k': 4230, '10k': 4590, '12k': 4950 },
      high: { '1k': 4536, '2k': 9072, '4k': 13608, '8k': 10000, '10k': 14400, '12k': 16200 },
      basic: { '1k': 450, '2k': 550, '4k': 650, '4k_upscale': 850, '8k': 900, '10k': 1200, '12k': 1500 }
    }
  },
  {
    match: /grok image|grok_imagine/i,
    table: {
      quality: { '1k': 200, '2k': 600, '4k': 1000, '8k': 1500, '10k': 2000, '12k': 2500 }
    }
  },
  {
    match: /nano banana 2 x cheap|google_image_gen_banana_2_cheap/i,
    table: {
      cheap: { '1k': 200, '2k': 300, '4k': 450, '8k': 800, '10k': 1200, '12k': 1500 }
    }
  },
  {
    match: /nano banana 2|google_image_gen_banana_2/i,
    table: {
      vip: { '1k': 400, '2k': 800, '4k': 1400, '8k': 1800, '10k': 2200, '12k': 2800 },
      vip1: { '1k': 400, '2k': 800, '4k': 1400, '8k': 1800, '10k': 2200, '12k': 2800 },
      vip2: { '1k': 400, '2k': 700, '4k': 1200, '8k': 1700, '10k': 2100, '12k': 2600 },
      vip3: { '1k': 400, '2k': 700, '4k': 1200, '8k': 1700, '10k': 2100, '12k': 2600 }
    }
  },
  {
    match: /nano banana pro|google_image_gen_banana_pro/i,
    table: {
      relaxed: { '1k': 300, '2k': 400, '4k': 500, '8k': 900, '10k': 1400, '12k': 2000 },
      standard: { '1k': 400, '2k': 550, '4k': 700, '8k': 1100, '10k': 1600, '12k': 2200 },
      fast: { '1k': 500, '2k': 700, '4k': 1000, '8k': 1400, '10k': 1900, '12k': 2500 },
      vip: { '1k': 600, '2k': 900, '4k': 1500, '8k': 1900, '10k': 2300, '12k': 3000 },
      vip2: { '1k': 700, '2k': 900, '4k': 1700, '8k': 2300, '10k': 2800, '12k': 3500 },
      vip3: { '1k': 600, '2k': 900, '4k': 1500, '8k': 1900, '10k': 2300, '12k': 3000 }
    }
  },
  {
    match: /nano banana$|google_image_gen_banana$/i,
    table: {
      standard: { '1k': 400, '2k': 550, '4k': 700, '8k': 1100, '10k': 1600, '12k': 2200 },
      fast: { '1k': 500, '2k': 700, '4k': 1000, '8k': 1400, '10k': 1900, '12k': 2500 }
    }
  }
];

function normalizePriceKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function getPriceFromTable(model, settings) {
  const key = `${model?.name || ''} ${model?.title || ''} ${model?.model || ''} ${model?.id_base || ''}`.toLowerCase();
  const resolved = MODEL_PRICE_TABLES.find((entry) => entry.match.test(key));
  if (!resolved) return null;

  const resolution = normalizePriceKey(settings.resolution || '1k');
  const mode = normalizePriceKey(settings.mode || settings.action_type || 'standard');
  const table = resolved.table[mode] || resolved.table[normalizePriceKey(settings.role)] || resolved.table[normalizePriceKey(settings.quality)] || resolved.table[normalizePriceKey(settings.type)];
  if (table && Object.prototype.hasOwnProperty.call(table, resolution)) {
    return table[resolution];
  }

  if (resolved.table[mode] && Object.prototype.hasOwnProperty.call(resolved.table[mode], '1k')) {
    return resolved.table[mode]['1k'];
  }

  for (const candidate of Object.values(resolved.table)) {
    if (candidate && Object.prototype.hasOwnProperty.call(candidate, resolution)) {
      return candidate[resolution];
    }
  }

  return null;
}

export function getDefaultMediaSettings(model, preferred = {}) {
  const opts = getMediaOptionsFromSource(model);
  return {
    ratio: pickValidOptionType(opts.ratios, preferred.ratio),
    resolution: pickValidOptionType(opts.resolutions, preferred.resolution),
    mode: modelHasModePicker(model) ? pickValidOptionType(opts.modes, preferred.mode) : '',
  };
}

export function getPriceForModelWithSettings(model, settings = {}) {
  const tablePrice = getPriceFromTable(model, settings);
  if (tablePrice !== null && tablePrice !== undefined) return tablePrice;

  const opts = getMediaOptionsFromSource(model);
  const optionPrice = [...opts.ratios, ...opts.resolutions, ...opts.modes].find((item) => (
    item.type === settings.ratio || item.type === settings.resolution || item.type === settings.mode
  ))?.price;
  return optionPrice ?? model?.price ?? model?.credit ?? model?.credits ?? null;
}

export function buildGenerateImageBody(selectedModel, settings = {}, extra = {}) {
  const model = String(selectedModel?.model || selectedModel?.id_base || '').trim();
  if (!model) throw new Error('Thiếu model — chọn từ danh sách /ai/models');

  const prompt = String(extra.prompt ?? '').trim();
  if (!prompt) throw new Error('Thiếu prompt');

  const activeSource = extra.activeSource || selectedModel;
  const opts = getMediaOptionsFromSource(activeSource);
  const ratio = pickValidOptionType(opts.ratios, settings.ratio);
  const resolution = pickValidOptionType(opts.resolutions, settings.resolution);
  const mode = modelHasModePicker(selectedModel)
    ? pickValidOptionType(opts.modes, settings.mode)
    : '';

  const body = {
    action_type: resolveImageActionType(selectedModel),
    sync: 'false',
    model,
    prompt,
    privacy: extra.privacy || 'PRIVATE',
  };

  if (ratio) body.ratio = ratio;
  if (resolution) body.resolution = resolution;
  if (mode) body.mode = mode;

  if (extra.isEdit) {
    body.editImage = 'true';
    if (extra.base64Image) body.base64Image = extra.base64Image;
  }

  return body;
}