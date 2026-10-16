/**
 * AI DIP Studio - Core Generation Engine
 * Điều phối cuộc gọi API: Hỗ trợ cả Hệ thống (Gommo Bridge) và Direct API (Gemini Key cá nhân)
 */

import { gommoApi, getApiConfig } from './api.js';
import { buildGenerateImageBody } from './modelCatalog.js';
import { parseMediaCreateResponse, pollMediaJob } from './mediaJobs.js';

function getGeminiApiKey(config) {
  return String(config.geminiKey || config.geminiKey2 || config.geminiKey3 || '').trim();
}

/**
 * laozhang.ai không nhận ảnh qua /v1/chat/completions (Vision) cho các model ảnh
 * như gemini-2.5-flash-image-preview — họ có API riêng theo chuẩn OpenAI Images:
 *  - POST /v1/images/generations (JSON, không có ảnh gốc)
 *  - POST /v1/images/edits (multipart/form-data, có ảnh gốc cần chỉnh sửa)
 * Các nhà cung cấp OpenAI-compatible khác vẫn dùng /v1/chat/completions như trước.
 */
function isLaozhangHost(baseUrl) {
  return /api\.laozhang\.ai/i.test(String(baseUrl || ''));
}

function isRunningHubHost(baseUrl) {
  return /runninghub\.(ai|cn)/i.test(String(baseUrl || ''));
}

const RUNNINGHUB_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '16:9', '9:16'].map((type) => ({ type, name: type }));
const RUNNINGHUB_RESOLUTIONS = ['1k', '2k', '4k'].map((type) => ({ type, name: type.toUpperCase() }));

const RUNNINGHUB_IMAGE_MODELS = [
  { id_base: 'rhart-image-n-pro-official/edit', model: 'rhart-image-n-pro-official/edit', name: 'RunningHub Nano Banana Pro Official Edit', server: 'RunningHub', status: 'ON' },
  { id_base: 'rhart-image-n-pro-official/text-to-image', model: 'rhart-image-n-pro-official/text-to-image', name: 'RunningHub Nano Banana Pro Official Text-to-Image', server: 'RunningHub', status: 'ON' },
  { id_base: 'rhart-image-n-pro/edit', model: 'rhart-image-n-pro/edit', name: 'RunningHub Nano Banana Pro Edit', server: 'RunningHub', status: 'ON' },
  { id_base: 'rhart-image-n-pro/text-to-image', model: 'rhart-image-n-pro/text-to-image', name: 'RunningHub Nano Banana Pro Text-to-Image', server: 'RunningHub', status: 'ON' },
  { id_base: 'rhart-image-v1/edit', model: 'rhart-image-v1/edit', name: 'RunningHub Nano Banana Edit', server: 'RunningHub', status: 'ON' },
  { id_base: 'rhart-image-v1/text-to-image', model: 'rhart-image-v1/text-to-image', name: 'RunningHub Nano Banana Text-to-Image', server: 'RunningHub', status: 'ON' },
  { id_base: 'rhart-image-g-1.5/edit', model: 'rhart-image-g-1.5/edit', name: 'RunningHub GPT Image Edit', server: 'RunningHub', status: 'ON' },
  { id_base: 'rhart-image-g-1.5/text-to-image', model: 'rhart-image-g-1.5/text-to-image', name: 'RunningHub GPT Image Text-to-Image', server: 'RunningHub', status: 'ON' },
  { id_base: 'seedream-v4.5/image-to-image', model: 'seedream-v4.5/image-to-image', name: 'RunningHub Seedream 4.5 Image-to-Image', server: 'RunningHub', status: 'ON' },
  { id_base: 'seedream-v4.5/text-to-image', model: 'seedream-v4.5/text-to-image', name: 'RunningHub Seedream 4.5 Text-to-Image', server: 'RunningHub', status: 'ON' }
].map((model) => ({
  ...model,
  ratios: RUNNINGHUB_RATIOS,
  resolutions: RUNNINGHUB_RESOLUTIONS,
  description: 'RunningHub Standard API: yêu cầu prompt, resolution và aspectRatio.'
}));

const RUNNINGHUB_MODEL_ENDPOINT_ALIASES = {
  'nano-banana-pro-official/edit': 'rhart-image-n-pro-official/edit',
  'nano-banana-pro-official/text-to-image': 'rhart-image-n-pro-official/text-to-image',
  'nano-banana-pro/edit': 'rhart-image-n-pro/edit',
  'nano-banana-pro/text-to-image': 'rhart-image-n-pro/text-to-image',
  'nano-banana/edit': 'rhart-image-v1/edit',
  'nano-banana/text-to-image': 'rhart-image-v1/text-to-image',
  'gpt-image/edit': 'rhart-image-g-1.5/edit',
  'gpt-image/text-to-image': 'rhart-image-g-1.5/text-to-image',
};

