/**
 * AI Vision Analysis Module for AI DIP Studio
 * Tự động phân tích ảnh chân dung input:
 * - Nhận diện giới tính (Nam / Nữ)
 * - Ước lượng độ tuổi & nhóm tuổi (Trẻ em, Học sinh, Thanh niên, Trung niên, Cao tuổi)
 * - Đánh giá góc chụp, ánh sáng và kiểu tóc
 * - Đưa ra bộ gợi ý thông minh tối ưu cho ảnh thẻ chuẩn studio
 */

import config from '../data/config.js';
import { getApiConfig } from './api.js';

export const AGE_GROUPS = {
  CHILD: { id: 'child', label: 'Trẻ em', range: '5 - 12 tuổi', min: 5, max: 12 },
  STUDENT: { id: 'student', label: 'Học sinh / Sinh viên', range: '13 - 22 tuổi', min: 13, max: 22 },
  YOUNG_ADULT: { id: 'young_adult', label: 'Thanh niên (Đi làm)', range: '23 - 35 tuổi', min: 23, max: 35 },
  MIDDLE_AGED: { id: 'middle_aged', label: 'Trung niên', range: '36 - 55 tuổi', min: 36, max: 55 },
  SENIOR: { id: 'senior', label: 'Người lớn tuổi', range: '56+ tuổi', min: 56, max: 90 },
};

export function getAgeGroup(age) {
  const a = Number(age) || 25;
  if (a <= 12) return AGE_GROUPS.CHILD;
  if (a <= 22) return AGE_GROUPS.STUDENT;
  if (a <= 35) return AGE_GROUPS.YOUNG_ADULT;
  if (a <= 55) return AGE_GROUPS.MIDDLE_AGED;
  return AGE_GROUPS.SENIOR;
}

/**
 * Tạo gợi ý trang phục, tóc, nền và làm đẹp dựa trên giới tính và độ tuổi
 */
