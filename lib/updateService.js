/**
 * GitHub Update Service for AI DIP Studio
 * Hệ thống kiểm tra và tải cập nhật tự động qua GitHub của tác giả hoangdiep99
 * Tương tự cơ chế của Chép Thẻ Nhanh Pro
 */

export const CURRENT_VERSION = '2.0.6';
export const GITHUB_REPO_URL = 'https://github.com/hoangdiep99/AI-DIP-Studio';
export const VERSION_CHECK_URL = 'https://raw.githubusercontent.com/hoangdiep99/AI-DIP-Studio/main/version.json';
export const RELEASES_API_URL = 'https://api.github.com/repos/hoangdiep99/AI-DIP-Studio/releases/latest';

/**
 * So sánh 2 chuỗi version ngữ nghĩa (ví dụ: '2.0.1' vs '2.0.0')
 * Trả về: > 0 nếu v1 > v2, < 0 nếu v1 < v2, = 0 nếu bằng nhau
 */
export function compareVersions(v1, v2) {
  const normalize = (v) => String(v || '').replace(/^[^\d]*/, '').split('.').map((p) => parseInt(p, 10) || 0);
  const p1 = normalize(v1);
  const p2 = normalize(v2);
  const len = Math.max(p1.length, p2.length, 3);

  for (let i = 0; i < len; i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Kiểm tra cập nhật từ GitHub
 * Ưu tiên file raw version.json trên nhánh main, fallback sang GitHub Releases API
 */
export async function checkForAppUpdate() {
  const cacheBuster = `t=${Date.now()}`;

  // 1. Kiểm tra qua raw version.json
  try {
    const resp = await fetch(`${VERSION_CHECK_URL}?${cacheBuster}`, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });

    if (resp.ok) {
      const data = await resp.json();
      const latestVer = String(data.latestVersion || CURRENT_VERSION).trim();
      const isNewer = compareVersions(latestVer, CURRENT_VERSION) > 0;

      return {
        isUpdateAvailable: isNewer,
        currentVersion: CURRENT_VERSION,
        latestVersion: latestVer,
        releaseDate: data.releaseDate || '',
        title: data.title || `Phiên bản mới v${latestVer}`,
        changelog: data.changelog || '',
        downloadUrlWindows: data.downloadUrlWindows || `${GITHUB_REPO_URL}/releases/latest`,
        githubRepo: data.githubRepo || GITHUB_REPO_URL,
        source: 'version.json'
      };
    }
  } catch (err) {
    console.info('Kiểm tra version.json không khả dụng, thử GitHub Releases API:', err?.message || err);
  }

  // 2. Fallback kiểm tra qua GitHub Releases API
  try {
    const resp = await fetch(`${RELEASES_API_URL}?${cacheBuster}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });

    if (resp.ok) {
      const release = await resp.json();
      const tagName = String(release.tag_name || release.name || CURRENT_VERSION).trim();
      const cleanVer = tagName.replace(/^[^\d]*/, '').trim();
      const isNewer = compareVersions(cleanVer, CURRENT_VERSION) > 0;

      // Tìm file asset .exe cho Windows trong danh sách release assets
      let winAssetUrl = '';
      if (Array.isArray(release.assets)) {
        const exeAsset = release.assets.find((a) => String(a.name || '').endsWith('.exe'));
        if (exeAsset) winAssetUrl = exeAsset.browser_download_url;
      }

      return {
        isUpdateAvailable: isNewer,
        currentVersion: CURRENT_VERSION,
        latestVersion: cleanVer,
        releaseDate: release.published_at ? new Date(release.published_at).toLocaleDateString('vi-VN') : '',
        title: release.name || `Bản cập nhật v${cleanVer}`,
        changelog: release.body || '',
        downloadUrlWindows: winAssetUrl || release.html_url || `${GITHUB_REPO_URL}/releases/latest`,
        githubRepo: GITHUB_REPO_URL,
        source: 'github-api'
      };
    }
  } catch (err) {
    console.warn('Lỗi kiểm tra cập nhật GitHub:', err);
  }

  // Nếu không có kết nối internet hoặc repo chưa công khai release mới
  return {
    isUpdateAvailable: false,
    currentVersion: CURRENT_VERSION,
    latestVersion: CURRENT_VERSION,
    releaseDate: '16/10/2026',
    title: `AI DIP Studio v${CURRENT_VERSION}`,
    changelog: 'Bạn đang sử dụng phiên bản ổn định mới nhất.',
    downloadUrlWindows: `${GITHUB_REPO_URL}/releases`,
    githubRepo: GITHUB_REPO_URL,
    source: 'local'
  };
}

/**
 * Mở đường dẫn tải bản cài đặt hoặc trang GitHub trong trình duyệt
 */
export function openUpdateDownload(downloadUrl) {
  const targetUrl = downloadUrl || `${GITHUB_REPO_URL}/releases/latest`;
  window.open(targetUrl, '_blank', 'noopener,noreferrer');
}
