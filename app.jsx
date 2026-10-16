import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { gommoApi, getApiConfig, saveApiConfig, toItems } from './lib/api.js';
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
    if (!cfg.mode || (cfg.mode === 'custom' && !cfg.geminiKey)) {
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

  const fetchAccount = async () => {
    setLoadingAccount(true);
    setAccountError('');
    let lastError = null;
    const attempts = [
      { endpoint: '/api/apps/go-mmo/ai/me', method: 'POST' },
      { endpoint: '/api/apps/go-mmo/ai/me', method: 'GET' }
    ];

    const debugEntries = [];
    try {
      for (const attempt of attempts) {
        try {
          const res = await gommoApi(attempt.endpoint, { method: attempt.method, body: {} });
          let payload = unwrapAccountPayload(res);
          const hasData = payload && typeof payload === 'object' && Object.keys(payload).length > 0;
          if (!hasData) {
            const candidate = extractAccountCandidate(res);
            if (candidate) {
              payload = candidate;
            }
          }
          const finalHasData = payload && typeof payload === 'object' && Object.keys(payload).length > 0;
          debugEntries.push({ endpoint: attempt.endpoint, method: attempt.method, success: finalHasData, payload, raw: res });
          if (finalHasData) {
            setAccountInfo(payload);
            setAccountDebug(debugEntries);
            const nextCredits = extractCredits(res);
            if (nextCredits !== null) setCredits(Math.max(0, nextCredits));
            const sub = payload?.currentSubscription || payload?.subscription || payload?.plan || null;
            const status = String(sub?.status || sub?.state || '').toLowerCase();
            if (status.includes('unavailable') || status.includes('expired') || status.includes('inactive') || status.includes('disabled')) {
              setAccountError('Hiện gói dịch vụ không khả dụng tại thời điểm này. Vui lòng kiểm tra gói hoặc đổi tài khoản.');
            }
            return payload;
          }
          lastError = new Error(`Không có dữ liệu tài khoản từ ${attempt.endpoint} (${attempt.method})`);
        } catch (err) {
          console.warn('Account endpoint failed:', attempt.endpoint, attempt.method, err);
          debugEntries.push({ endpoint: attempt.endpoint, method: attempt.method, success: false, error: String(err.message || err) });
          lastError = err;
        }
      }

      setAccountInfo(null);
      setAccountDebug(debugEntries);
      setAccountError(lastError?.message || 'Không đọc được thông tin tài khoản.');
      return null;
    } finally {
      setLoadingAccount(false);
    }
  };

  const fetchCredits = async () => {
    setLoadingCredits(true);
    setCreditsError('');

    // Chế độ RunningHub/OpenAI-compatible: số dư tùy theo nhà cung cấp,
    // không có khái niệm "Credits" của hệ thống Gommo.
    if (apiConfig.mode === 'openai') {
      try {
        const usdBalance = await fetchOpenAiBalance(apiConfig);
        setCredits(Math.max(0, usdBalance));
        setCreditsError('');
        setLoadingCredits(false);
        return usdBalance;
      } catch (err) {
        console.warn('Lỗi tải số dư OpenAI-compatible:', err);
        setCredits(0);
        setCreditsError(`Chưa đọc được số dư USD từ ${apiConfig.openaiBaseUrl || 'nhà cung cấp'}. ${err?.message || ''} Vui lòng kiểm tra số dư trực tiếp trên trang quản lý của nhà cung cấp.`);
        setLoadingCredits(false);
        return 0;
      }
    }

    const attempts = [
      { endpoint: '/api/apps/go-mmo/ai/me', method: 'POST', body: {} },
      { endpoint: '/api/apps/go-mmo/ai/me', method: 'GET', body: {} }
    ];
    let lastError = null;

    for (const attempt of attempts) {
      try {
        const res = await gommoApi(attempt.endpoint, {
          method: attempt.method,
          body: attempt.body || {}
        });
        console.info('Credits API response:', attempt.endpoint, attempt.method, res);
        const nextCredits = extractCredits(res);
        if (nextCredits !== null) {
          setCredits(Math.max(0, nextCredits));
          setCreditsError('');
          setLoadingCredits(false);
          return nextCredits;
        }
        lastError = new Error(`API ${attempt.endpoint} (${attempt.method}) không trả về balancesInfo.credits_ai hoặc field số dư hợp lệ`);
      } catch (err) {
        lastError = err;
      }
    }

    console.error('Lỗi tải credits:', lastError);
    setCredits(0);
    setCreditsError('Chưa đọc được số dư từ API ví. App đã thử /api/apps/go-mmo/ai/me bằng POST/GET nhưng response chưa có balancesInfo.credits_ai.');
    setLoadingCredits(false);
    return 0;
  };


  useEffect(() => {
    async function fetchModels() {
      setLoadingModels(true);
      setModelError('');

      // Chế độ RunningHub/OpenAI-compatible: lấy model của chính nhà cung cấp đó,
      // không qua hệ thống Gommo.
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

      const candidateEndpoints = [
        '/ai/models',
        '/api/apps/go-mmo/ai/models',
        '/api/apps/go-mmo/models',
        '/api/apps/go-mmo/ai/model-list',
        '/api/apps/go-mmo/ai/model',
        '/ai/model/list',
        '/api/v1/models'
      ];
      let lastError = null;
      let loadedModels = [];

      for (const endpoint of candidateEndpoints) {
        for (const method of ['POST', 'GET']) {
          try {
            const res = await gommoApi(endpoint, { method, body: { type: 'image' } });
            if (res?.success === false && res?.message) throw new Error(res.message);
            const candidate = sanitizeImageModelList(toItems(res));
            if (candidate.length) {
              loadedModels = candidate;
              break;
            }
            lastError = new Error(`Endpoint ${endpoint} ${method} returned no valid models`);
          } catch (err) {
            console.warn('Model endpoint failed:', endpoint, method, err);
            lastError = err;
          }
        }
        if (loadedModels.length) break;
      }

      if (loadedModels.length) {
        setModels(loadedModels);
      } else {
        setModels([]);
        setModelError(lastError?.message || 'Không tải được danh sách model AI.');
      }

      setLoadingModels(false);
    }
    fetchModels();
    fetchCredits();
    fetchAccount();
  }, [apiConfig.mode, apiConfig.accessToken, apiConfig.customEndpoint, apiConfig.domain, apiConfig.openaiBaseUrl, apiConfig.openaiApiKey]);


  useEffect(() => {
    const refreshWhenVisible = () => {
      if (!document.hidden) {
        fetchCredits();
        fetchAccount();
      }
    };
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, []);

  // Cứ mỗi 30 phút sử dụng app hiện popup cảm ơn + nhắc liên hệ hỗ trợ 1 lần.
  // Mẹo test nhanh: mở app với URL có thêm ?test_thanks=1 (ví dụ index.html?test_thanks=1)
  // để popup hiện ngay lập tức, không cần chờ đủ 30 phút.
  useEffect(() => {
    const THANKS_INTERVAL_MS = 30 * 60 * 1000;
    const isTestMode = new URLSearchParams(window.location.search).get('test_thanks') === '1';
    if (isTestMode) {
      setShowThanksModal(true);
    }
    const timer = window.setInterval(() => {
      setShowThanksModal(true);
    }, THANKS_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);



  const openConfigModal = () => {
    setApiConfigState(getApiConfig());
    setShowConfigModal(true);
  };

  const PRICING_URL = 'https://aivideoauto.com/prices';

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
        window.open('https://aivideoauto.com/login', '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      console.warn('Login bridge chưa hỗ trợ hoặc lỗi khi đăng nhập:', err);
      window.open('https://aivideoauto.com/login', '_blank', 'noopener,noreferrer');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleSaveConfig = (event) => {
    event.preventDefault();
    saveApiConfig(apiConfig);
    setSaveSuccess(true);
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
      // Với chế độ Gemini Key cá nhân, gọi thử API thật (validateGeminiKey) trước khi báo
      // thành công — trước đây nút này chỉ lưu localStorage rồi báo "thành công" ngay,
      // nên key sai/hết hạn chỉ phát hiện được lúc tạo ảnh, gây khó hiểu cho người dùng.
      if (apiConfig.mode === 'custom') {
        await validateGeminiKey(apiConfig);
      } else if (apiConfig.mode === 'openai') {
        try {
          await validateOpenAiKey(apiConfig);
        } catch (err) {
          const msg = String(err?.message || '');
          // Lỗi dạng "503 no available channels", hết quota/số dư là do TÀI KHOẢN
          // (billing/hết tiền), không phải do API Key sai. Trường hợp này vẫn cho
          // đăng nhập/lưu cấu hình để app dùng được các phần khác (lấy danh sách model...),
          // chỉ riêng lúc tạo ảnh thật mới báo lỗi hết tiền.
          const isBillingIssue = /503|no available channel|insufficient|quota|billing|pay-as-you-go|pay-per-request/i.test(msg);
          if (!isBillingIssue) throw err;
          console.warn('[handleLoginWithApi] Bỏ qua lỗi billing/quota để vẫn lưu cấu hình:', msg);
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
          <PhotoRestorer models={apiModels} loadingModels={loadingModels} modelError={modelError} />
        </section>
        <section style={{ display: activeTab === 'layout' ? 'block' : 'none' }} aria-hidden={activeTab !== 'layout'}>
          <ProfessionalLayout incomingPhoto={layoutSeed} />
        </section>
        <section style={{ display: activeTab === 'history' ? 'block' : 'none' }} aria-hidden={activeTab !== 'history'}>
          <HistoryGallery onSendToLayout={sendPhotoToLayout} />
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
            <p>Hỗ trợ cài đặt Capture One • Haicaoyun • VPN • Google Drive • Cân màu màn hình.</p>
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
                <strong>{loadingCredits ? 'Đang cập nhật...' : apiConfig.mode === 'openai' ? `$${credits.toFixed(2)}` : `${credits.toLocaleString('vi-VN')} Credits`}</strong>
                <button className="btn-secondary" onClick={fetchCredits} disabled={loadingCredits}>

                  {loadingCredits ? 'Đang tải...' : '↻ Cập nhật số dư'}
                </button>
                {creditsError && <p className="hint-text" style={{ width: '100%', marginTop: '8px' }}>⚠ {creditsError}</p>}
              </div>

              <div className="payment-box">
                <h4>⚡ Nạp Credits trên trang chủ</h4>
                <p>Bấm nút bên dưới để mở trang bảng giá/nạp Credits chính thức của AI VIDEO AUTO.</p>
                <div className="pricing-card">
                  <span>Trang nạp chính thức</span>
                  <strong>aivideoauto.com/prices</strong>
                </div>
                <div className="payment-actions">
                  <button type="button" className="btn-submit" onClick={openPricingPage}>🚀 Mở trang nạp Credits</button>
                  <a className="btn-secondary" href="https://aivideoauto.com/prices" target="_blank" rel="noreferrer">Mở tab mới</a>
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
              <p className="modal-desc">Kết nối chính dùng AI VIDEO AUTO. RunningHub chỉ là phương án API dự phòng khi cần.</p>

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
                      <strong>API hệ thống AI VIDEO AUTO (Khuyên dùng - Mặc định)</strong>
                      <div style={{ fontSize: 12, color: 'var(--muted, #bbb)' }}>Kết nối chính qua https://aivideoauto.com / https://api.gommo.net.</div>
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
                      <strong>Gemini Key trực tiếp</strong>
                      <div style={{ fontSize: 12, color: 'var(--muted, #bbb)' }}>Dùng khi bạn gọi API Gemini Google trực tiếp.</div>
                    </div>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio"
                      name="api_mode"
                      value="openai"
                      checked={apiConfig.mode === 'openai'}
                      onChange={() => setApiConfigState({ ...apiConfig, mode: 'openai' })}
                    />
                    <div>
                      <strong>API dự phòng RunningHub / OpenAI-compatible</strong>
                      <div style={{ fontSize: 12, color: 'var(--muted, #bbb)' }}>Chỉ dùng như phương án dự phòng nếu API chính AI VIDEO AUTO không dùng được.</div>
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
                    <label htmlFor="custom_endpoint">API Endpoint:</label>
                    <input id="custom_endpoint" type="text" placeholder="https://api.gommo.net" value={apiConfig.customEndpoint || ''} onChange={(event) => setApiConfigState({ ...apiConfig, customEndpoint: event.target.value.trim() })} required />
                    <div style={{ fontSize: 12, color: 'var(--muted, #bbb)', marginTop: 6 }}>Endpoint chính khuyến nghị: <code>https://api.gommo.net</code>. App sẽ gọi /ai/generateImage hoặc /models qua host này.</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="access_token">Access Token:</label>
                    <input id="access_token" type="password" placeholder="Access Token" value={apiConfig.accessToken || ''} onChange={(event) => setApiConfigState({ ...apiConfig, accessToken: event.target.value })} />
                    <div style={{ fontSize: 12, color: 'var(--muted, #bbb)', marginTop: 6 }}>Nhập Access Token đã tạo từ trang aivideoauto.com/settings/tokens.</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="domain">Domain kết nối (Mặc định: aivideoauto.com):</label>
                    <input id="domain" type="text" placeholder="aivideoauto.com" value={apiConfig.domain || ''} onChange={(event) => setApiConfigState({ ...apiConfig, domain: event.target.value.trim() })} />
                    <div style={{ fontSize: 12, color: 'var(--muted, #bbb)', marginTop: 6 }}>
                      Tên miền đăng ký tài khoản (mặc định: <code>aivideoauto.com</code>). <strong>Lưu ý:</strong> Không thêm <code>https://</code> hoặc dấu <code>/</code> ở cuối.
                    </div>
                  </div>
                </div>
              )}

              {apiConfig.mode === 'openai' && (
                <div className="custom-fields">
                  <div className="form-group">
                    <label htmlFor="openai_base_url">API Base URL dự phòng:</label>
                    <input id="openai_base_url" type="text" placeholder="https://www.runninghub.ai" value={apiConfig.openaiBaseUrl || ''} onChange={(event) => setApiConfigState({ ...apiConfig, openaiBaseUrl: event.target.value.trim() })} required />
                    <div style={{ fontSize: 12, color: 'var(--muted, #bbb)', marginTop: 6 }}>Chỉ dùng khi cần phương án dự phòng. Với RunningHub, nhập <code>https://www.runninghub.ai</code>.</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="openai_api_key">API Key / Token:</label>
                    <input id="openai_api_key" type="password" placeholder="sk-..." value={apiConfig.openaiApiKey || ''} onChange={(event) => setApiConfigState({ ...apiConfig, openaiApiKey: event.target.value })} required />
                    <div style={{ fontSize: 12, color: 'var(--muted, #bbb)', marginTop: 6 }}>API Key/Token lấy từ trang quản lý API/OpenAPI của RunningHub hoặc nhà cung cấp bạn dùng.</div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="openai_model">Model:</label>
                    <input id="openai_model" type="text" placeholder="nano-banana-pro-official/edit" value={apiConfig.openaiModel || ''} onChange={(event) => setApiConfigState({ ...apiConfig, openaiModel: event.target.value.trim() })} />
                    <div style={{ fontSize: 12, color: 'var(--muted, #bbb)', marginTop: 6 }}>
                      Với RunningHub, có thể dùng <code>nano-banana-pro-official/edit</code> hoặc bấm tải danh sách model nếu đã nhập API Key.
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="runninghub_mode">Chế độ RunningHub:</label>
                    <select id="runninghub_mode" value={apiConfig.runningHubMode || 'standard'} onChange={(event) => setApiConfigState({ ...apiConfig, runningHubMode: event.target.value })}>
                      <option value="standard">Standard API</option>
                      <option value="ai-app">AI App / ComfyUI workflow</option>
                    </select>
                    <div style={{ fontSize: 12, color: 'var(--muted, #bbb)', marginTop: 6 }}>
                      Nếu bạn dùng link App/Workflow của RunningHub, chọn AI App và nhập WebApp ID + node mapping bên dưới.
                    </div>
                  </div>
                  {(apiConfig.runningHubMode === 'ai-app' || apiConfig.runningHubWebappId) && (
                    <>
                      <div className="form-group">
                        <label htmlFor="runninghub_webapp_id">RunningHub WebApp ID:</label>
                        <input id="runninghub_webapp_id" type="text" placeholder="Ví dụ: 1948511948107689986" value={apiConfig.runningHubWebappId || ''} onChange={(event) => setApiConfigState({ ...apiConfig, runningHubWebappId: event.target.value.trim(), runningHubMode: 'ai-app' })} />
                      </div>
                      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group">
                          <label htmlFor="runninghub_prompt_node_id">Prompt nodeId:</label>
                          <input id="runninghub_prompt_node_id" type="text" placeholder="3" value={apiConfig.runningHubPromptNodeId || ''} onChange={(event) => setApiConfigState({ ...apiConfig, runningHubPromptNodeId: event.target.value.trim() })} />
                        </div>
                        <div className="form-group">
                          <label htmlFor="runninghub_prompt_field">Prompt fieldName:</label>
                          <input id="runninghub_prompt_field" type="text" placeholder="text" value={apiConfig.runningHubPromptField || ''} onChange={(event) => setApiConfigState({ ...apiConfig, runningHubPromptField: event.target.value.trim() })} />
                        </div>
                        <div className="form-group">
                          <label htmlFor="runninghub_image_node_id">Image nodeId:</label>
                          <input id="runninghub_image_node_id" type="text" placeholder="Bỏ trống nếu workflow không cần ảnh" value={apiConfig.runningHubImageNodeId || ''} onChange={(event) => setApiConfigState({ ...apiConfig, runningHubImageNodeId: event.target.value.trim() })} />
                        </div>
                        <div className="form-group">
                          <label htmlFor="runninghub_image_field">Image fieldName:</label>
                          <input id="runninghub_image_field" type="text" placeholder="image" value={apiConfig.runningHubImageField || ''} onChange={(event) => setApiConfigState({ ...apiConfig, runningHubImageField: event.target.value.trim() })} />
                        </div>
                        <div className="form-group">
                          <label htmlFor="runninghub_ratio_node_id">Ratio nodeId:</label>
                          <input id="runninghub_ratio_node_id" type="text" placeholder="28" value={apiConfig.runningHubRatioNodeId || ''} onChange={(event) => setApiConfigState({ ...apiConfig, runningHubRatioNodeId: event.target.value.trim() })} />
                        </div>
                        <div className="form-group">
                          <label htmlFor="runninghub_ratio_field">Ratio fieldName:</label>
                          <input id="runninghub_ratio_field" type="text" placeholder="select" value={apiConfig.runningHubRatioField || ''} onChange={(event) => setApiConfigState({ ...apiConfig, runningHubRatioField: event.target.value.trim() })} />
                        </div>
                      </div>
                    </>
                  )}
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
          <div className="config-modal-card thanks-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>💛 Cảm ơn bạn</h3>
              <button className="close-btn" onClick={() => setShowThanksModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Cảm ơn bạn đã sử dụng app.</p>
              <p>Cần hỗ trợ, góp ý hoặc hỗ trợ cài đặt phần mềm Capture One | Haicaoyun | VPN | Google Drive | Cân màu màn hình, liên hệ mình.</p>
              <div className="modal-actions">
                <a
                  className="btn-submit"
                  href="https://www.facebook.com/diepfoto"
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setShowThanksModal(false)}
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


ReactDOM.createRoot(document.getElementById('root')).render(<App />);
export default App;