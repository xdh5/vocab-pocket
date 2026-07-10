const http = require("node:http");
const https = require("node:https");

class LocalApiClient {
  constructor({ apiBaseUrl }) {
    this.apiBaseUrl = String(apiBaseUrl || "http://127.0.0.1:8000").replace(/\/$/, "");
    this.authToken = "";
  }

  setAuthToken(token) {
    this.authToken = String(token || "");
  }

  request(method, route, body, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const target = new URL(route, this.apiBaseUrl);
      const transport = target.protocol === "https:" ? https : http;
      const request = transport.request(
        {
          hostname: target.hostname,
          port: target.port || (target.protocol === "https:" ? 443 : 80),
          path: `${target.pathname}${target.search}`,
          method,
          headers: {
            ...(payload
              ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
              : {}),
            ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
          },
        },
        (response) => {
          let data = "";
          response.on("data", (chunk) => {
            data += chunk;
          });
          response.on("end", () => {
            let parsed = null;
            try {
              parsed = data ? JSON.parse(data) : null;
            } catch {
              parsed = data;
            }
            resolve({ status: response.statusCode, data: parsed });
          });
        },
      );
      request.on("error", reject);
      request.setTimeout(timeoutMs, () => request.destroy(new Error("API request timed out")));
      if (payload) request.write(payload);
      request.end();
    });
  }

  start() {
    // 生产版桌面端只作为网页套壳和 Windows 取词能力，不再启动本地 Python 后端。
  }

  async waitUntilReady(attempts = 30) {
    while (attempts > 0) {
      try {
        const result = await this.request("GET", "/health", null, 3000);
        if (result.status === 200) return true;
      } catch {}
      attempts -= 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
  }

  stop() {}
}

module.exports = { LocalApiClient };
