import config from '../data/config.js';

const SUFFIX = config.promptSuffix;

export function buildIdPhotoPrompt({ background, outfit, size, retouchLevel, gender, hairStyle, beautyOptions = [], extraRequest = '' }) {
  const bgMap = {
    'blue-dark': 'solid dark navy blue background (#1a4b8c, standard Vietnamese passport blue)',
    'blue-light': 'solid light blue background (#5b9bd5, standard student photo blue)',
    'white': 'pure clean white background (#ffffff, international visa/passport standard)',
    'gray': 'elegant studio gray background (#7a7a7a, professional studio)',
  };
  const bgText = background?.id === 'custom' && background?.color
    ? `solid custom color background (${background.color}), clean flat studio backdrop`
    : bgMap[background?.id] || bgMap['blue-dark'];

  const outfitText = outfit?.prompt || outfit?.label || 'wearing a clean white dress shirt';
  const genderText = gender?.prompt || gender?.label || 'portrait subject';
  const hairText = hairStyle?.prompt || 'keep the original hairstyle, only tidy flyaway hair';
  const beautyText = Array.isArray(beautyOptions) && beautyOptions.length
    ? beautyOptions.map((item) => item.prompt || item.label).join('. ')
    : 'natural clean ID photo retouching, preserve real facial identity';
  const sizeText = size ? `ID photo size ${size.label}cm (${size.w}x${size.h}cm).` : '';
  const retouchText = retouchLevel > 60
    ? 'Advanced beauty retouching intensity, but preserve 100% face likeness and real facial geometry.'
    : retouchLevel > 30
    ? 'Moderate beauty retouching intensity, subtle and natural, keep facial features unchanged.'
    : 'Minimal retouching intensity, keep natural look, only fix lighting and minor imperfections.';
  const facePreservationRules = [
    'EXACT FACIAL BIOMETRIC IDENTITY PRESERVATION MANDATORY:',
    '1. EYES: Maintain exact original eye shape, eyelids (single/double eyelid fold), eye spacing, and iris color. Do NOT create generic or exaggerated anime eyes.',
    '2. NOSE: Retain exact nose bridge height, nose tip angle, and nostril width as in the source portrait.',
    '3. LIPS & JAW: Preserve natural lip thickness, mouth width, and exact jawline/chin contour (round/square/pointed) without artificial V-line slimming.',
    '4. DISTINCTIVE FEATURES: Keep original facial proportions, beauty marks, and natural skin texture.',
    '5. STRICT DIRECTIVE: This is a professional official ID photo document. Only replace the outfit, background, and lighting. The person must remain 100% recognizable as the same individual in the reference photo.',
  ].join(' ');

  const extraText = String(extraRequest || '').trim() ? `Additional user custom request: ${String(extraRequest).trim()}.` : '';

  return `Professional official ID photo (ảnh thẻ). ${sizeText} ${genderText}, ${outfitText}, standing straight with ${bgText}. Hairstyle instruction: ${hairText}. Face centered, eyes looking forward, shoulders balanced, neutral expression, ears and forehead clean when appropriate. Beauty options: ${beautyText}. ${retouchText} ${extraText} ${facePreservationRules} ${SUFFIX}`;
}

