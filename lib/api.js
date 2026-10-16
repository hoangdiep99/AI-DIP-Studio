/**
 * Gommo API & Direct API Router for AI DIP Studio
 * Quản lý cấu hình API, hỗ trợ đấu API Key cá nhân (Gemini API) & Fallback an toàn.
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
  return String(domain)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim();
}

// Khởi tạo cấu hình mặc định
export function getApiConfig() {
  const rawDomain = localStorage.getItem(STORAGE_KEYS.DOMAIN);
  return {
    mode: localStorage.getItem(STORAGE_KEYS.API_MODE) || 'system',
    geminiKey: localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || '',
    geminiKey2: localStorage.getItem(STORAGE_KEYS.GEMINI_KEY_2) || '',
    geminiKey3: localStorage.getItem(STORAGE_KEYS.GEMINI_KEY_3) || '',
    accessToken: localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '',
    customEndpoint: localStorage.getItem(STORAGE_KEYS.CUSTOM_ENDPOINT) || 'https://api.gommo.net',
    domain: cleanDomain(rawDomain) || 'aivideoauto.com',
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
    const cleaned = cleanDomain(config.domain) || 'aivideoauto.com';
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
 * Wrapper gommoApi duy nhất và an toàn chống lỗi crash
 */
export async function gommoApi(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  try {
    // Use bridge only when explicitly configured to 'system' mode
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

    // Fallback: try several likely API hosts/paths and return first successful response
    const apiCfg = getApiConfig();
    const customBase = localStorage.getItem(STORAGE_KEYS.CUSTOM_ENDPOINT) || apiCfg.customEndpoint || '';
    // Khi chạy dev local (npm run dev), gọi trực tiếp tới api.aivideoauto.com/api.gommo.net
    // sẽ bị trình duyệt chặn vì lỗi CORS (server không bật Access-Control-Allow-Origin cho localhost).
    // Vite dev server có proxy sẵn ở vite.config.js để chuyển tiếp request qua server, né CORS.
    const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
    let candidates;
    if (isDev) {
      // Trong dev, host thật (api.aivideoauto.com/api.gommo.net) sẽ bị CORS chặn nếu gọi trực tiếp
      // từ localhost, nên luôn ưu tiên proxy nội bộ của Vite (xem vite.config.js).
      candidates = ['/api-proxy/aivideoauto', '/api-proxy/gommo'];
      // Nếu người dùng nhập customEndpoint không phải 2 host quen thuộc, vẫn thử thẳng (có thể họ tự bật CORS).
      if (customBase && !/aivideoauto\.com|gommo\.net/i.test(customBase)) {
        candidates = [customBase, ...candidates];
      }
    } else {
      candidates = [
        customBase || 'https://api.gommo.net',
        'https://api.gommo.net',
        'https://api.aivideoauto.com',
        window.location.origin
      ].filter(Boolean);
    }

    const isRelative = !(endpoint && endpoint.startsWith('http'));

    // Build fetch options using application/x-www-form-urlencoded for POST requests
    const errors = [];
    const storedAccessToken = apiCfg.accessToken || localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) || '';
    const geminiKey = apiCfg.geminiKey || localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || localStorage.getItem(STORAGE_KEYS.GEMINI_KEY_2) || localStorage.getItem(STORAGE_KEYS.GEMINI_KEY_3) || '';

    // Helper to create form body string and headers
      const makeFetchOpts = (methodInner, paramsObj = {}) => {
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' };
      const opts = { method: methodInner, headers, credentials: 'omit' };
      if (options.signal) opts.signal = options.signal;
      let queryString = '';

      // attach geminiKey as x-api-key header if present and no explicit access_token
      if (!storedAccessToken && geminiKey) {
        headers['x-api-key'] = geminiKey;
      }

      if (storedAccessToken) {
        headers['Authorization'] = `Bearer ${storedAccessToken}`;
      }

      // ensure access_token and domain are present in body/query as required by Gommo API
      const params = Object.assign({}, paramsObj || {});
      try {
        if (storedAccessToken && !params.access_token) params.access_token = storedAccessToken;
      } catch (e) {}

      // QUAN TRỌNG: "domain" ở đây phải là domain thật (ví dụ: aivideoauto.com)
      // KHÔNG có https:// và KHÔNG có gạch chéo cuối. Nếu thiếu hoặc trống, tự động gán mặc định 'aivideoauto.com'
      const resolvedDomain = cleanDomain(params.domain || apiCfg.domain || localStorage.getItem(STORAGE_KEYS.DOMAIN) || 'aivideoauto.com');
      params.domain = resolvedDomain;


      if (methodInner === 'GET') {
        queryString = new URLSearchParams(params).toString();
      } else {
        opts.body = new URLSearchParams(params).toString();
      }
      // Trả kèm params thật đã dùng (đã có access_token/domain) để phục vụ debug UI.
      return { opts, queryString, finalParams: params };
    };

    for (const base of candidates) {
      const baseNorm = base.replace(/\/$/, '');
      const tries = [];
      if (isRelative) {
        tries.push(baseNorm + endpoint);
        if (!endpoint.startsWith('/ai') && !endpoint.startsWith('/api')) {
          tries.push(baseNorm + '/ai' + endpoint);
          tries.push(baseNorm + '/api' + endpoint);
        }
      } else {
        tries.push(endpoint);
      }

      for (const url of tries) {
        try {
          console.info('[gommoApi] trying', url);
          const params = options.body || {};
          const { opts, queryString, finalParams } = makeFetchOpts(method, params);
          const requestUrl = method === 'GET' && queryString ? `${url}?${queryString}` : url;
          const resp = await fetch(requestUrl, opts);
          const text = await resp.text();
          let parsed = null;
          try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }
          // Đính kèm thông tin request (URL, params thật đã gửi — che token, rút gọn field dài
          // như ảnh base64) để debug lỗi dễ hơn mà không làm log phình to hoặc lộ token thật.
          const maskedParams = { ...finalParams };
          if (maskedParams.access_token) {
            const t = String(maskedParams.access_token);
            maskedParams.access_token = t
              ? (t.length > 8 ? `${t.slice(0, 4)}...${t.slice(-4)} (len:${t.length})` : `(giá trị rất ngắn: "${t}", có thể sai)`)
              : '(RỖNG — chưa nhập Access Token trong phần Cấu hình!)';
          } else {
            maskedParams.access_token = '(KHÔNG CÓ trong request — chưa cấu hình Access Token)';
          }
          Object.keys(maskedParams).forEach((key) => {
            const val = maskedParams[key];
            if (typeof val === 'string' && val.length > 60) {
              maskedParams[key] = `${val.slice(0, 30)}...(rút gọn, dài ${val.length} ký tự)`;
            }
          });
          const debugInfo = {
            requestUrl,
            requestMethod: method,
            httpStatus: resp.status,
            httpStatusText: resp.statusText,
            sentParams: maskedParams,
            sentHeaders: Object.keys(opts.headers || {}),
          };
          if (resp.ok) {
            // Nếu response là JSON object và API trả lỗi logic (VD: {error:1, message:"Cant access #1"})
            // thì HTTP status vẫn là 200 (resp.ok = true) — gắn __debug vào đây để component hiển thị được.
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
              parsed.__debug = debugInfo;
            }
            return parsed;
          }
          errors.push({ url: requestUrl, status: resp.status, statusText: resp.statusText, bodyPreview: (typeof parsed === 'string' ? parsed : JSON.stringify(parsed || {})).slice(0, 800), sentParams: maskedParams });
        } catch (err) {
          errors.push({ url, error: String(err && err.message ? err.message : err) });
        }
      }
    }

    console.warn('gommoApi fallback failures:', errors);
    if (endpoint && endpoint.includes('/models')) return { success: true, data: FALLBACK_MODELS.image };
    throw new Error('API gọi thất bại: ' + JSON.stringify(errors.slice(0,3)));
  } catch (error) {
    // CORS/network errors often surface as TypeError: Failed to fetch
    if (error instanceof TypeError && /failed to fetch/i.test(String(error.message))) {
      const help = 'Failed to fetch — có thể do CORS, blocked request, hoặc server không phản hồi. Hãy kiểm tra Console/Network (request URL, status) và đảm bảo app chạy cùng origin hoặc dùng bridge.';
      console.warn('[gommoApi] Network/CORS error:', error);
      throw new Error(`${help} (browser: ${error.message})`);
    }

    console.warn('Gommo API error or fallback failed, sử dụng dữ liệu giả lập:', error);
    if (endpoint && endpoint.includes('/models')) {
      return { success: true, data: FALLBACK_MODELS.image };
    }
    throw error;
  }
}