function getRunningHubEndpoint(modelName, hasImage) {
  const rawModel = String(modelName || '').trim().replace(/^\/+/, '');
  const model = RUNNINGHUB_MODEL_ENDPOINT_ALIASES[rawModel] || rawModel;
  if (model.startsWith('openapi/v2/')) return `/${model}`;
  if (model.startsWith('/openapi/v2/')) return model;
  if (model.includes('/')) {
    const normalized = hasImage
      ? model.replace(/\/text-to-image$/i, '/edit').replace(/\/image-to-image$/i, '/image-to-image')
      : model.replace(/\/edit$/i, '/text-to-image').replace(/\/image-to-image$/i, '/text-to-image');
    return `/openapi/v2/${normalized}`;
  }
  if (/gpt/i.test(model)) return `/openapi/v2/rhart-image-g-1.5/${hasImage ? 'edit' : 'text-to-image'}`;
  if (/seedream/i.test(model)) return `/openapi/v2/seedream-v4.5/${hasImage ? 'image-to-image' : 'text-to-image'}`;
  if (/official|pro/i.test(model)) return `/openapi/v2/rhart-image-n-pro-official/${hasImage ? 'edit' : 'text-to-image'}`;
  return `/openapi/v2/rhart-image-v1/${hasImage ? 'edit' : 'text-to-image'}`;
}

function pickFirstString(payload, paths) {
  for (const path of paths) {
    const value = path.split('.').reduce((obj, key) => obj?.[key], payload);
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function findFirstUrl(payload, seen = new WeakSet()) {
  if (!payload) return '';
  if (typeof payload === 'string') return /^https?:\/\//i.test(payload) ? payload : '';
  if (typeof payload !== 'object' || seen.has(payload)) return '';
  seen.add(payload);
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = findFirstUrl(item, seen);
      if (found) return found;
    }
    return '';
  }
  for (const key of ['url', 'imageUrl', 'image_url', 'fileUrl', 'file_url', 'downloadUrl', 'download_url', 'originUrl']) {
    if (typeof payload[key] === 'string' && /^https?:\/\//i.test(payload[key])) return payload[key].trim();
  }
  for (const value of Object.values(payload)) {
    const found = findFirstUrl(value, seen);
    if (found) return found;
  }
  return '';
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function normalizeRunningHubResolution(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (['1k', '2k', '4k'].includes(raw)) return raw;
  if (/^(standard|std|low|small|hd)$/.test(raw)) return '1k';
  if (/^(high|large|2x)$/.test(raw)) return '2k';
  if (/^(ultra|max|highest|4x)$/.test(raw)) return '4k';
  return '1k';
}

function normalizeRunningHubAspectRatio(value) {
  const raw = String(value || '').trim();
  return RUNNINGHUB_RATIOS.some((item) => item.type === raw) ? raw : '1:1';
}

function getRunningHubRequiredFields(settings = {}) {
  return {
    resolution: normalizeRunningHubResolution(settings.resolution || settings.size || settings.quality),
    aspectRatio: normalizeRunningHubAspectRatio(settings.ratio || settings.aspectRatio || settings.aspect_ratio)
  };
}

function buildRunningHubCreateBody({ prompt, uploadedImage, settings }) {
  const requiredFields = getRunningHubRequiredFields(settings);
  if (!uploadedImage) return { prompt, ...requiredFields };

  if (isHttpUrl(uploadedImage)) {
    return {
      prompt,
      ...requiredFields,
      image: uploadedImage,
      imageUrl: uploadedImage,
      imageUrls: [uploadedImage],
      images: [uploadedImage]
    };
  }

  // RunningHub media upload can return an internal fileName/id instead of a public URL.
  // Newer /openapi/v2/rhart-image-* edit endpoints require `imageUrls` even when
  // the uploaded media reference is an internal RunningHub filename/id.
  return {
    prompt,
    ...requiredFields,
    imageUrls: [uploadedImage],
    fileName: uploadedImage,
    file_name: uploadedImage,
    imageFileName: uploadedImage,
    image_file_name: uploadedImage
  };
}

function addRunningHubNode(nodeInfoList, nodeId, fieldName, fieldValue) {
  const id = String(nodeId || '').trim();
  const field = String(fieldName || '').trim();
  if (!id || !field || fieldValue === undefined || fieldValue === null || fieldValue === '') return;
  nodeInfoList.push({ nodeId: id, fieldName: field, fieldValue });
}

function buildRunningHubAiAppBody({ config, prompt, uploadedImage, settings }) {
  const webappId = String(config.runningHubWebappId || '').trim();
  if (!webappId) {
    throw new Error('Vui lòng nhập RunningHub WebApp ID khi dùng chế độ AI App/ComfyUI workflow.');
  }

  const requiredFields = getRunningHubRequiredFields(settings);
  const nodeInfoList = [];
  addRunningHubNode(nodeInfoList, config.runningHubPromptNodeId || '3', config.runningHubPromptField || 'text', prompt);
  addRunningHubNode(nodeInfoList, config.runningHubImageNodeId, config.runningHubImageField || 'image', uploadedImage);
  addRunningHubNode(nodeInfoList, config.runningHubRatioNodeId || '28', config.runningHubRatioField || 'select', requiredFields.aspectRatio);
  addRunningHubNode(nodeInfoList, config.runningHubResolutionNodeId, config.runningHubResolutionField || 'select', requiredFields.resolution);

  return { webappId, nodeInfoList };
}

async function runningHubFetch({ normalizedBase, apiKey, path, body, useProxy = false, headers = {} }) {
  const url = `${useProxy ? '/runninghub-proxy' : normalizedBase}${path}`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...headers
      },
      body: JSON.stringify({ apiKey, ...body })
    });
  } catch (networkError) {
    throw new Error(`Failed to fetch từ RunningHub. Hãy kiểm tra endpoint/kết nối internet hoặc CORS. (${networkError.message})`);
  }

  const raw = await response.text();
  let result = null;
  try { result = raw ? JSON.parse(raw) : null; } catch (e) { result = null; }
  if (!response.ok) {
    const errorText = result?.msg || result?.message || result?.error?.message || raw || response.statusText;
    throw new Error(`RunningHub API Error (${response.status}): ${errorText}`);
  }
  if (!result) throw new Error('Không nhận được phản hồi JSON hợp lệ từ RunningHub.');
  if (result.errorCode !== undefined && ![0, 200, '0', '200', ''].includes(result.errorCode)) {
    throw new Error(`RunningHub API Error (${result.errorCode}): ${result.errorMessage || result.msg || result.message || JSON.stringify(result).slice(0, 300)}`);
  }
  if (result.code !== undefined && ![0, 200, '0', '200'].includes(result.code)) {
    throw new Error(`RunningHub API Error (${result.code}): ${result.msg || result.message || JSON.stringify(result).slice(0, 300)}`);
  }
  return result;
}

