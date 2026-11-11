import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { gommoApi, getApiConfig, saveApiConfig, toItems, initApiConfigFromDisk } from './lib/api.js';
import { sanitizeImageModelList } from './lib/modelCatalog.js';
import { validateGeminiKey, validateOpenAiKey, fetchOpenAiModels, fetchOpenAiBalance } from './lib/generate.js';
import donateQrImage from './assets/qr-donate.jpg';
import appLogo from './assets/logo.svg';




import IdPhotoGenerator from './components/IdPhotoGenerator.jsx';
import PhotoRestorer from './components/PhotoRestorer.jsx';
import ProfessionalLayout from './components/ProfessionalLayout.jsx';
import HistoryGallery from './components/HistoryGallery.jsx';
import SetupGuide from './components/SetupGuide.jsx';
import UpdateModal from './components/UpdateModal.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { checkForAppUpdate, CURRENT_VERSION } from './lib/updateService.js';



function App() {
  const [activeTab, setActiveTab] = useState('id-photo');
  const [theme, setTheme] = useState('dark');
  const [layoutSeed, setLayoutSeed] = useState(null);
  const [apiModels, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);
  const [modelError, setModelError] = useState('');
  const [credits, setCredits] = useState(0);
  const [loadingCredits, setLoadingCredits] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountDebug, setAccountDebug] = useState(null);
  const [apiConfig, setApiConfigState] = useState(() => {
    const cfg = getApiConfig();
    if (!cfg.mode || (cfg.mode === 'custom' && !cfg.geminiKey) || cfg.mode === 'openai') {
      cfg.mode = 'system';
      saveApiConfig(cfg);
    }
    return cfg;
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [creditsError, setCreditsError] = useState('');
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showThanksModal, setShowThanksModal] = useState(false);
  const [loginDebug, setLoginDebug] = useState(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [hasNewUpdate, setHasNewUpdate] = useState(false);

  const handleCheckUpdate = async (isManual = false) => {
    if (isManual) setShowUpdateModal(true);
    setCheckingUpdate(true);
    try {
      const info = await checkForAppUpdate();
      setUpdateInfo(info);
      if (info?.isUpdateAvailable) {
        setHasNewUpdate(true);
        if (!isManual) setShowUpdateModal(true);
      } else {
        setHasNewUpdate(false);
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra cập nhật:', err);
    } finally {
      setCheckingUpdate(false);
    }
  };

  useEffect(() => {
    initApiConfigFromDisk().then((cfg) => {
      if (cfg) setApiConfigState(cfg);
    });
    // Tự động kiểm tra bản cập nhật mới từ GitHub sau khi mở app 2.5s
    const timer = setTimeout(() => {
      handleCheckUpdate(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const parseCreditNumber = (value) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const normalized = value.replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  };

  const extractCredits = (payload) => {
    const directPaths = [
      'balancesInfo.credits_ai',
      'balancesInfo.credit_ai',
      'balancesInfo.ai_credits',
      'balancesInfo.credits',
      'balancesInfo.balance',
      'data.balancesInfo.credits_ai',
      'data.balancesInfo.credit_ai',
      'data.balancesInfo.ai_credits',
      'data.balancesInfo.credits',
      'data.balancesInfo.balance',
      'data.data.balancesInfo.credits_ai',
      'data.data.balancesInfo.credit_ai',
      'userInfo.credits_ai',
      'userInfo.balance',
      'data.userInfo.credits_ai',
      'data.userInfo.balance',
      'credits',
      'credit',
      'credits_ai',
      'credit_ai',
      'ai_credits',
      'aiCredits',
      'balance',
      'wallet',
      'amount',
      'total',
      'data.credits',
      'data.credit',
      'data.credits_ai',
      'data.credit_ai',
      'data.ai_credits',
      'data.aiCredits',
      'data.balance',
      'data.wallet.balance',
      'data.wallet.credits',
      'data.user.balance',
      'data.user.credits',
      'data.account.balance',
      'data.account.credits',
      'user.balance',
      'user.credits',
      'account.balance',
      'account.credits',
      'wallet.balance',
      'wallet.credits',
      'me.balance',
      'me.credits'
    ];

    const getPath = (obj, path) => path.split('.').reduce((cur, key) => cur?.[key], obj);
    for (const path of directPaths) {
      const found = parseCreditNumber(getPath(payload, path));
      if (found !== null) return found;
    }

    const visited = new WeakSet();
    const walk = (node) => {
      if (!node || typeof node !== 'object') return null;
      if (visited.has(node)) return null;
      visited.add(node);

      const preferredKeys = ['credits_ai', 'credit_ai', 'credits', 'credit', 'ai_credits', 'aiCredits', 'balance'];
      for (const key of preferredKeys) {
        const value = parseCreditNumber(node[key]);
        if (value !== null) return value;
      }

      for (const value of Object.values(node)) {
        const nested = walk(value);
        if (nested !== null) return nested;
      }
      return null;
    };

    return walk(payload);
  };

  const isAccountCandidate = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj).map((key) => String(key).toLowerCase());
    return keys.some((key) => [
      'name', 'full_name', 'fullname', 'username', 'email', 'phone', 'accountname', 'displayname',
      'credits', 'balance', 'credit', 'wallet', 'user', 'account', 'subscription', 'package', 'plan'
    ].some((term) => key.includes(term)));
  };

  const findAccountObject = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findAccountObject(item);
        if (found) return found;
      }
      return null;
    }

    if (isAccountCandidate(node)) return node;

    for (const value of Object.values(node)) {
      const found = findAccountObject(value);
      if (found) return found;
    }
    return null;
  };

  const extractAccountCandidate = (node) => {
    const visited = new WeakSet();
    const isCandidate = (item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
      return Object.keys(item).some((key) => {
        const lower = String(key).toLowerCase();
        return ['name', 'full_name', 'fullname', 'username', 'email', 'phone', 'account', 'profile', 'nick', 'balance', 'credit', 'credits', 'wallet', 'avatar'].some((term) => lower.includes(term));
      });
    };

    const walk = (value) => {
      if (!value || typeof value !== 'object' || visited.has(value)) return null;
      visited.add(value);
      if (isCandidate(value)) return value;
      if (Array.isArray(value)) {
        for (const item of value) {
          const found = walk(item);
          if (found) return found;
        }
      } else {
        for (const nested of Object.values(value)) {
          const found = walk(nested);
          if (found) return found;
        }
      }
      return null;
    };

    return walk(node);
  };

  const unwrapAccountPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return payload || {};
    if (payload.data && typeof payload.data === 'object') {
      const direct = payload.data.userInfo || payload.data.user || payload.data.account || payload.data.profile || payload.data.customer;
      if (direct && typeof direct === 'object') return direct;
      if (isAccountCandidate(payload.data)) return payload.data;
    }
    if (payload.userInfo && typeof payload.userInfo === 'object') return payload.userInfo;
    if (payload.user && typeof payload.user === 'object') return payload.user;
    if (payload.account && typeof payload.account === 'object') return payload.account;
    if (isAccountCandidate(payload)) return payload;

    const found = findAccountObject(payload);
    if (found) return found;
    return payload || {};
  };

  const getAccountDisplayName = () => {
    const user = accountInfo || {};
    return user.name || user.full_name || user.fullName || user.username || user.email || user.phone || user.accountName || user.displayName || 'Tài khoản AI VIDEO AUTO';
  };

  const getAccountEmail = () => {
    const user = accountInfo?.userInfo || accountInfo?.user || accountInfo?.account || accountInfo || {};
    return user.email || user.phone || user.username || user.accountEmail || 'Chưa có thông tin';
  };

  const getSubscriptionText = () => {
    const sub = accountInfo?.currentSubscription || accountInfo?.subscription || accountInfo?.plan || null;
    if (!sub) return 'Chưa có gói khả dụng';
    return sub.name || sub.title || sub.package_name || sub.plan_name || sub.status || 'Đang hoạt động';
  };

  const isServiceUnavailable = () => {
    const sub = accountInfo?.currentSubscription || accountInfo?.subscription || accountInfo?.plan || null;
    const status = String(sub?.status || sub?.state || '').toLowerCase();
    return accountError || status.includes('unavailable') || status.includes('expired') || status.includes('inactive') || status.includes('disabled');
  };

  /**
   * Đồng bộ tài khoản và Credits từ OmniVi.AI chỉ bằng DUY NHẤT 1 request POST /me
   * Loại bỏ hoàn toàn gọi lặp lại hay concurrent duplicate requests để tránh bị chặn IP
   */
  const refreshAccountAndCredits = async () => {
    if (apiConfig.mode === 'openai') {
      setLoadingCredits(true);
      setCreditsError('');
      try {
        const usdBalance = await fetchOpenAiBalance(apiConfig);
        setCredits(Math.max(0, usdBalance));
        setCreditsError('');
        return usdBalance;
      } catch (err) {
        console.warn('Lỗi tải số dư OpenAI-compatible:', err);
        setCredits(0);
        setCreditsError(`Chưa đọc được số dư USD từ ${apiConfig.openaiBaseUrl || 'nhà cung cấp'}. ${err?.message || ''}`);
        return 0;
      } finally {
        setLoadingCredits(false);
      }
    }

    if (apiConfig.mode !== 'system') {
      setLoadingCredits(false);
      setLoadingAccount(false);
      return 0;
    }

    const token = (apiConfig.accessToken || '').trim().replace(/^Bearer\s+/i, '');
    if (!token) {
      setAccountInfo(null);
      setCredits(0);
      setCreditsError('Bạn chưa cài đặt API Key OmniVi. Vui lòng bấm "⚙️ Đổi API Key" bên dưới để nhập API Key từ omnivi.ai.');
      setLoadingAccount(false);
      setLoadingCredits(false);
      return 0;
    }

    setLoadingAccount(true);
    setLoadingCredits(true);
    setAccountError('');
    setCreditsError('');

    try {
      const res = await gommoApi('/me', { method: 'POST', body: {} });
      const nextCredits = extractCredits(res);
      if (nextCredits !== null) {
        setCredits(Math.max(0, nextCredits));
        setCreditsError('');
      }

      let payload = unwrapAccountPayload(res);
      if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
        payload = extractAccountCandidate(res);
      }
      if (payload && typeof payload === 'object' && Object.keys(payload).length > 0) {
        setAccountInfo(payload);
        const sub = payload?.currentSubscription || payload?.subscription || payload?.plan || null;
        const status = String(sub?.status || sub?.state || '').toLowerCase();
        if (status.includes('unavailable') || status.includes('expired') || status.includes('inactive') || status.includes('disabled')) {
          setAccountError('Hiện gói dịch vụ không khả dụng tại thời điểm này.');
        }
      }
      return nextCredits;
    } catch (err) {
      console.warn('Lỗi đồng bộ tài khoản & credits OmniVi:', err);
      setAccountInfo(null);
      setCredits(0);
      let errMsg = err.message || 'Không kết nối được API OmniVi.';
      if (/rate_limit|ip-blocked|api_key_abuse/i.test(errMsg)) {
        errMsg = 'OmniVi tạm chặn IP do API Key chưa đúng hoặc gọi quá nhiều lần. Vui lòng đợi 3-5 phút và cập nhật lại API Key mới từ trang omnivi.ai/vi/account (mục API).';
      } else if (/invalidKey|unauthorized/i.test(errMsg)) {
        errMsg = 'API Key chưa chính xác hoặc đã hết hạn. Vui lòng vào omnivi.ai/vi/account (mục API) để sao chép lại API Key mới.';
      }
      setAccountError(errMsg);
      setCreditsError(errMsg);
      return 0;
    } finally {
      setLoadingAccount(false);
      setLoadingCredits(false);
    }
  };

  const fetchAccount = () => refreshAccountAndCredits();
  const fetchCredits = () => refreshAccountAndCredits();

  useEffect(() => {
    async function fetchModels() {
      setLoadingModels(true);
      setModelError('');

      // Chế độ RunningHub/OpenAI-compatible: lấy model của chính nhà cung cấp đó
      if (apiConfig.mode === 'openai') {
        try {
          const list = await fetchOpenAiModels(apiConfig);
          if (list.length) {
            setModels(list);
          } else {
            setModels([]);
            setModelError('Nhà cung cấp không trả về model nào từ /v1/models.');
          }
        } catch (err) {
          console.warn('Lỗi tải model OpenAI-compatible:', err);
          setModels([]);
          setModelError(err?.message || 'Không tải được danh sách model từ nhà cung cấp.');
        }
        setLoadingModels(false);
        return;
      }

      // OmniVi.AI v2: Nếu chưa nhập key, dùng ngay model có sẵn trong FALLBACK_MODELS (không gọi mạng)
      if (!apiConfig.accessToken) {
        setModels(FALLBACK_MODELS.image);
        setLoadingModels(false);
        return;
      }

      // Nếu đã có token, chỉ gọi đúng duy nhất 1 request POST /models
      try {
        const res = await gommoApi('/models', { method: 'POST', body: { type: 'image' } });
        const candidate = sanitizeImageModelList(toItems(res));
        if (candidate.length) {
          setModels(candidate);
        } else {
          setModels(FALLBACK_MODELS.image);
        }
      } catch (err) {
        console.warn('Lỗi tải model OmniVi, sử dụng danh mục mặc định:', err);
        setModels(FALLBACK_MODELS.image);
      } finally {
        setLoadingModels(false);
      }
    }

    fetchModels();
    refreshAccountAndCredits();
  }, [apiConfig.mode, apiConfig.accessToken, apiConfig.customEndpoint, apiConfig.domain, apiConfig.openaiBaseUrl, apiConfig.openaiApiKey]);


  // Đã bỏ auto-refresh khi focus/visibilitychange để tránh spam API gây chặn IP

  // Cứ mỗi 35 phút (trong khoảng 30-45 phút) sử dụng app hiện popup Tác giả / Cảm ơn 1 lần.
  // Mẹo test nhanh: mở app với URL có thêm ?test_thanks=1 (ví dụ index.html?test_thanks=1)
  // để popup hiện ngay lập tức, không cần chờ đủ 35 phút.
  useEffect(() => {
    const THANKS_INTERVAL_MS = 35 * 60 * 1000;
    const isTestMode = new URLSearchParams(window.location.search).get('test_thanks') === '1';
    if (isTestMode) {
      setShowThanksModal(true);
    } else {
      const lastShown = Number(sessionStorage.getItem('aidip_last_thanks_shown') || '0');
      const now = Date.now();
      if (!lastShown) {
        sessionStorage.setItem('aidip_last_thanks_shown', String(now));
      } else if (now - lastShown >= THANKS_INTERVAL_MS) {
        setShowThanksModal(true);
        sessionStorage.setItem('aidip_last_thanks_shown', String(now));
      }
    }
    const timer = window.setInterval(() => {
      setShowThanksModal(true);
      sessionStorage.setItem('aidip_last_thanks_shown', String(Date.now()));
    }, THANKS_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);



  const openConfigModal = async () => {
    const cfg = await initApiConfigFromDisk();
    setApiConfigState(cfg || getApiConfig());
    setShowConfigModal(true);
  };

  const PRICING_URL = 'https://omnivi.ai/vi/prices';

  const openPricingPage = () => {
    window.open(PRICING_URL, '_blank', 'noopener,noreferrer');
  };

  const openCreditsModal = () => {
    setShowCreditsModal(true);
    fetchCredits();
  };

  const openAccountModal = () => {
    setShowAccountModal(true);
    fetchAccount();
  };

  const handleLogout = async () => {
    try {
      if (window.gommoMiniApp?.auth?.logout) {
        await window.gommoMiniApp.auth.logout();
      } else if (window.gommoMiniApp?.call) {
        await window.gommoMiniApp.call('auth.logout', {});
      }
    } catch (err) {
      console.warn('Logout bridge chưa hỗ trợ hoặc lỗi khi đăng xuất:', err);
    } finally {
      localStorage.removeItem('aidip_api_mode');
      localStorage.removeItem('aidip_gemini_key');
      localStorage.removeItem('aidip_gemini_key_2');
      localStorage.removeItem('aidip_gemini_key_3');
      localStorage.removeItem('aidip_access_token');
      localStorage.removeItem('aidip_domain');
      localStorage.removeItem('aidip_custom_endpoint');
      setAccountInfo(null);
      setAccountError('');
      setAccountDebug(null);
      setApiConfigState(getApiConfig());
      window.location.reload();
    }
  };

  const handleLogin = async () => {
    try {
      if (window.gommoMiniApp?.auth?.login) {
        await window.gommoMiniApp.auth.login();
      } else if (window.gommoMiniApp?.call) {
        await window.gommoMiniApp.call('auth.login', {});
      } else {
        // Fallback: open hosted login page
        window.open('https://omnivi.ai/vi/login', '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.warn('Login bridge chưa hỗ trợ hoặc lỗi khi đăng nhập:', err);
      window.open('https://omnivi.ai/vi/login', '_blank', 'noopener,noreferrer');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleSaveConfig = (event) => {
    event.preventDefault();
    const token = (apiConfig.accessToken || '').trim().replace(/^Bearer\s+/i, '');
    if (token.includes('•') || token.includes('●') || token.includes('***')) {
      setLoginError('⚠ API Key chứa ký tự bị ẩn (chấm đen ••• hoặc sao ***). Vui lòng vào omnivi.ai/vi/account sao chép lại mã thật.');
      return;
    }
    saveApiConfig(apiConfig);
    setSaveSuccess(true);
    refreshAccountAndCredits();
    setTimeout(() => {
      setSaveSuccess(false);
      setShowConfigModal(false);
    }, 1200);
  };

  const handleLoginWithApi = async (event) => {
    if (event && event.preventDefault) event.preventDefault();
    setLoginError('');
    setLoginSuccess(false);
    setLoginInProgress(true);
    try {
      if (apiConfig.mode === 'custom') {
        await validateGeminiKey(apiConfig);
      } else if (apiConfig.mode === 'system') {
        const token = (apiConfig.accessToken || '').trim().replace(/^Bearer\s+/i, '');
        if (!token) {
          throw new Error('Vui lòng nhập API Key từ tài khoản OmniVi.AI của bạn.');
        }
        apiConfig.accessToken = token;
        apiConfig.customEndpoint = 'https://omnivi.ai/api/v2';
        apiConfig.domain = 'omnivi.ai';

        const testRes = await fetch('https://omnivi.ai/api/v2/me', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        const testText = await testRes.text();
        let testData = null;
        try { testData = JSON.parse(testText); } catch(e) { testData = testText; }

        if (!testRes.ok) {
          if (testRes.status === 429 || /rate_limit|ip-blocked|api_key_abuse/i.test(testText)) {
            const waitSec = testData?.remainingTime || 180;
            throw new Error(`IP máy đang bị OmniVi tạm chặn (${waitSec}s) do API Key chưa đúng hoặc gọi quá nhiều lần. Vui lòng đợi ${waitSec}s rồi thử lại, hoặc vào https://omnivi.ai/vi/account thêm IP vào ô IP Whitelist.`);
          }
          if (testRes.status === 403 || /invalidKey|unauthorized/i.test(testText)) {
            throw new Error('API Key không hợp lệ. Vui lòng vào https://omnivi.ai/vi/account (mục API) để sao chép đúng API Key.');
          }
          throw new Error(`Kết nối OmniVi thất bại (${testRes.status}): ${testData?.message || testData?.error_code || testRes.statusText}`);
        }

        const bal = testData?.balancesInfo?.balance ?? testData?.balancesInfo?.credits_ai;
        if (bal !== undefined) {
          setCredits(Math.max(0, bal));
          setCreditsError('');
        }
      }
      saveApiConfig(apiConfig);


      setLoginSuccess(true);
      setTimeout(() => setLoginSuccess(false), 1400);
      setShowConfigModal(false);
    } catch (err) {
      setLoginError(err.message || 'Đăng nhập thất bại — API Key có thể không hợp lệ.');
    } finally {
      setLoginInProgress(false);
    }
  };


  const runDiagnostic = async () => {
    setLoginError('');
    setLoginDebug(null);
    setLoginDebug({ message: 'Chức năng kiểm tra kết nối đã bị tắt để đơn giản hóa cấu hình.' });
  };

  const sendPhotoToLayout = (photo) => {
    if (!photo?.url) return;
    setLayoutSeed({
      ...photo,
      id: `id-result-${Date.now()}`,
      receivedAt: Date.now(),
    });
    setActiveTab('layout');
  };

  return (
    <div className={`app-root ${theme}-mode`}>
      <header className="app-header">
        <div className="app-logo">
          <div className="logo-mark">
            <img src={appLogo} alt="AI DIP Studio" className="logo-svg-img" />
          </div>
          <div className="logo-text">
            <div className="logo-title-row">
              <h1>AI DIP Studio</h1>
              <span className="version-tag">v{CURRENT_VERSION}</span>
            </div>
            <span>Tạo ảnh thẻ, phục chế ảnh bằng AI</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="credits-badge" onClick={openCreditsModal} title="Xem số dư và nạp Credits">
            <span>🪙</span>
            <span>{loadingCredits ? '...' : apiConfig.mode === 'openai' ? `$${credits.toFixed(2)}` : `${credits.toLocaleString('vi-VN')} Credits`}</span>
          </button>


          <button className="btn-api-config" onClick={openConfigModal} title="Đấu nối API Key cá nhân">
            <span>⚙️</span>
            <span>{apiConfig.mode === 'custom' ? 'API: Cá nhân' : apiConfig.mode === 'openai' ? 'API: Dự phòng' : 'API: Hệ thống'}</span>
          </button>

          <button
            className={`btn-check-update ${hasNewUpdate ? 'has-update' : ''}`}
            onClick={() => handleCheckUpdate(true)}
            title="Kiểm tra bản cập nhật mới từ GitHub"
          >
            <span>{hasNewUpdate ? '🚀' : '🔄'}</span>
            <span>{hasNewUpdate ? 'Có bản mới!' : 'Cập nhật'}</span>
            {hasNewUpdate && <span className="update-pulse-dot"></span>}
          </button>


          <button className="account-chip" onClick={openAccountModal} title="Thông tin tài khoản và đăng xuất">
            <span>👤</span>
            <span>{loadingAccount ? 'Tài khoản...' : accountInfo ? 'Tài khoản' : 'Đăng nhập'}</span>
          </button>

          <button className="theme-toggle" onClick={toggleTheme} title="Chuyển đổi giao diện">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <div className="tab-bar">
        <button className={`tab-item ${activeTab === 'id-photo' ? 'active' : ''}`} onClick={() => setActiveTab('id-photo')}>
          <span className="tab-icon">🪪</span> Ảnh Thẻ AI
        </button>
        <button className={`tab-item ${activeTab === 'restorer' ? 'active' : ''}`} onClick={() => setActiveTab('restorer')}>
          <span className="tab-icon">🖼️</span> Phục Hồi Ảnh Cũ
        </button>
        <button className={`tab-item ${activeTab === 'layout' ? 'active' : ''}`} onClick={() => setActiveTab('layout')}>
          <span className="tab-icon">🖨️</span> Layout In Ấn
        </button>
        <button className={`tab-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <span className="tab-icon">🕘</span> Lịch Sử
        </button>
        <button className={`tab-item ${activeTab === 'guide' ? 'active' : ''}`} onClick={() => setActiveTab('guide')}>
          <span className="tab-icon">📘</span> Hướng Dẫn
        </button>
      </div>



      <main className="app-main">
        {(modelError || isServiceUnavailable()) && (
          <div className="error-banner service-notice">⚠ {modelError || accountError}</div>
        )}
        <section style={{ display: activeTab === 'id-photo' ? 'block' : 'none' }} aria-hidden={activeTab !== 'id-photo'}>
          <IdPhotoGenerator
            models={apiModels}
            loadingModels={loadingModels}
            modelError={modelError}
            onSendToLayout={sendPhotoToLayout}
          />
        </section>
        <section style={{ display: activeTab === 'restorer' ? 'block' : 'none' }} aria-hidden={activeTab !== 'restorer'}>
          <PhotoRestorer models={apiModels} loadingModels={loadingModels} modelError={modelError} onSendToLayout={sendPhotoToLayout} />
        </section>
        <section style={{ display: activeTab === 'layout' ? 'block' : 'none' }} aria-hidden={activeTab !== 'layout'}>
          <ProfessionalLayout incomingPhoto={layoutSeed} />
        </section>
        <section style={{ display: activeTab === 'history' ? 'block' : 'none' }} aria-hidden={activeTab !== 'history'}>
          <HistoryGallery onSendToLayout={sendPhotoToLayout} active={activeTab === 'history'} />
        </section>
        <section style={{ display: activeTab === 'guide' ? 'block' : 'none' }} aria-hidden={activeTab !== 'guide'}>
          <SetupGuide onTestThanksPopup={() => setShowThanksModal(true)} />
        </section>

      </main>



      <footer className="author-contact-footer" aria-label="Liên hệ tác giả">
        <div className="author-peek-handle">
          <span>▲ Liên hệ tác giả & Donate</span>
        </div>
        <div className="author-contact-card">
          <div className="author-contact-copy">
            <div className="author-title-line">
              <span className="author-contact-kicker">Tác giả</span>
              <strong>AI DIP Studio <span className="version-pill">v{CURRENT_VERSION}</span></strong>
            </div>
            <p>Hỗ trợ cài đặt Capture One • MagiMir - Haicaoyun • VPN • Google Drive • Capcut pro • Cân màu màn hình.</p>
          </div>
          <div className="author-contact-actions">
            <a
              className="author-contact-button"
              href="https://www.facebook.com/diepfoto"
              target="_blank"
              rel="noreferrer"
            >
              💬 Facebook
            </a>
            <div className="donate-qr-box" title="Rê chuột để phóng to mã QR donate">
              <img className="donate-qr-img" src={donateQrImage} alt="QR donate" />
              <span className="donate-qr-label">☕ Donate</span>
            </div>
          </div>
        </div>
      </footer>


      {showAccountModal && (
        <div className="modal-backdrop" onClick={() => setShowAccountModal(false)}>
          <div className="config-modal-card account-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 Thông tin tài khoản</h3>
              <button className="close-btn" onClick={() => setShowAccountModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {loadingAccount ? (
                <div className="loading-text">Đang tải thông tin tài khoản...</div>
              ) : (
                <>
                  {accountInfo ? (
                    <>
                      <div className="account-card">
                        <div className="account-avatar">👤</div>
                        <div>
                          <h4>{getAccountDisplayName()}</h4>
                          <p>{getAccountEmail()}</p>
                        </div>
                      </div>

                      <div className="account-row"><span>{apiConfig.mode === 'openai' ? 'Số dư (USD)' : 'Số dư AI Credits'}</span><strong>{apiConfig.mode === 'openai' ? `$${credits.toFixed(2)}` : `${credits.toLocaleString('vi-VN')} Credits`}</strong></div>

                      <div className="account-row"><span>Gói dịch vụ</span><strong>{getSubscriptionText()}</strong></div>
                      <div className="account-row"><span>API hiện tại</span><strong>{apiConfig.mode === 'custom' ? 'API cá nhân' : 'AI VIDEO AUTO Bridge'}</strong></div>

                      {(accountError || isServiceUnavailable()) && (
                        <div className="error-banner">⚠ {accountError || 'Hiện gói dịch vụ không khả dụng tại thời điểm này.'}</div>
                      )}

                      <div className="modal-actions account-actions">
                        <button type="button" className="btn-secondary" onClick={fetchAccount} disabled={loadingAccount}>↻ Cập nhật</button>
                        <button type="button" className="logout-button" onClick={handleLogout}>🚪 Đăng xuất / đổi tài khoản</button>
                      </div>
                      {accountDebug && (
                        <div style={{ marginTop: 12 }}>
                          <details>
                            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Chi tiết phản hồi API</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8, marginTop: 8, color: '#fff', maxHeight: 220, overflow: 'auto' }}>
{JSON.stringify(accountDebug, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <p>Chưa đọc được thông tin tài khoản. Vui lòng thử lại hoặc kiểm tra cấu hình API.</p>
                      <div className="modal-actions account-actions">
                        <button type="button" className="btn-secondary" onClick={fetchAccount} disabled={loadingAccount}>↻ Thử tải lại</button>
                        <button type="button" className="btn-submit" onClick={handleLogin}>🔐 Đăng nhập</button>
                      </div>
                      {accountDebug && (
                        <div style={{ marginTop: 12 }}>
                          <details>
                            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Chi tiết phản hồi API</summary>
                            <pre style={{ whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8, marginTop: 8, color: '#fff', maxHeight: 220, overflow: 'auto' }}>
{JSON.stringify(accountDebug, null, 2)}</pre>
                          </details>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showCreditsModal && (
        <div className="modal-backdrop" onClick={() => setShowCreditsModal(false)}>
          <div className="config-modal-card payment-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>🪙 AI Credits</h3>
              <button className="close-btn" onClick={() => setShowCreditsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="credit-balance-card">
                <span>Số dư hiện tại</span>
                <strong>{loadingCredits ? 'Đang cập nhật...' : apiConfig.mode === 'openai' ? `$${credits.toFixed(2)}` : `${credits.toLocaleString('vi-VN')} Credits ($${credits})`}</strong>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button className="btn-secondary" onClick={fetchCredits} disabled={loadingCredits}>
                    {loadingCredits ? 'Đang tải...' : '↻ Cập nhật số dư'}
                  </button>
                  <button className="btn-secondary" onClick={() => { setShowCreditsModal(false); setShowConfigModal(true); }}>
                    ⚙️ Đổi API Key
                  </button>
                </div>
                {creditsError && (
                  <div className="hint-text" style={{ width: '100%', marginTop: '10px', color: '#ff7b72', background: 'rgba(255, 123, 114, 0.1)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255, 123, 114, 0.2)' }}>
                    ⚠ {creditsError}
                  </div>
                )}
              </div>

              <div className="payment-box">
                <h4>⚡ Nạp Credits trên trang chủ</h4>
                <p>Bấm nút bên dưới để mở trang bảng giá/nạp Credits chính thức của OmniVi.AI.</p>
                <div className="pricing-card">
                  <span>Trang nạp chính thức</span>
                  <strong>omnivi.ai/vi/prices</strong>
                </div>
                <div className="payment-actions">
                  <button type="button" className="btn-submit" onClick={openPricingPage}>🚀 Mở trang nạp Credits</button>
                  <a className="btn-secondary" href="https://omnivi.ai/vi/prices" target="_blank" rel="noreferrer">Mở tab mới</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="config-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ Cấu hình Kết nối API <span className="version-pill">v{CURRENT_VERSION}</span></h3>
              <button className="close-btn" onClick={() => setShowConfigModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveConfig} className="modal-body">
              <p className="modal-desc">Kết nối chính dùng OmniVi.AI hoặc Google Gemini API Key cá nhân.</p>

              <div className="form-group">
                <label>Chế độ kết nối:</label>
                <div className="radio-group" style={{ display: 'grid', gap: 12, padding: '10px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio"
                      name="api_mode"
                      value="system"
                      checked={apiConfig.mode === 'system'}
                      onChange={() => setApiConfigState({ ...apiConfig, mode: 'system' })}
                    />
                    <div>
                      <strong>Hệ thống OmniVi.AI (Khuyên dùng - Mặc định)</strong>
                      <div style={{ fontSize: 12, color: 'var(--muted, #bbb)' }}>Kết nối trực tiếp API v2 (https://omnivi.ai/api/v2).</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio"
                      name="api_mode"
                      value="custom"
                      checked={apiConfig.mode === 'custom'}
                      onChange={() => setApiConfigState({ ...apiConfig, mode: 'custom' })}
                    />
                    <div>
                      <strong>Google Gemini API Key cá nhân</strong>
                      <div style={{ fontSize: 12, color: 'var(--muted, #bbb)' }}>Dùng khi bạn gọi API Gemini Google trực tiếp.</div>
                    </div>
                  </label>
                </div>
              </div>

              {apiConfig.mode === 'custom' && (
                <div className="custom-fields">
                  <div className="form-group">
                    <label htmlFor="gemini_key">Google Gemini API Key:</label>
                    <input id="gemini_key" type="password" placeholder="Chính" value={apiConfig.geminiKey} onChange={(event) => setApiConfigState({ ...apiConfig, geminiKey: event.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gemini_key2">Google Gemini API Key 2 (Dự phòng):</label>
                    <input id="gemini_key2" type="password" placeholder="Dự phòng 1" value={apiConfig.geminiKey2 || ''} onChange={(event) => setApiConfigState({ ...apiConfig, geminiKey2: event.target.value })} />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gemini_key3">Google Gemini API Key 3 (Dự phòng):</label>
                    <input id="gemini_key3" type="password" placeholder="Dự phòng 2" value={apiConfig.geminiKey3 || ''} onChange={(event) => setApiConfigState({ ...apiConfig, geminiKey3: event.target.value })} />
                  </div>
                </div>
              )}

              {apiConfig.mode === 'system' && (
                <div className="custom-fields">
                  <div className="form-group">
                    <label htmlFor="access_token">OmniVi API Key (Token):</label>
                    <input
                      id="access_token"
                      type="text"
                      placeholder="Dán mã API Key dạng chuỗi từ omnivi.ai (vd: c44775d7-...)"
                      value={apiConfig.accessToken || ''}
                      onChange={(event) => {
                        const val = event.target.value.trim();
                        if (val.includes('•') || val.includes('●') || val.includes('***')) {
                          setLoginError('⚠ Bạn vừa dán ký tự bị ẩn (chấm đen ••• hoặc sao ***). Vui lòng vào omnivi.ai/vi/account (mục API), bấm nút Sao chép (📋) để copy đúng mã API Key.');
                        } else {
                          setLoginError('');
                        }
                        setApiConfigState({ ...apiConfig, accessToken: val });
                      }}
                      required
                    />
                    <div style={{ fontSize: 12, color: 'var(--muted, #bbb)', marginTop: 6 }}>
                      Lấy API Key: Đăng nhập tại <a href="https://omnivi.ai/vi/account" target="_blank" rel="noopener noreferrer" style={{ color: '#58a6ff' }}>omnivi.ai/vi/account</a> &gt; Mở mục <strong>API</strong> &gt; Bấm nút <strong>Sao chép (📋)</strong> để lấy mã thật (không bôi đen copy dấu chấm tròn).
                    </div>
                  </div>

                  <details style={{ marginTop: 8, fontSize: 13 }}>
                    <summary style={{ cursor: 'pointer', color: 'var(--muted, #888)' }}>⚙️ Tùy chọn nâng cao (Endpoint & Domain)</summary>
                    <div style={{ padding: '8px 0' }}>
                      <div className="form-group" style={{ marginBottom: 8 }}>
                        <label htmlFor="custom_endpoint" style={{ fontSize: 12 }}>API Endpoint:</label>
                        <input id="custom_endpoint" type="text" placeholder="https://omnivi.ai/api/v2" value={apiConfig.customEndpoint || 'https://omnivi.ai/api/v2'} onChange={(event) => setApiConfigState({ ...apiConfig, customEndpoint: event.target.value.trim() })} />
                      </div>
                      <div className="form-group">
                        <label htmlFor="domain" style={{ fontSize: 12 }}>Domain:</label>
                        <input id="domain" type="text" placeholder="omnivi.ai" value={apiConfig.domain || 'omnivi.ai'} onChange={(event) => setApiConfigState({ ...apiConfig, domain: event.target.value.trim() })} />
                      </div>
                    </div>
                  </details>
                </div>
              )}

              <div className="modal-actions">

                <button type="button" className="btn-cancel" onClick={() => setShowConfigModal(false)}>Hủy</button>
                <button type="button" className="btn-submit" onClick={handleLoginWithApi} disabled={loginInProgress}>
                  {loginInProgress ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
                <button type="submit" className="btn-secondary" style={{ marginLeft: 8 }}>Lưu cấu hình</button>
              </div>
              {loginError && <div className="error-banner" style={{ marginTop: 10 }}>{loginError}</div>}
              {loginSuccess && <div className="save-toast success">✓ Đăng nhập thành công!</div>}
              {saveSuccess && <div className="save-toast success">✓ Cấu hình đã được lưu!</div>}
              {loginDebug && (
                <div style={{ marginTop: 12 }}>
                  <details>
                    <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Chi tiết debug</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8, marginTop: 8, color: '#fff', maxHeight: 240, overflow: 'auto' }}>{JSON.stringify(loginDebug, null, 2)}</pre>
                  </details>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {showThanksModal && (
        <div className="modal-backdrop" onClick={() => setShowThanksModal(false)}>
          <div className="config-modal-card thanks-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
            <div className="modal-header">
              <h3>💛 Tác giả</h3>
              <button className="close-btn" onClick={() => setShowThanksModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 800, color: '#fff' }}>
                  AI DIP Studio <span className="version-pill" style={{ verticalAlign: 'middle' }}>v{CURRENT_VERSION}</span>
                </h4>
                <p style={{ margin: '4px 0', fontSize: 14, color: 'var(--text, #eee)' }}>
                  Cần góp ý bạn liên hệ Facebook mình
                </p>
                <p style={{ margin: '8px 0 16px', fontSize: 13, color: 'var(--muted, #aaa)', lineHeight: 1.55 }}>
                  Hỗ trợ cài đặt Capture One • MagiMir - Haicaoyun • VPN • Google Drive • Capcut pro • Cân màu màn hình.
                </p>
              </div>

              <div style={{ background: '#ffffff', borderRadius: 12, padding: '12px 16px', marginBottom: 18, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', textAlign: 'center' }}>
                <img
                  src={donateQrImage}
                  alt="QR Gửi cà phê"
                  style={{ width: 190, height: 190, objectFit: 'contain', display: 'block', borderRadius: 6, margin: '0 auto' }}
                />
                <div style={{ color: '#111827', fontWeight: 700, fontSize: 13, marginTop: 8 }}>
                  ☕ Gửi cà phê ủng hộ tác giả
                </div>
              </div>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'center', gap: 10, width: '100%', marginTop: 0 }}>
                <a
                  className="btn-submit"
                  href="https://www.facebook.com/diepfoto"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShowThanksModal(false)}
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  💬 Liên hệ Facebook
                </a>
                <button type="button" className="btn-secondary" onClick={() => setShowThanksModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <UpdateModal
          updateInfo={updateInfo}
          checking={checkingUpdate}
          onCheckAgain={() => handleCheckUpdate(true)}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  );
}


ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
export default App;