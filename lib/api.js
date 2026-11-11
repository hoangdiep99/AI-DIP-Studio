/**
 * Gommo & OmniVi.AI API Router for AI DIP Studio
 * Quản lý cấu hình API, hỗ trợ OmniVi.AI (v2), Gommo Bridge, Gemini API & OpenAI-compatible.
 */

// Key lưu trữ trong localStorage
const STORAGE_KEYS = {
  API_MODE: 'aidip_api_mode', // 'system' | 'custom' | 'openai'
  GEMINI_KEY: 'aidip_gemini_key',
  DOMAIN: 'aidip_domain',
  CUSTOM_ENDPOINT: 'aidip_custom_endpoint',
  GEMINI_KEY_2: 'aidip_gemini_key_2',
  GEMINI_KEY_3: 'aidip_gemini_key_3',
  ACCESS_TOKEN: 'aidip_access_token',
  // Chế độ 'openai': dùng cho RunningHub hoặc các bên thứ ba tương thích chuẩn OpenAI.
  OPENAI_BASE_URL: 'aidip_openai_base_url',
  OPENAI_API_KEY: 'aidip_openai_api_key',
  OPENAI_MODEL: 'aidip_openai_model',
  RUNNINGHUB_MODE: 'aidip_runninghub_mode',
  RUNNINGHUB_WEBAPP_ID: 'aidip_runninghub_webapp_id',
  RUNNINGHUB_PROMPT_NODE_ID: 'aidip_runninghub_prompt_node_id',
  RUNNINGHUB_PROMPT_FIELD: 'aidip_runninghub_prompt_field',
  RUNNINGHUB_IMAGE_NODE_ID: 'aidip_runninghub_image_node_id',
  RUNNINGHUB_IMAGE_FIELD: 'aidip_runninghub_image_field',
  RUNNINGHUB_RATIO_NODE_ID: 'aidip_runninghub_ratio_node_id',
  RUNNINGHUB_RATIO_FIELD: 'aidip_runninghub_ratio_field',
  RUNNINGHUB_RESOLUTION_NODE_ID: 'aidip_runninghub_resolution_node_id',
  RUNNINGHUB_RESOLUTION_FIELD: 'aidip_runninghub_resolution_field'
};

// Chuẩn hóa domain: loại bỏ https://, http:// và dấu gạch chéo cuối
export function cleanDomain(domain) {
  if (!domain) return '';
  const cleaned = String(domain)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim();
  // Tự động chuyển đổi nếu người dùng hoặc localStorage vẫn lưu tên miền cũ aivideoauto.com
  if (cleaned.toLowerCase() === 'aivideoauto.com') return 'omnivi.ai';
  return cleaned;
}

// Khởi tạo cấu hình mặc định (Mặc định: OmniVi.AI v2)
export function getApiConfig() {
  const rawDomain = localStorage.getItem(STORAGE_KEYS.DOMAIN);
  const domain = cleanDomain(rawDomain) || 'omnivi.ai';
  let customEndpoint = localStorage.getItem(STORAGE_KEYS.CUSTOM_ENDPOINT);
  if (!customEndpoint || customEndpoint.includes('aivideoauto.com') || customEndpoint.includes('gommo.net') || customEndpoint.includes('/account')) {
    customEndpoint = 'https://omnivi.ai/api/v2';
    localStorage.setItem(STORAGE_KEYS.CUSTOM_ENDPOINT, customEndpoint);
  }

  let accessToken = (localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '').trim().replace(/^Bearer\s+/i, '');
  // Nếu là token cũ kiểu Gommo MiniApp (> 120 ký tự base64 kết thúc bằng ==) thì tự động xóa để tránh OmniVi chặn IP vì sai key
  if (accessToken.length > 120 && accessToken.endsWith('==') && accessToken.includes('/')) {
    console.warn('[api] Phát hiện token cũ của AI VIDEO AUTO/Gommo, đang xóa để yêu cầu nhập API Key OmniVi mới');
    accessToken = '';
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  let geminiKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '';
  if (geminiKey.length > 120 && geminiKey.endsWith('==')) {
    geminiKey = '';
    localStorage.removeItem(STORAGE_KEYS.GEMINI_KEY);
  }

  return {
    mode: localStorage.getItem(STORAGE_KEYS.API_MODE) || 'system',
    geminiKey,
    geminiKey2: localStorage.getItem(STORAGE_KEYS.GEMINI_KEY_2) || '',
    geminiKey3: localStorage.getItem(STORAGE_KEYS.GEMINI_KEY_3) || '',
    accessToken,
    customEndpoint,
    domain,
    openaiBaseUrl: localStorage.getItem(STORAGE_KEYS.OPENAI_BASE_URL) || 'https://www.runninghub.ai',
    openaiApiKey: localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY) || '',
    openaiModel: localStorage.getItem(STORAGE_KEYS.OPENAI_MODEL) || 'rhart-image-n-pro-official/edit',
    runningHubMode: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_MODE) || 'standard',
    runningHubWebappId: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_WEBAPP_ID) || '',
    runningHubPromptNodeId: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_PROMPT_NODE_ID) || '3',
    runningHubPromptField: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_PROMPT_FIELD) || 'text',
    runningHubImageNodeId: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_IMAGE_NODE_ID) || '',
    runningHubImageField: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_IMAGE_FIELD) || 'image',
    runningHubRatioNodeId: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_RATIO_NODE_ID) || '28',
    runningHubRatioField: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_RATIO_FIELD) || 'select',
    runningHubResolutionNodeId: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_RESOLUTION_NODE_ID) || '',
    runningHubResolutionField: localStorage.getItem(STORAGE_KEYS.RUNNINGHUB_RESOLUTION_FIELD) || 'select'
  };
}