async function uploadRunningHubImage({ normalizedBase, apiKey, useProxy, base64Image, mimeType }) {
  const path = '/openapi/v2/media/upload/binary';
  const blob = base64ToBlob(base64Image, mimeType || 'image/png');
  const url = `${useProxy ? '/runninghub-proxy' : normalizedBase}${path}`;
  const form = new FormData();
  form.append('file', blob, `image.${String(mimeType || 'image/png').split('/')[1] || 'png'}`);
  let response;
  try {
    response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}` }, body: form });
  } catch (networkError) {
    throw new Error(`Failed to upload ảnh lên RunningHub. (${networkError.message})`);
  }
  const raw = await response.text();
  let result = null;
  try { result = raw ? JSON.parse(raw) : null; } catch (e) { result = null; }
  if (!response.ok) throw new Error(`RunningHub upload Error (${response.status}): ${result?.msg || result?.message || raw || response.statusText}`);
  const fileUrl = findFirstUrl(result) || pickFirstString(result, ['data.fileName', 'data.file_name', 'data.name', 'data.id', 'fileName', 'file_name']);
  if (!fileUrl) throw new Error(`RunningHub upload thành công nhưng không tìm thấy file/url ảnh. Response: ${String(raw).slice(0, 300)}`);
  return fileUrl;
}

function getRunningHubTaskStatus(payload) {
  const status = pickFirstString(payload, ['data.status', 'data.state', 'status', 'state', 'data']);
  return String(status || '').trim().toUpperCase();
}

function isRunningHubTaskFailed(status) {
  return /FAIL|ERROR|CANCEL|REJECT|TIMEOUT/.test(String(status || '').toUpperCase());
}

function isRunningHubTaskDone(status) {
  return /SUCCESS|SUCCEEDED|COMPLETED|DONE/.test(String(status || '').toUpperCase());
}

async function pollRunningHubTask({ normalizedBase, apiKey, useProxy, taskId, aiAppMode = false }) {
  const deadline = Date.now() + 45 * 60 * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    if (aiAppMode) {
      try {
        const statusResult = await runningHubFetch({ normalizedBase, apiKey, path: '/task/openapi/status', body: { taskId }, useProxy });
        const status = getRunningHubTaskStatus(statusResult);
        if (isRunningHubTaskFailed(status)) {
          throw new Error(`RunningHub task thất bại (${status || 'unknown'}): ${statusResult.msg || statusResult.message || JSON.stringify(statusResult).slice(0, 300)}`);
        }
        if (!isRunningHubTaskDone(status)) continue;

        const outputResult = await runningHubFetch({ normalizedBase, apiKey, path: '/task/openapi/outputs', body: { taskId }, useProxy });
        const url = findFirstUrl(outputResult);
        if (url) return url;
        throw new Error(`RunningHub AI App đã SUCCESS nhưng chưa thấy fileUrl trong output. Response: ${JSON.stringify(outputResult).slice(0, 400)}`);
      } catch (error) {
        throw error;
      }
    }

    const queried = await runningHubFetch({ normalizedBase, apiKey, path: '/openapi/v2/query', body: { taskId }, useProxy });
    const url = findFirstUrl(queried);
    if (url) return url;
    const status = getRunningHubTaskStatus(queried);
    if (isRunningHubTaskFailed(status)) {
          throw new Error(`RunningHub task thất bại (${status || 'unknown'}): ${queried.msg || queried.message || JSON.stringify(queried).slice(0, 300)}`);
    }
  }
  throw new Error('RunningHub task timeout — quá thời gian chờ kết quả ảnh.');
}

async function generateViaRunningHub({ apiKey, modelName, normalizedBase, useProxy, prompt, base64Image, mimeType, settings, config }) {
  const hasImage = !!base64Image;
  const image = hasImage ? await uploadRunningHubImage({ normalizedBase, apiKey, useProxy, base64Image, mimeType }) : '';
  const useAiApp = String(config?.runningHubMode || '').toLowerCase() === 'ai-app' || !!String(config?.runningHubWebappId || '').trim();
  if (useAiApp) {
    const createBody = buildRunningHubAiAppBody({ config, prompt, uploadedImage: image, settings });
    const created = await runningHubFetch({ normalizedBase, apiKey, path: '/task/openapi/ai-app/run', body: createBody, useProxy });
    const immediateUrl = findFirstUrl(created);
    if (immediateUrl) return immediateUrl;
    const taskId = pickFirstString(created, ['data.taskId', 'data.task_id', 'data.id', 'taskId', 'task_id', 'id']);
    if (!taskId) throw new Error(`RunningHub AI App không trả taskId. Response: ${JSON.stringify(created).slice(0, 400)}`);
    return await pollRunningHubTask({ normalizedBase, apiKey, useProxy, taskId, aiAppMode: true });
  }

  const endpoint = getRunningHubEndpoint(modelName, hasImage);
  const createBody = buildRunningHubCreateBody({ prompt, uploadedImage: image, settings });
  const created = await runningHubFetch({ normalizedBase, apiKey, path: endpoint, body: createBody, useProxy });
  const immediateUrl = findFirstUrl(created);
  if (immediateUrl) return immediateUrl;
  const taskId = pickFirstString(created, ['data.taskId', 'data.task_id', 'data.id', 'taskId', 'task_id', 'id']);
  if (!taskId) throw new Error(`RunningHub không trả taskId. Response: ${JSON.stringify(created).slice(0, 400)}`);
  return await pollRunningHubTask({ normalizedBase, apiKey, useProxy, taskId });
}

function base64ToBlob(base64, mimeType = 'image/png') {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
}

function throwIfAborted(signal) {
  if (signal?.aborted) {
    throw new DOMException('Đã huỷ tác vụ tạo ảnh.', 'AbortError');
  }
}

function abortableDelay(ms, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Đã huỷ tác vụ tạo ảnh.', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Gọi API ảnh chuyên biệt của laozhang.ai (chuẩn OpenAI Images API):
 * - Có ảnh gốc (base64Image) -> POST /v1/images/edits (multipart/form-data)
 * - Không có ảnh gốc -> POST /v1/images/generations (JSON)
 * Response chuẩn: { data: [ { url } ] } hoặc { data: [ { b64_json } ] }
 */
async function generateViaLaozhangImages({ apiKey, modelName, normalizedBase, useProxy, prompt, base64Image, mimeType }) {
  let response;

  if (base64Image) {
    const url = useProxy ? '/openai-proxy/v1/images/edits' : `${normalizedBase}/v1/images/edits`;
    const form = new FormData();
    form.append('model', modelName);
    const ext = String(mimeType || 'image/png').split('/')[1] || 'png';
    form.append('image', base64ToBlob(base64Image, mimeType || 'image/png'), `image.${ext}`);
    form.append('prompt', prompt);

    try {

      response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        body: form
      });
    } catch (networkError) {
      throw new Error(`Failed to fetch từ API laozhang.ai (images/edits). Hãy kiểm tra kết nối internet hoặc CORS. (${networkError.message})`);
    }
  } else {
    const url = useProxy ? '/openai-proxy/v1/images/generations' : `${normalizedBase}/v1/images/generations`;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({ model: modelName, prompt, n: 1, size: '1024x1024' })
      });
    } catch (networkError) {
      throw new Error(`Failed to fetch từ API laozhang.ai (images/generations). Hãy kiểm tra kết nối internet hoặc CORS. (${networkError.message})`);
    }
  }

  const raw = await response.text();
  let result = null;
  try { result = raw ? JSON.parse(raw) : null; } catch (e) { result = null; }

  if (!response.ok) {
    const errorText = result?.error?.message || result?.message || raw || response.statusText;
    throw new Error(`API laozhang.ai Error (${response.status}): ${errorText}`);
  }

  if (!result) {
    throw new Error('Không nhận được phản hồi hợp lệ (không phải JSON) từ API laozhang.ai.');
  }

  const item = Array.isArray(result?.data) ? result.data[0] : null;
  if (item?.url) {
    return item.url;
  }
  if (item?.b64_json) {
    try {
      const blob = base64ToBlob(item.b64_json, 'image/png');
      return URL.createObjectURL(blob);
    } catch (decodeError) {
      throw new Error(`Không giải mã được ảnh base64 trả về: ${decodeError.message}`);
    }
  }

  throw new Error(`Không tìm thấy dữ liệu ảnh trong phản hồi laozhang.ai. Nội dung trả về: ${String(raw || '').slice(0, 300) || '(rỗng)'}`);
}


/**
 * Gửi yêu cầu sinh ảnh đến Google Gemini API (Trực tiếp từ Client)
 */
async function generateDirectGemini(prompt, base64Image, mimeType = 'image/jpeg') {
  const config = getApiConfig();
  const apiKey = getGeminiApiKey(config);
  if (!apiKey) {
    throw new Error('Vui lòng nhập Google Gemini API Key trong phần cấu hình.');
  }

  const modelName = 'gemini-2.5-flash-image';
  const host = (config.customEndpoint || '').trim();
  const rawHost = host.replace(/\/+$/, '');
  const normalizedHost = /^https?:\/\//i.test(rawHost) ? rawHost : `https://${rawHost}`;
  const isGoogleHost = /googleapis\.com|gemini\.google/.test(normalizedHost);
  // Domain đúng của Google Generative Language API là generativelanguage.googleapis.com
  // (KHÔNG phải gemini.googleapis.com — domain đó không tồn tại và luôn trả 404).
  const googleHost = isGoogleHost ? normalizedHost : 'https://generativelanguage.googleapis.com';
  const useProxy = typeof window !== 'undefined' && import.meta.env.DEV;
  const url = useProxy
    ? `/gemini-proxy/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`
    : `${googleHost}/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // Chuẩn bị payload theo chuẩn Google Multimodal
  const contents = {
    parts: [
      { text: prompt }
    ]
  };

  if (base64Image) {
    contents.parts.unshift({
      inlineData: {
        mimeType: mimeType,
        data: base64Image
      }
    });
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // Lưu ý: "numberOfImages" KHÔNG phải field hợp lệ của Gemini generateContent API
      // (field đó chỉ tồn tại ở Imagen/predict endpoint khác). Gửi field lạ này khiến
      // Google trả lỗi 400 INVALID_ARGUMENT, hiển thị như lỗi "sai key/model" dù key đúng.
      body: JSON.stringify({
        contents: [contents],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      }),
    });
  } catch (networkError) {
    if (networkError?.name === 'AbortError') throw networkError;
    throw new Error(`Failed to fetch from Gemini API. Hãy kiểm tra kết nối internet hoặc CORS. (${networkError.message})`);
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorText = errData?.error?.message || errData?.error_description || errData?.message || response.statusText;
    throw new Error(`Google API Error: ${errorText}`);
  }

  const result = await response.json();
  
  const candidates = result?.candidates?.[0]?.content?.parts;
  if (!candidates) {
    throw new Error('Không nhận được phản hồi hợp lệ từ Google Gemini API.');
  }

  const imagePart = candidates.find(part => part.inlineData);
  if (!imagePart || !imagePart.inlineData?.data) {
    const textPart = candidates.find(part => part.text);
    if (textPart) {
      throw new Error(`AI phản hồi lỗi: ${textPart.text}`);
    }
    throw new Error('Mô hình không trả về dữ liệu ảnh. Hãy thử lại prompt khác.');
  }

  const base64Data = imagePart.inlineData.data;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/png' });
  return URL.createObjectURL(blob);
}

/**
 * Gọi tới RunningHub hoặc nhà cung cấp API tương thích chuẩn OpenAI Chat Completions.
 * Header: Authorization: Bearer <token>
 * Body: { model, messages: [{ role: 'user', content: [...] }] }
 * Ảnh trả về nằm trong choices[0].message.content, dạng base64 (data URL hoặc chuỗi base64 thô).
 */
async function generateViaOpenAiCompatible(prompt, base64Image, mimeType = 'image/jpeg', settings = {}) {
  const config = getApiConfig();
  const apiKey = String(config.openaiApiKey || '').trim();
  if (!apiKey) {
    throw new Error('Vui lòng nhập API Key (Token) của nhà cung cấp OpenAI-compatible trong phần cấu hình.');
  }

  const modelName = String(config.openaiModel || 'rhart-image-n-pro-official/edit').trim();
  const rawBase = String(config.openaiBaseUrl || 'https://www.runninghub.ai').trim().replace(/\/+$/, '');
  const normalizedBase = /^https?:\/\//i.test(rawBase) ? rawBase : `https://${rawBase}`;
  const useProxy = typeof window !== 'undefined' && import.meta.env.DEV;

  if (isRunningHubHost(normalizedBase)) {
    return await generateViaRunningHub({ apiKey, modelName, normalizedBase, useProxy, prompt, base64Image, mimeType, settings, config });
  }

  // laozhang.ai: dùng riêng API Images (generations/edits) thay vì Chat Completions,
  // vì model ảnh như gemini-2.5-flash-image-preview không được cấp phép qua route Chat
  // trên nền tảng này (gây lỗi 503 "no available channels").
  if (isLaozhangHost(normalizedBase)) {
    return await generateViaLaozhangImages({ apiKey, modelName, normalizedBase, useProxy, prompt, base64Image, mimeType });
  }

  const url = useProxy ? '/openai-proxy/v1/chat/completions' : `${normalizedBase}/v1/chat/completions`;

  // Chuẩn OpenAI Vision content array: text + image_url (data URL base64) nếu có ảnh đầu vào
  const contentParts = [{ type: 'text', text: prompt }];

  if (base64Image) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${base64Image}` }
    });
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'user', content: contentParts }]
      })
    });
  } catch (networkError) {
    throw new Error(`Failed to fetch từ API OpenAI-compatible. Hãy kiểm tra endpoint/kết nối internet hoặc CORS. (${networkError.message})`);
  }

  const raw = await response.text();
  let result = null;
  try { result = raw ? JSON.parse(raw) : null; } catch (e) { result = null; }

  if (!response.ok) {
    const errorText = result?.error?.message || result?.message || raw || response.statusText;
    throw new Error(`API OpenAI-compatible Error (${response.status}): ${errorText}`);
  }

  if (!result) {
    throw new Error('Không nhận được phản hồi hợp lệ (không phải JSON) từ API.');
  }

  // Nội dung trả về có thể là string hoặc array các block (chuẩn Vision/nhiều nhà cung cấp khác nhau)
  const message = result?.choices?.[0]?.message;
  const rawContent = message?.content;
  const textCandidates = [];
  if (typeof rawContent === 'string') {
    textCandidates.push(rawContent);
  } else if (Array.isArray(rawContent)) {
    for (const part of rawContent) {
      if (typeof part === 'string') textCandidates.push(part);
      else if (part?.text) textCandidates.push(part.text);
      else if (part?.image_url?.url) textCandidates.push(part.image_url.url);
    }
  }
  // Một số bên trả kèm images[] riêng ngoài content (biến thể phổ biến khác của chuẩn OpenAI)
  if (Array.isArray(message?.images)) {
    for (const img of message.images) {
      if (typeof img === 'string') textCandidates.push(img);
      else if (img?.image_url?.url) textCandidates.push(img.image_url.url);
      else if (img?.url) textCandidates.push(img.url);
    }
  }

  const combinedText = textCandidates.join('\n');

  // Tìm data URL base64 dạng data:image/xxx;base64,....
  const dataUrlMatch = combinedText.match(/data:image\/[a-zA-Z0-9.+-]+;base64,([A-Za-z0-9+/=]+)/);
  // Hoặc tìm URL ảnh http(s) trực tiếp nếu nhà cung cấp trả link thay vì base64
  const httpUrlMatch = combinedText.match(/https?:\/\/[^\s)"']+\.(?:png|jpg|jpeg|webp)[^\s)"']*/i);

  let base64Data = dataUrlMatch ? dataUrlMatch[1] : null;
  if (!base64Data && !httpUrlMatch) {
    // Thử tìm chuỗi base64 thô dài (không kèm prefix data:) như một số bên trả trực tiếp
    const rawBase64Match = combinedText.match(/[A-Za-z0-9+/=]{200,}/);
    if (rawBase64Match) base64Data = rawBase64Match[0];
  }

  if (httpUrlMatch && !base64Data) {
    return httpUrlMatch[0];
  }

  if (!base64Data) {
    throw new Error(`Không tìm thấy dữ liệu ảnh trong phản hồi. Nội dung AI trả về: ${combinedText.slice(0, 300) || '(rỗng)'}`);
  }

  try {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    return URL.createObjectURL(blob);
  } catch (decodeError) {
    throw new Error(`Không giải mã được ảnh base64 trả về: ${decodeError.message}`);
  }
}

/**
 * Gọi qua hệ thống AI VIDEO AUTO Bridge sử dụng SDK chuẩn hóa
 */
async function generateViaSystem(prompt, base64Image, selectedModel, settings, signal) {

  // Chuẩn bị options cho body builder
  const extra = {
    prompt,
    isEdit: !!base64Image,
    base64Image
  };

  // Build body urlencoded chuẩn không thiếu action_type hay sync
  const body = buildGenerateImageBody(selectedModel, settings, extra);

  // Gửi request qua Gommo Api Bridge
  const res = await gommoApi('/ai/generateImage', { method: 'POST', body, signal });
  
  // Xử lý tạo lỗi từ API ngay lập tức
  if (res.error || (!res.success && res.message)) {
    const err = new Error(res.message || `API Error ${res.error || 'unknown'}`);
    err.raw = res;
    throw err;
  }

  // Parse response dùng helper SDK
  const { jobId } = parseMediaCreateResponse(res, 'image');

  // Tiến hành Polling kết quả định kỳ 2.5s để nhận ảnh ngay khi server xử lý xong
  const pollResult = await pollMediaJob('image', jobId, { intervalMs: 2500, signal });
  return pollResult.url || pollResult.download_url;
}

/**
 * Hàm điều phối chính cho mọi phân hệ xử lý ảnh
 */
export async function generatePhoto({ prompt, base64Image, selectedModel, settings, mimeType, signal }) {
  const config = getApiConfig();
  throwIfAborted(signal);

  if (config.mode === 'openai') {
    return await generateViaOpenAiCompatible(prompt, base64Image, mimeType, settings);
  }

  if (config.mode === 'custom') {

    try {
      return await generateDirectGemini(prompt, base64Image, mimeType);
    } catch (error) {
      const errMsg = String(error?.message || 'Lỗi Gemini trực tiếp');
      const shouldFallback = /failed to fetch|cors|network/i.test(errMsg);
      if (shouldFallback && config.accessToken) {
        try {
          return await generateViaSystem(prompt, base64Image, selectedModel, settings, signal);
        } catch (sysErr) {
          throw new Error(`${errMsg}. Fallback sang hệ thống cũng không thành công: ${sysErr?.message || sysErr}`);
        }
      }
      throw new Error(`${errMsg}. Nếu bạn nằm dưới trình duyệt bị chặn CORS, vui lòng sử dụng chế độ hệ thống hoặc proxy server.`);
    }
  }

  return await generateViaSystem(prompt, base64Image, selectedModel, settings, signal);
}

export async function validateGeminiKey(config) {
  const apiKey = getGeminiApiKey(config);
  if (!apiKey) {
    throw new Error('Vui lòng nhập Google Gemini API Key trong phần cấu hình.');
  }

  const host = (config.customEndpoint || '').trim();
  const rawHost = host.replace(/\/+$/, '');
  const normalizedHost = /^https?:\/\//i.test(rawHost) ? rawHost : `https://${rawHost}`;
  const isGoogleHost = /googleapis\.com|gemini\.google/.test(normalizedHost);
  const googleHost = isGoogleHost ? normalizedHost : 'https://generativelanguage.googleapis.com';
  const useProxy = typeof window !== 'undefined' && import.meta.env.DEV;
  const url = useProxy
    ? `/gemini-proxy/v1beta/models/gemini-2.5-flash-image?key=${encodeURIComponent(apiKey)}`
    : `${googleHost}/v1beta/models/gemini-2.5-flash-image?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errorText = errData?.error?.message || errData?.error_description || errData?.message || response.statusText;
    throw new Error(`Gemini Key validation failed: ${errorText}`);
  }

  return true;
}

/**
 * Lấy danh sách model từ nhà cung cấp OpenAI-compatible qua endpoint chuẩn GET /v1/models.
 * Response chuẩn OpenAI: { data: [ { id, object, ... } ] }
 * Chuyển về format tối giản (id_base/model/name) để hiển thị trong ModelPicker —
 * các model này không có ratios/resolutions/modes vì generateViaOpenAiCompatible/
 * generateViaLaozhangImages không cần các field đó, chỉ cần prompt + model name.
 */
export async function fetchOpenAiModels(config) {
  const apiKey = String(config.openaiApiKey || '').trim();
  if (!apiKey) {
    throw new Error('Vui lòng nhập API Key (Token) trong phần cấu hình.');
  }

  const rawBase = String(config.openaiBaseUrl || 'https://www.runninghub.ai').trim().replace(/\/+$/, '');
  const normalizedBase = /^https?:\/\//i.test(rawBase) ? rawBase : `https://${rawBase}`;
  const useProxy = typeof window !== 'undefined' && import.meta.env.DEV;

  if (isRunningHubHost(normalizedBase)) {
    return RUNNINGHUB_IMAGE_MODELS;
  }
  const url = useProxy ? '/openai-proxy/v1/models' : `${normalizedBase}/v1/models`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
    });
  } catch (networkError) {
    throw new Error(`Failed to fetch danh sách model. Hãy kiểm tra endpoint/kết nối internet hoặc CORS. (${networkError.message})`);
  }

  const raw = await response.text();
  let result = null;
  try { result = raw ? JSON.parse(raw) : null; } catch (e) { result = null; }

  if (!response.ok) {
    const errorText = result?.error?.message || result?.message || raw || response.statusText;
    throw new Error(`Không tải được danh sách model (${response.status}): ${errorText}`);
  }

  const list = Array.isArray(result?.data) ? result.data : Array.isArray(result) ? result : [];
  const mapped = list
    .map((item) => {
      const id = String(item?.id || item?.model || '').trim();
      return id ? { id_base: id, model: id, name: id, status: 'ON' } : null;
    })
    .filter(Boolean);

  // laozhang.ai có tới 292 model (chat, code, video, audio...), nhưng app này chỉ dùng
  // model của Google — nên chỉ giữ lại nhóm model của Google (Gemini/Imagen/Gemma/Veo...)
  // để danh sách chọn model gọn và đúng mục đích, tránh người dùng chọn nhầm model khác.
  const googleModels = mapped.filter((item) => {
    const text = item.id_base.toLowerCase();
    return /gemini|imagen|gemma|palm|bison|bard|learnlm|veo|nano.?banana|aqa/i.test(text);
  });

  // Chỉ trả về model của Google. Không fallback về toàn bộ danh sách để tránh hiển thị
  // quá nhiều model không phải của Google.
  return googleModels;
}



