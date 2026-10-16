class AutoAI {
  constructor(domain, accessToken, options = {}) {
    if (!domain || !accessToken) throw new Error('Domain and Access Token are required.');
    this.domain = domain;
    this.accessToken = accessToken;
    this.baseUrl = options.baseUrl || ''; // optional base URL
    this.useBearerAuth = !!options.useBearerAuth;
    this.useApiKeyHeader = !!options.useApiKeyHeader;
    this.apiKeyHeaderName = options.apiKeyHeaderName || 'x-api-key';
  }

  setUseBearerAuth(flag) { this.useBearerAuth = !!flag; }
  setUseApiKeyHeader(flag) { this.useApiKeyHeader = !!flag; }
  setEndpoint(baseUrl) { this.baseUrl = baseUrl || ''; }

  _fileToBase64(file, includePrefix = false) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => includePrefix ? resolve(reader.result) : resolve(reader.result.split(',')[1]);
      reader.onerror = (e) => reject(e);
    });
  }

  async _request(endpoint, params = {}) {
    const body = new URLSearchParams();
    // append params (File -> base64, objects -> JSON)
    for (const key of Object.keys(params || {})) {
      const v = params[key];
      if (v == null || v === '') continue;
      let value = v;
      if (value instanceof File) value = await this._fileToBase64(value, key === 'base64Image');
      else if (typeof value === 'object') value = JSON.stringify(value);
      body.append(key, value);
    }

    // always include domain
    body.append('domain', this.domain);

    // headers: decide auth placement
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (this.useBearerAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    } else if (this.useApiKeyHeader) {
      headers[this.apiKeyHeaderName] = this.accessToken;
    } else {
      body.append('access_token', this.accessToken);
    }

    // resolve full URL
    const url = /^https?:\/\//i.test(endpoint)
      ? endpoint
      : (this.baseUrl ? (this.baseUrl.replace(/\/$/, '') + endpoint) : endpoint);

    try {
      const resp = await fetch(url, { method: 'POST', headers, body: body.toString() });
      const text = await resp.text();
      let data;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
      if (!resp.ok) throw data || new Error(`HTTP ${resp.status}`);
      return data;
    } catch (err) {
      console.error(`[AutoAI] Request error ${endpoint}:`, err);
      throw err;
    }
  }

  // Example methods (use this.baseUrl if needed)
  async createImage(params) {
    const endpoint = (this.baseUrl || 'https://api.gommo.net') + '/ai/generateImage';
    return this._request(endpoint, params);
  }

  async accountInfo(params) {
    const endpoint = (this.baseUrl || 'https://api.gommo.net') + '/api/apps/go-mmo/ai/me';
    return this._request(endpoint, params);
  }

  async checkImageStatus(params) {
    const endpoint = (this.baseUrl || 'https://api.gommo.net') + '/ai/image';
    return this._request(endpoint, params);
  }

  async uploadImage(params) {
    const endpoint = (this.baseUrl || 'https://api.gommo.net') + '/ai/image-upload';
    return this._request(endpoint, params);
  }

  // Additional helpers (optional methods from original class)
  async listModels(params) {
    const endpoint = (this.baseUrl || 'https://api.gommo.net') + '/ai/models';
    return this._request(endpoint, params);
  }

  async createVideo(params) {
    const endpoint = (this.baseUrl || 'https://api.gommo.net') + '/ai/create-video';
    return this._request(endpoint, params);
  }

  async checkVideoStatus(params) {
    const endpoint = (this.baseUrl || 'https://api.gommo.net') + '/ai/video';
    return this._request(endpoint, params);
  }

  async listVideos(params) {
    const endpoint = (this.baseUrl || 'https://api.gommo.net') + '/ai/videos';
    return this._request(endpoint, params);
  }

  // export other methods as needed in similar fashion
}

export default AutoAI;