export function saveApiConfig(config) {
  if (config.mode) localStorage.setItem(STORAGE_KEYS.API_MODE, config.mode);
  if (config.geminiKey !== undefined) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, config.geminiKey);
  if (config.geminiKey2 !== undefined) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY_2, config.geminiKey2);
  if (config.geminiKey3 !== undefined) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY_3, config.geminiKey3);
  if (config.accessToken !== undefined) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, config.accessToken);
  if (config.customEndpoint !== undefined) localStorage.setItem(STORAGE_KEYS.CUSTOM_ENDPOINT, config.customEndpoint);
  if (config.domain !== undefined) {
    const cleaned = cleanDomain(config.domain) || 'omnivi.ai';
    localStorage.setItem(STORAGE_KEYS.DOMAIN, cleaned);
  }
  if (config.openaiBaseUrl !== undefined) localStorage.setItem(STORAGE_KEYS.OPENAI_BASE_URL, config.openaiBaseUrl);
  if (config.openaiApiKey !== undefined) localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, config.openaiApiKey);
  if (config.openaiModel !== undefined) localStorage.setItem(STORAGE_KEYS.OPENAI_MODEL, config.openaiModel);
  if (config.runningHubMode !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_MODE, config.runningHubMode);
  if (config.runningHubWebappId !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_WEBAPP_ID, config.runningHubWebappId);
  if (config.runningHubPromptNodeId !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_PROMPT_NODE_ID, config.runningHubPromptNodeId);
  if (config.runningHubPromptField !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_PROMPT_FIELD, config.runningHubPromptField);
  if (config.runningHubImageNodeId !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_IMAGE_NODE_ID, config.runningHubImageNodeId);
  if (config.runningHubImageField !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_IMAGE_FIELD, config.runningHubImageField);
  if (config.runningHubRatioNodeId !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_RATIO_NODE_ID, config.runningHubRatioNodeId);
  if (config.runningHubRatioField !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_RATIO_FIELD, config.runningHubRatioField);
  if (config.runningHubResolutionNodeId !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_RESOLUTION_NODE_ID, config.runningHubResolutionNodeId);
  if (config.runningHubResolutionField !== undefined) localStorage.setItem(STORAGE_KEYS.RUNNINGHUB_RESOLUTION_FIELD, config.runningHubResolutionField);

  // Lưu dự phòng ra file api_config.json trên ổ cứng (%APPDATA%\ai-dip-studio)
  if (typeof window !== 'undefined' && window.electronDisk?.saveApiConfig) {
    try {
      window.electronDisk.saveApiConfig(getApiConfig()).catch(() => {});
    } catch (e) {}
  }
}

/**
 * Tự động phục hồi cấu hình API từ file api_config.json trên ổ cứng (%APPDATA%) nếu localStorage rỗng
 */