/**
 * Nhà cung cấp OpenAI-compatible (ví dụ laozhang.ai) không có endpoint chuẩn công khai
 * để đọc số dư USD. Một số endpoint "phổ biến" như /dashboard/billing/subscription
 * trả về field hard_limit_usd — đây là HẠN MỨC (limit) mặc định của hệ thống proxy,
 * KHÔNG phải số dư thật đã nạp, nên trước đây app hiển thị sai (ví dụ $100,000,000
 * dù tài khoản chỉ có $0.10). Vì vậy hàm này không đoán mò endpoint nữa — luôn báo
 * lỗi rõ ràng để hướng người dùng kiểm tra số dư trực tiếp trên trang quản lý.
 */
export async function fetchOpenAiBalance(config) {
  const apiKey = String(config.openaiApiKey || '').trim();
  if (!apiKey) {
    throw new Error('Vui lòng nhập API Key (Token) trong phần cấu hình.');
  }
  throw new Error('Nhà cung cấp này không có endpoint số dư chuẩn — vui lòng kiểm tra số dư trực tiếp trên trang quản lý tài khoản của nhà cung cấp.');
}


/**
 * Kiểm tra nhanh API Key/Token của RunningHub hoặc nhà cung cấp OpenAI-compatible
 * bằng một request chat completion nhẹ (không kèm ảnh) để phát hiện sai key/model sớm.
 */