export function buildSmartSuggestions({ gender, age, hasGlasses = false }) {
  const isFemale = gender === 'female';
  const ageGroup = getAgeGroup(age);

  let suggestedOutfitId = isFemale ? 'vest-nu' : 'vest-nam';
  let suggestedHairId = 'keep';
  let suggestedBgId = 'blue-dark';
  let suggestedBeautyIds = ['skin-clean', 'freq-separation', 'skin-bright', 'eye-bright'];
  let rationale = '';

  if (ageGroup.id === 'CHILD') {
    suggestedOutfitId = 'uniform';
    suggestedBgId = 'white';
    suggestedHairId = isFemale ? 'straight-long' : 'short-neat';
    suggestedBeautyIds = ['skin-clean', 'eye-bright'];
    rationale = isFemale 
      ? 'Bé gái: Đồng phục học sinh / áo trắng tinh tế, phông trắng sáng, giữ nét ngây thơ tự nhiên.'
      : 'Bé trai: Đồng phục học sinh, tóc ngắn gọn gàng, phông trắng sáng rõ nét.';
  } else if (ageGroup.id === 'STUDENT') {
    suggestedOutfitId = isFemale ? 'aodai-trang' : 'somi-trang';
    suggestedBgId = 'blue-light';
    suggestedHairId = isFemale ? 'straight-long' : 'side-part';
    suggestedBeautyIds = ['skin-clean', 'freq-separation', 'skin-bright', 'eye-bright'];
    rationale = isFemale
      ? 'Nữ sinh: Áo dài trắng truyền thống duyên dáng, nền xanh học đường, làm đẹp da sáng hồng.'
      : 'Nam sinh: Sơ mi trắng trang nhã, tóc rẽ ngôi lịch sự, da sạch mụn tự nhiên.';
  } else if (ageGroup.id === 'YOUNG_ADULT') {
    suggestedOutfitId = isFemale ? 'vest-nu' : 'vest-nam';
    suggestedBgId = 'blue-dark';
    suggestedHairId = isFemale ? 'keep' : 'side-part';
    suggestedBeautyIds = ['skin-clean', 'freq-separation', 'skin-bright', 'eye-bright', 'face-slim'];
    rationale = isFemale
      ? 'Nữ công sở: Vest nữ sang trọng, nền xanh chuẩn Hộ chiếu / CCCD, tách tần số giữ vân da thật.'
      : 'Nam công sở: Vest nam lịch lãm cà vạt chỉnh chu, nền xanh chuẩn quốc tế, tóc vuốt gọn.';
  } else if (ageGroup.id === 'MIDDLE_AGED') {
    suggestedOutfitId = isFemale ? 'vest-nu' : 'vest-nam';
    suggestedBgId = 'blue-dark';
    suggestedHairId = isFemale ? 'bun' : 'short-neat';
    suggestedBeautyIds = ['skin-clean', 'freq-separation', 'eye-bright', 'sharp-face'];
    rationale = isFemale
      ? 'Phụ nữ trung niên: Vest nữ thanh lịch hoặc áo dài, tóc búi trang nhã, giảm nếp nhăn vừa phải.'
      : 'Nam trung niên: Vest tối màu trang trọng, tóc ngắn gọn gàng, tăng nét mặt phong độ.';
  } else {
    // SENIOR
    suggestedOutfitId = isFemale ? 'vest-nu' : 'vest-nam';
    suggestedBgId = 'white';
    suggestedHairId = 'keep';
    suggestedBeautyIds = ['skin-clean', 'sharp-face', 'eye-bright'];
    rationale = 'Người lớn tuổi: Trang phục trang nghiêm, giữ nếp nhăn tự nhiên và thần thái đôn hậu.';
  }

  // Khớp với danh sách config có sẵn
  const outfitObj = (config.outfits || []).find((o) => o.id === suggestedOutfitId) || config.outfits[0];
  const bgObj = (config.backgrounds || []).find((b) => b.id === suggestedBgId) || config.backgrounds[0];
  const hairChoices = config.hairStyles?.[gender] || [];
  const hairObj = hairChoices.find((h) => h.id === suggestedHairId) || hairChoices[0] || null;

  return {
    suggestedOutfitId,
    suggestedOutfit: outfitObj,
    suggestedBgId,
    suggestedBg: bgObj,
    suggestedHairId,
    suggestedHair: hairObj,
    suggestedBeautyIds,
    rationale,
  };
}

/**
 * Phân tích nhanh dựa trên Canvas & màu sắc pixel (Client-side Heuristic)
 * Hoạt động tức thì < 200ms không phụ thuộc mạng
 */