export async function initApiConfigFromDisk() {
  if (typeof window === 'undefined' || !window.electronDisk?.getApiConfig) return getApiConfig();
  try {
    const diskConfig = await window.electronDisk.getApiConfig();
    if (diskConfig && typeof diskConfig === 'object') {
      if (diskConfig.mode) localStorage.setItem(STORAGE_KEYS.API_MODE, diskConfig.mode);
      if (diskConfig.geminiKey) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, diskConfig.geminiKey);
      if (diskConfig.geminiKey2) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY_2, diskConfig.geminiKey2);
      if (diskConfig.geminiKey3) localStorage.setItem(STORAGE_KEYS.GEMINI_KEY_3, diskConfig.geminiKey3);
      if (diskConfig.accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, diskConfig.accessToken);
      if (diskConfig.customEndpoint) {
        let ep = diskConfig.customEndpoint;
        if (ep.includes('aivideoauto.com') || ep.includes('gommo.net') || ep.includes('/account')) ep = 'https://omnivi.ai/api/v2';
        localStorage.setItem(STORAGE_KEYS.CUSTOM_ENDPOINT, ep);
      }
      if (diskConfig.domain) localStorage.setItem(STORAGE_KEYS.DOMAIN, cleanDomain(diskConfig.domain));
      if (diskConfig.openaiBaseUrl) localStorage.setItem(STORAGE_KEYS.OPENAI_BASE_URL, diskConfig.openaiBaseUrl);
      if (diskConfig.openaiApiKey) localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, diskConfig.openaiApiKey);
      if (diskConfig.openaiModel) localStorage.setItem(STORAGE_KEYS.OPENAI_MODEL, diskConfig.openaiModel);
      console.info('[api] Đã tự động phục hồi cấu hình API từ api_config.json');
    } else {
      // Nếu đĩa chưa có, lưu bản hiện tại từ localStorage sang đĩa
      window.electronDisk.saveApiConfig(getApiConfig()).catch(() => {});
    }
  } catch (err) {
    console.warn('[api] Không đọc được api_config.json:', err);
  }
  return getApiConfig();
}

// Fallback Mock Models khi API hệ thống không phản hồi
export const FALLBACK_MODELS = {
  image: [
    {
      id_base: "gemini-2.5-flash-image",
      model: "gemini-2.5-flash-image",
      name: "Google Gemini 2.5 Flash Image (Nano Banana)",
      description: "Model tạo ảnh thế hệ mới nhất của Google, tối ưu cho khuôn mặt và ánh sáng trong trẻo.",
      server: "Google AI",
      status: "ON",
      ratios: [
        { name: "1:1 (Ảnh vuông)", type: "1:1" },
        { name: "3:4 (Ảnh chân dung)", type: "3:4" },
        { name: "4:3 (Ảnh ngang)", type: "4:3" },
        { name: "9:16 (Ảnh thẻ dọc)", type: "9:16" }
      ],
      resolutions: [
        { name: "Tiêu chuẩn (1K)", type: "1k" },
        { name: "Cao cấp (2K)", type: "2k" }
      ],
      modes: [
        { name: "Studio Chuyên Nghiệp", type: "studio" },
        { name: "Chân thực tự nhiên", type: "realistic" }
      ],
      price: 10
    },
    {
      id_base: "imagen-3.0-generate-001",
      model: "imagen-3.0-generate-001",
      name: "Google Imagen 3 Ultra",
      description: "Model tạo ảnh độ phân giải cực cao, chi tiết tóc và trang phục xuất sắc.",
      server: "Google AI",
      status: "ON",
      ratios: [
        { name: "1:1", type: "1:1" },
        { name: "3:4", type: "3:4" },
        { name: "4:3", type: "4:3" }
      ],
      resolutions: [
        { name: "Standard", type: "standard" }
      ],
      modes: [],
      price: 15
    }
  ],
  chat: [
    {
      id_base: "gemini-1.5-flash",
      model: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      description: "Model xử lý nhanh, thông minh, hỗ trợ phân tích hình ảnh đa phương thức.",
      server: "Google Gemini",
      status: "ON"
    },
    {
      id_base: "gemini-1.5-pro",
      model: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro (Khuyên dùng)",
      description: "Model cao cấp nhất của Google, suy luận logic vượt trội và xử lý ảnh siêu chi tiết.",
      server: "Google Gemini",
      status: "ON"
    }
  ]
};