export async function validateOpenAiKey(config) {

  const apiKey = String(config.openaiApiKey || '').trim();
  if (!apiKey) {
    throw new Error('Vui lòng nhập API Key (Token) trong phần cấu hình.');
  }

  const modelName = String(config.openaiModel || 'rhart-image-n-pro-official/edit').trim();
  const rawBase = String(config.openaiBaseUrl || 'https://www.runninghub.ai').trim().replace(/\/+$/, '');
  const normalizedBase = /^https?:\/\//i.test(rawBase) ? rawBase : `https://${rawBase}`;
  const useProxy = typeof window !== 'undefined' && import.meta.env.DEV;

  if (isRunningHubHost(normalizedBase)) {
    return true;
  }

  // laozhang.ai: model ảnh chỉ chạy qua route Images, không qua Chat Completions,
  // nên phải validate bằng đúng route đó, nếu không sẽ luôn báo lỗi dù key hợp lệ.
  const isLaozhang = isLaozhangHost(normalizedBase);
  const url = isLaozhang
    ? (useProxy ? '/openai-proxy/v1/images/generations' : `${normalizedBase}/v1/images/generations`)
    : (useProxy ? '/openai-proxy/v1/chat/completions' : `${normalizedBase}/v1/chat/completions`);

  const body = isLaozhang
    ? { model: modelName, prompt: 'ping', n: 1, size: '1024x1024' }
    : { model: modelName, messages: [{ role: 'user', content: [{ type: 'text', text: 'ping' }] }] };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
  } catch (networkError) {
    throw new Error(`Failed to fetch. Hãy kiểm tra endpoint/kết nối internet hoặc CORS. (${networkError.message})`);
  }

  const raw = await response.text();
  let result = null;
  try { result = raw ? JSON.parse(raw) : null; } catch (e) { result = null; }

  if (!response.ok) {
    const errorText = result?.error?.message || result?.message || raw || response.statusText;
    throw new Error(`API Key validation failed (${response.status}): ${errorText}`);
  }

  return true;
}