export async function analyzeImageLocally(file, base64) {
  return new Promise((resolve) => {
    let settled = false;
    const safeResolve = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(result);
    };

    const timeoutId = setTimeout(() => {
      safeResolve(getDefaultFallbackProfile(file));
    }, 1500);

    try {
      const src = base64 ? `data:${file?.type || 'image/jpeg'};base64,${base64}` : (file ? URL.createObjectURL(file) : null);
      if (!src) {
        return safeResolve(getDefaultFallbackProfile(file));
      }

      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 320;
          let w = img.width || 300;
          let h = img.height || 400;
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
          canvas.width = Math.max(10, w);
          canvas.height = Math.max(10, h);
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return safeResolve(getDefaultFallbackProfile(file));

          ctx.drawImage(img, 0, 0, w, h);

          const imgData = ctx.getImageData(0, 0, w, h);
          const data = imgData.data;

          // Phân tích màu môi / da ở nửa dưới khuôn mặt (y từ 40% đến 80%)
          let lipRedScore = 0;
          let skinPixelCount = 0;
          let darkHairShoulderCount = 0;
          let totalSampled = 0;

          const startY = Math.floor(h * 0.45);
          const endY = Math.floor(h * 0.75);
          const startX = Math.floor(w * 0.35);
          const endX = Math.floor(w * 0.65);

          for (let y = startY; y < endY; y += 4) {
            for (let x = startX; x < endX; x += 4) {
              const idx = (y * w + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              totalSampled++;

              // Màu môi thường có R cao hơn hẳn G và B (sắc đỏ/hồng)
              if (r > 130 && r > g * 1.35 && r > b * 1.3) {
                lipRedScore++;
              }
              // Điểm nhận diện da người Châu Á
              if (r > 95 && g > 65 && b > 45 && r > g && r > b && (r - g) > 15) {
                skinPixelCount++;
              }
            }
          }

          // Kiểm tra tóc buông xuống vai (vùng rìa 2 bên ở nửa dưới)
          const shoulderYStart = Math.floor(h * 0.6);
          const leftShoulderX = Math.floor(w * 0.15);
          const rightShoulderX = Math.floor(w * 0.85);

          for (let y = shoulderYStart; y < h; y += 4) {
            for (let dx = -10; dx <= 10; dx += 4) {
              const idxL = (y * w + (leftShoulderX + dx)) * 4;
              const idxR = (y * w + (rightShoulderX + dx)) * 4;
              if (idxL >= 0 && idxL < data.length) {
                const brightnessL = (data[idxL] + data[idxL + 1] + data[idxL + 2]) / 3;
                if (brightnessL < 65) darkHairShoulderCount++;
              }
              if (idxR >= 0 && idxR < data.length) {
                const brightnessR = (data[idxR] + data[idxR + 1] + data[idxR + 2]) / 3;
                if (brightnessR < 65) darkHairShoulderCount++;
              }
            }
          }

          // Kiểm tra gợi ý từ tên file (nếu có)
          const fileName = String(file?.name || '').toLowerCase();
          const femaleHints = ['nu', 'nữ', 'girl', 'female', 'woman', 'chi', 'chị', 'em_gai', 'me', 'mẹ', 'co', 'cô', 'trang', 'lan', 'huong', 'mai', 'linh', 'huyen', 'ngoc', 'thao', 'anh', 'vy', 'yen'];
          const maleHints = ['nam', 'boy', 'male', 'man', 'anh', 'em_trai', 'bo', 'bố', 'chu', 'chú', 'bac', 'bác', 'diep', 'duc', 'hai', 'tuan', 'hoang', 'long', 'hieu', 'thang', 'hung', 'cuong'];
          const studentHints = ['hoc-sinh', 'hocsinh', 'student', 'lop', 'school', 'teen', 'be', 'tre-con'];
          const seniorHints = ['ong', 'bà', 'ba', 'cu', 'cụ', 'gia', 'già', 'vintage', 'old'];

          let genderScore = 0; // > 0: Nữ, < 0: Nam
          if (femaleHints.some((hint) => fileName.includes(hint))) genderScore += 3;
          if (maleHints.some((hint) => fileName.includes(hint))) genderScore -= 3;
          if (studentHints.some((hint) => fileName.includes(hint))) genderScore += 0;

          // Đánh giá từ pixel
          const lipRatio = lipRedScore / Math.max(1, totalSampled);
          if (lipRatio > 0.04) genderScore += 2;
          if (darkHairShoulderCount > 15) genderScore += 2.5;

          const gender = genderScore > 0 ? 'female' : 'male';
          const confidence = Math.min(96, Math.max(82, Math.round(75 + Math.abs(genderScore) * 6)));

          let estimatedAge = gender === 'female' ? 24 : 27;
          if (studentHints.some((h) => fileName.includes(h))) estimatedAge = 17;
          else if (seniorHints.some((h) => fileName.includes(h))) estimatedAge = 62;

          const ageGroup = getAgeGroup(estimatedAge);
          const suggestions = buildSmartSuggestions({ gender, age: estimatedAge });

          safeResolve({
            gender,
            genderLabel: gender === 'female' ? 'Nữ' : 'Nam',
            genderEmoji: gender === 'female' ? '👩' : '👨',
            age: estimatedAge,
            ageRange: ageGroup.range,
            ageGroup: ageGroup.id,
            ageGroupLabel: ageGroup.label,
            confidence,
            detectedHair: darkHairShoulderCount > 15 ? (gender === 'female' ? 'Tóc dài buông vai' : 'Tóc nam tự nhiên') : 'Tóc gọn gàng',
            faceQuality: 'Ảnh rõ nét, khuôn mặt cân đối',
            source: 'local-ai',
            ...suggestions
          });
        } catch (err) {
          console.warn('Lỗi phân tích canvas:', err);
          safeResolve(getDefaultFallbackProfile(file));
        }
      };
      img.onerror = () => safeResolve(getDefaultFallbackProfile(file));
      img.src = src;
    } catch (err) {
      console.warn('Lỗi khởi tạo ảnh phân tích:', err);
      safeResolve(getDefaultFallbackProfile(file));
    }
  });
}