/**
 * Hỗ trợ chuyển đổi file sang Base64
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function fileToBlobUrl(file) {
  return URL.createObjectURL(file);
}

export const IMAGE_DOWNLOAD_FORMATS = {
  png: { mimeType: 'image/png', extension: 'png', label: 'PNG' },
  jpg: { mimeType: 'image/jpeg', extension: 'jpg', label: 'JPG' },
};

export function getImageDownloadFormat(format = 'png') {
  const key = String(format || 'png').toLowerCase();
  return IMAGE_DOWNLOAD_FORMATS[key] || IMAGE_DOWNLOAD_FORMATS.png;
}

const blobToImage = async (blob) => {
  const blobUrl = URL.createObjectURL(blob);
  try {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(blob);
    }

    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = blobUrl;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  }
};

const convertBlobToFormat = async (blob, targetFormat) => {
  const format = getImageDownloadFormat(targetFormat);
  if (blob.type === format.mimeType) return blob;

  const image = await blobToImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không khởi tạo được canvas để chuyển định dạng ảnh.');

  if (format.mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(image, 0, 0);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error(`Không chuyển được ảnh sang ${format.label}.`));
        return;
      }
      resolve(result);
    }, format.mimeType, 0.92);
  });
};

export async function downloadMediaFile(url, filename = 'ai-dip-studio-result.png', options = {}) {
  if (!url) throw new Error('Chưa có ảnh để tải xuống.');

  const format = getImageDownloadFormat(options.format);
  const safeName = String(filename || 'ai-dip-studio-result.png')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .trim() || `ai-dip-studio-result.${format.extension}`;
  const finalName = safeName.replace(/\.(png|jpe?g)$/i, `.${format.extension}`);

  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`Không tải được file (${response.status})`);

    const originalBlob = await response.blob();
    const blob = format.mimeType === originalBlob.type
      ? originalBlob
      : await convertBlobToFormat(originalBlob, format.extension);

    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
    return true;
  } catch (error) {
    console.warn('Download bằng fetch thất bại, dùng fallback anchor:', error);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return false;
  }
}

// Cache tải ảnh lên OmniVi để tránh vượt quá giới hạn 25 lần / 5 phút trên mỗi IP
const mediaUploadCache = new Map();

function getImageSignature(base64Image) {
  if (!base64Image) return '';
  const len = base64Image.length;
  const head = base64Image.slice(0, 60);
  const mid = base64Image.slice(Math.floor(len / 2) - 30, Math.floor(len / 2) + 30);
  const tail = base64Image.slice(-60);
  return `${len}_${head}_${mid}_${tail}`;
}

/**
 * Tải ảnh trực tiếp lên OmniVi.AI qua endpoint multipart POST /upload-media
 * Yêu cầu: field 'file', trả về { url: "https://..." }
 */
export async function uploadMediaToOmniVi(base64Image, mimeType = 'image/jpeg', config = null) {
  // 1. Kiểm tra cache trước để tránh gọi /upload-media liên tục gây 429 rate limit
  const sig = getImageSignature(base64Image);
  if (sig && mediaUploadCache.has(sig)) {
    const cached = mediaUploadCache.get(sig);
    if (cached && (Date.now() - cached.time < 3 * 3600 * 1000) && cached.url) {
      console.log('[uploadMediaToOmniVi] Tái sử dụng URL ảnh đã tải lên từ cache:', cached.url);
      return cached.url;
    }
  }

  const cfg = config || getApiConfig();
  const token = cfg.accessToken;
  const rawBase = (cfg.customEndpoint || 'https://omnivi.ai/api/v2').replace(/\/+$/, '');
  
  const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
  let uploadUrl = `${rawBase}/upload-media`;
  if (isDev && rawBase.includes('omnivi.ai')) {
    uploadUrl = '/api-proxy/omnivi/api/v2/upload-media';
  }

  // Chuyển đổi base64 sang Blob
  const cleanBase64 = String(base64Image || '').replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
  const byteChars = atob(cleanBase64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  const formData = new FormData();
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  formData.append('file', blob, `portrait.${ext}`);

  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers,
    body: formData,
  });

  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = text; }

  if (!response.ok) {
    if (response.status === 429 || /rate_limit|ip-blocked/i.test(text)) {
      throw new Error('OmniVi tạm chặn IP do vượt quá giới hạn 25 lần tải ảnh trong 5 phút (rate_limit.ip-blocked). Bạn vui lòng đợi 3-5 phút hoặc vào https://omnivi.ai/vi/account (mục API -> IP Whitelist) bấm nút "Thêm IP hiện tại" để không bị giới hạn.');
    }
    const msg = data?.message || data?.error_code || response.statusText;
    throw new Error(`Upload ảnh lên OmniVi thất bại (${response.status}): ${msg}`);
  }

  const finalUrl = data?.url || data?.media?.url || data?.data?.url;
  if (!finalUrl) {
    throw new Error('OmniVi upload không trả về url ảnh hợp lệ.');
  }

  // Lưu vào cache để dùng lại cho các lần tạo tiếp theo với cùng ảnh gốc
  if (sig && finalUrl) {
    mediaUploadCache.set(sig, { url: finalUrl, time: Date.now() });
  }

  return finalUrl;
}