export function buildRestorePrompt({
  damageLevel,
  colorize,
  upscale,
  preset,
  enhancements = [],
  precisionMode = false,
  outputQuality,
  extraRequest = '',
}) {
  const damageMap = {
    light: 'Minor scratch and dust removal, slight blur correction',
    medium: 'Repair moderate cracks, creases, yellowing, water stains, and blur',
    severe: 'Heavy restoration: fix large tears, mold spots, severe fading, heavy damage',
  };

  const enhancementText = Array.isArray(enhancements) && enhancements.length
    ? enhancements.map((item) => item.prompt || item.label).join('. ')
    : 'restore clarity, reduce noise, recover face details';

  const presetText = preset?.prompt || 'professional old portrait restoration';
  const precisionText = precisionMode
    ? 'PRECISION MEMORIAL PORTRAIT MODE: Restore as a respectful Vietnamese worship/memorial portrait. Keep facial identity, age, expression, dignity and spiritual solemnity unchanged. Avoid beautifying into a different person. Clean background gently and make the portrait suitable for altar/framed print.'
    : 'Natural archival restoration mode: preserve original identity and vintage character while improving clarity.';

  const colorText = colorize
    ? 'AI Colorization: convert black and white to vivid natural colors. Analyze context for accurate skin tones, clothing, environment colors. Use natural warm balanced tones, avoid sallow or flat gray.'
    : 'Preserve original color/tone unless selected enhancements request colorization.';

  const upscaleText = `Upscale ${upscale?.id || outputQuality?.id || '4k'}: ${outputQuality?.prompt || 'increase resolution significantly while maintaining sharpness and texture detail.'}`;
  const extraText = String(extraRequest || '').trim()
    ? `Additional user request: ${String(extraRequest).trim()}`
    : '';

  return `Photo restoration (phục hồi ảnh cũ). ${presetText}. ${precisionText}. ${damageMap[damageLevel?.id || 'medium']}. Restoration options: ${enhancementText}. ${colorText} ${upscaleText} Denoise and sharpen: reveal lost details in faces, fabric, backgrounds. Reconstruct damaged areas naturally. ${extraText} ${SUFFIX}`;
}

export function buildRelightPrompt({ lightPosition, warmth, intensity }) {
  const posMap = {
    left: 'Key light positioned to the LEFT side of the face (45-degree left rembrandt lighting)',
    right: 'Key light positioned to the RIGHT side of the face (45-degree right rembrandt lighting)',
    top: 'Key light positioned from ABOVE (top-down beauty dish lighting)',
    front: 'Direct frontal lighting (even butterfly/paramount lighting straight from front)',
  };
  const warmthText = warmth > 60
    ? 'Warm color temperature (3200K golden studio warmth, vàng nắng ấm)'
    : warmth < 40
    ? 'Cool color temperature (6500K modern cool blue-white, xanh mát mẻ)'
    : 'Neutral balanced color temperature (5000K natural daylight)';
  const intensityText = intensity > 70
    ? 'High intensity dramatic lighting with strong highlights and controlled shadows'
    : intensity < 30
    ? 'Soft diffused low-key lighting with gentle gradient shadows'
    : 'Balanced studio lighting with natural gradient';

  return `Professional AI relighting (điều chỉnh ánh sáng). ${posMap[lightPosition?.id || 'front']}. ${warmthText}. ${intensityText} Maintain natural skin texture and facial geometry. Keep background subtle. ${SUFFIX}`;
}

export function buildConceptPrompt({ style }) {
  const styleMap = {
    coatrang: 'Ancient Vietnamese/Chinese imperial court style (cổ trang). Royal silk robes, golden embroidery, palace background, regal and majestic atmosphere. Hair styled in traditional updo.',
    doanhnhan: 'Successful business leader portrait (doanh nhân thành đạt). Luxury suit, premium office or skyline background, confident powerful pose, executive magazine cover style.',
    hanquoc: 'Korean style portrait (phong cách Hàn Quốc). K-Pop idol aesthetic, trendy fashion, clean studio or urban Seoul background, soft glamorous lighting.',
    kyyeu: 'American vintage yearbook photo (kỷ yếu Mỹ). Classic graduation cap and gown, ivy league campus background, nostalgic film photography tone, elegant timeless.',
    cyberpunk: 'Cyberpunk neo-futuristic style. Neon city lights (pink, cyan, purple), holographic elements, tech-wear clothing, blade-runner atmosphere, dramatic neon rim lighting.',
    harrypotter: 'Wizarding world style (Harry Potter). Gryffindor robes, magic wand, enchanted castle background, warm candlelight glow, mystical magical atmosphere.',
  };
  const styleText = styleMap[style?.id] || styleMap['doanhnhan'];

  return `Concept portrait transformation. Transform the subject into: ${styleText}. Keep 100% face likeness — preserve facial features, identity, and expressions. Adapt clothing, hairstyle, background, and atmosphere to match the concept. ${SUFFIX}`;
}