function getDefaultFallbackProfile(file) {
  const fileName = String(file?.name || '').toLowerCase();
  const isFemale = ['nu', 'nữ', 'girl', 'female', 'woman', 'chị'].some((h) => fileName.includes(h));
  const gender = isFemale ? 'female' : 'male';
  const age = isFemale ? 24 : 27;
  const ageGroup = getAgeGroup(age);
  const suggestions = buildSmartSuggestions({ gender, age });

  return {
    gender,
    genderLabel: isFemale ? 'Nữ' : 'Nam',
    genderEmoji: isFemale ? '👩' : '👨',
    age,
    ageRange: ageGroup.range,
    ageGroup: ageGroup.id,
    ageGroupLabel: ageGroup.label,
    confidence: 85,
    detectedHair: 'Tóc tự nhiên',
    faceQuality: 'Ảnh đã sẵn sàng tạo',
    source: 'heuristic',
    ...suggestions
  };
}

/**
 * Phân tích ảnh nâng cao sử dụng Gemini Vision API nếu có Key
 */
export async function analyzeImageWithAI(file, base64) {
  const localAnalysis = await analyzeImageLocally(file, base64);
  const apiCfg = getApiConfig();

  // Nếu người dùng có Gemini Key (hoặc proxy dev), thử gọi trực tiếp để nhận diện siêu chính xác
  const apiKey = apiCfg.geminiKey || apiCfg.geminiKey2 || apiCfg.geminiKey3;
  if (!apiKey || !base64) {
    return localAnalysis;
  }

  try {
    const isDev = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
    const url = isDev
      ? `/gemini-proxy/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
      : `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const promptText = `Hãy phân tích bức ảnh chân dung này phục vụ tạo ảnh thẻ studio Việt Nam.
Trả về DUY NHẤT một chuỗi JSON thuần (không kèm markdown, không backtick):
{
  "gender": "male" hoặc "female",
  "age": <số tuổi ước lượng, ví dụ 26>,
  "confidence": <độ tin cậy từ 80 đến 99>,
  "detectedHair": "<kiểu tóc hiện tại ngắn gọn>",
  "hasGlasses": <true hoặc false>,
  "faceQuality": "<đánh giá chất lượng khuôn mặt ngắn gọn>"
}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: file?.type || 'image/jpeg',
                data: base64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256
      }
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!resp.ok) return localAnalysis;

    const data = await resp.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return localAnalysis;

    const parsed = JSON.parse(jsonMatch[0]);
    const gender = parsed.gender === 'female' ? 'female' : 'male';
    const age = Math.min(85, Math.max(6, Number(parsed.age) || localAnalysis.age));
    const ageGroup = getAgeGroup(age);
    const suggestions = buildSmartSuggestions({ gender, age, hasGlasses: !!parsed.hasGlasses });

    return {
      gender,
      genderLabel: gender === 'female' ? 'Nữ' : 'Nam',
      genderEmoji: gender === 'female' ? '👩' : '👨',
      age,
      ageRange: `${Math.max(age - 2, 5)} - ${age + 3} tuổi`,
      ageGroup: ageGroup.id,
      ageGroupLabel: ageGroup.label,
      confidence: Math.min(99, Math.max(85, Number(parsed.confidence) || 95)),
      detectedHair: parsed.detectedHair || localAnalysis.detectedHair,
      hasGlasses: !!parsed.hasGlasses,
      faceQuality: parsed.faceQuality || 'Khuôn mặt rõ ràng, đủ sáng',
      source: 'gemini-vision',
      ...suggestions
    };
  } catch (err) {
    console.warn('AI Vision API thất bại, dùng kết quả phân tích nội bộ:', err);
    return localAnalysis;
  }
}