/**
 * Chuẩn hóa kết quả trả về từ API
 */
export function toItems(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.models)) return res.models;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.models)) return res.data.models;
  if (Array.isArray(res?.data?.items)) return res.data.items;
  if (Array.isArray(res?.data?.rows)) return res.data.rows;
  if (Array.isArray(res?.rows)) return res.rows;
  return [];
}

/**
 * Wrapper gommoApi an toàn hỗ trợ cả OmniVi.AI (v2) và Gommo Bridge cũ
 */
export async function gommoApi(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  try {
    // Dùng bridge nếu đang chạy trong MiniApp Gommo
    const cfg = getApiConfig();
    if (cfg.mode === 'system' && window.gommoMiniApp?.call) {
      const result = await window.gommoMiniApp.call('api.call', {
        endpoint,
        method: method,
        params: options.params || {},
        body: options.body || {}
      });
      return result;
    }

    const apiCfg = getApiConfig();
    const customBase = localStorage.getItem(STORAGE_KEYS.CUSTOM_ENDPOINT) || apiCfg.customEndpoint || '';
    const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
    let rawCandidates;
    if (isDev) {
      rawCandidates = [
        customBase && !/aivideoauto\.com|gommo\.net/i.test(customBase) ? customBase : null,
        '/api-proxy/omnivi/api/v2',
        'https://omnivi.ai/api/v2'
      ];
    } else {
      rawCandidates = [
        customBase && !/aivideoauto\.com|gommo\.net/i.test(customBase) ? customBase : 'https://omnivi.ai/api/v2',
        'https://omnivi.ai/api/v2'
      ];
    }

    // Deduplicate candidates để tuyệt đối không gọi 2 lần cùng một URL
    const candidates = Array.from(new Set(rawCandidates.filter(Boolean)));

    const isRelative = !(endpoint && endpoint.startsWith('http'));
    const errors = [];
    const storedAccessToken = (apiCfg.accessToken || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '').trim().replace(/^Bearer\s+/i, '');
    const geminiKey = (apiCfg.geminiKey || localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || localStorage.getItem(STORAGE_KEYS.GEMINI_KEY_2) || localStorage.getItem(STORAGE_KEYS.GEMINI_KEY_3) || '').trim();

    for (const base of candidates) {
      const baseNorm = base.replace(/\/$/, '');
      const isOmniVi = /omnivi\.ai/i.test(baseNorm) || baseNorm.endsWith('/api/v2');
      
      // Ánh xạ endpoint chuẩn OmniVi.AI
      let targetEndpoint = endpoint;
      if (isOmniVi) {
        if (/^\/api\/apps\/go-mmo\/ai\/me$|^\/ai\/me$/i.test(endpoint)) targetEndpoint = '/me';
        else if (/^\/api\/apps\/go-mmo\/ai\/models$|^\/ai\/models$/i.test(endpoint)) targetEndpoint = '/models';
        else if (/^\/ai\/generateImage$/i.test(endpoint)) targetEndpoint = '/create';
        else if (/^\/ai\/image$/i.test(endpoint)) targetEndpoint = '/status';
      }

      const tries = [];
      if (isRelative) {
        tries.push(baseNorm + (targetEndpoint.startsWith('/') ? targetEndpoint : `/${targetEndpoint}`));
        if (!isOmniVi && !targetEndpoint.startsWith('/ai') && !targetEndpoint.startsWith('/api')) {
          tries.push(baseNorm + '/ai' + targetEndpoint);
          tries.push(baseNorm + '/api' + targetEndpoint);
        }
      } else {
        tries.push(endpoint);
      }

      for (const url of tries) {
        try {
          const params = Object.assign({}, options.body || {});
          if (storedAccessToken && !params.access_token) params.access_token = storedAccessToken;
          params.domain = cleanDomain(params.domain || apiCfg.domain || 'omnivi.ai');

          const headers = { 'Accept': 'application/json' };
          if (storedAccessToken) {
            headers['Authorization'] = `Bearer ${storedAccessToken}`;
          } else if (geminiKey) {
            headers['x-api-key'] = geminiKey;
          }

          let bodyContent = null;
          let queryString = '';

          if (isOmniVi) {
            // Chuẩn OmniVi.AI: JSON request body
            headers['Content-Type'] = 'application/json';
            // Chuẩn hóa id cho /status
            if (targetEndpoint.includes('status') && !params.id && params.id_base) {
              params.id = params.id_base;
            }
            if (method !== 'GET') {
              bodyContent = JSON.stringify(params);
            } else {
              queryString = new URLSearchParams(params).toString();
            }
          } else {
            // Chuẩn cũ Gommo / aivideoauto: application/x-www-form-urlencoded
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            if (method === 'GET') {
              queryString = new URLSearchParams(params).toString();
            } else {
              bodyContent = new URLSearchParams(params).toString();
            }
          }

          const opts = {
            method: isOmniVi && method === 'GET' && !url.includes('/status') ? 'POST' : method,
            headers,
            credentials: 'omit'
          };
          if (bodyContent) opts.body = bodyContent;
          if (options.signal) opts.signal = options.signal;

          const requestUrl = method === 'GET' && queryString ? `${url}?${queryString}` : url;
          const resp = await fetch(requestUrl, opts);
          const text = await resp.text();
          let parsed = null;
          try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }

          const maskedParams = { ...params };
          if (maskedParams.access_token) {
            const t = String(maskedParams.access_token);
            maskedParams.access_token = t.length > 8 ? `${t.slice(0, 4)}...${t.slice(-4)}` : '***';
          }
          const debugInfo = {
            requestUrl,
            requestMethod: opts.method,
            httpStatus: resp.status,
            httpStatusText: resp.statusText,
            sentParams: maskedParams,
            sentHeaders: Object.keys(headers),
          };

          if (resp.ok) {
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              parsed.__debug = debugInfo;
            }
            return parsed;
          }

          // Ngừng ngay lập tức nếu lỗi 401/403 (sai key) hoặc 429 (bị chặn IP) để không spam server
          if (resp.status === 401 || resp.status === 403) {
            const code = parsed?.error_code || 'unauthorized';
            throw new Error(`API Key OmniVi không hợp lệ hoặc đã hết hạn (${resp.status}: ${code}). Vui lòng vào https://omnivi.ai/vi/account sao chép đúng API Key.`);
          }
          if (resp.status === 429 || /rate_limit|ip-blocked|api_key_abuse/i.test(text)) {
            const remaining = parsed?.remainingTime || 300;
            throw new Error(`IP máy đang bị OmniVi tạm chặn (${remaining}s) do gọi quá nhiều lần hoặc API Key chưa đúng. Vui lòng đợi ${remaining}s.`);
          }

          errors.push({
            url: requestUrl,
            status: resp.status,
            statusText: resp.statusText,
            bodyPreview: (typeof parsed === 'string' ? parsed : JSON.stringify(parsed || {})).slice(0, 800),
            sentParams: maskedParams
          });
        } catch (err) {
          if (/unauthorized|không hợp lệ|tạm chặn|rate_limit|ip-blocked/i.test(err?.message)) {
            throw err;
          }
          errors.push({ url, error: String(err && err.message ? err.message : err) });
        }
      }
    }

    console.warn('API fallback failures:', errors);
    if (endpoint && endpoint.includes('/models')) return { success: true, data: FALLBACK_MODELS.image };
    throw new Error('API gọi thất bại: ' + JSON.stringify(errors.slice(0, 3)));
  } catch (error) {
    if (error instanceof TypeError && /failed to fetch/i.test(String(error.message))) {
      const help = 'Failed to fetch — có thể do mất kết nối mạng hoặc server không phản hồi. Vui lòng kiểm tra lại kết nối internet.';
      console.warn('[api] Network error:', error);
      throw new Error(`${help} (${error.message})`);
    }

    if (endpoint && endpoint.includes('/models')) {
      return { success: true, data: FALLBACK_MODELS.image };
    }
    throw error;
  }
}
