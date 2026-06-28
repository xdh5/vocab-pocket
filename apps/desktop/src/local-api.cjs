const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

class LocalApiClient {
  constructor({ isDevelopment, resourcesPath, dataDirectory }) {
    this.isDevelopment = isDevelopment;
    this.resourcesPath = resourcesPath;
    this.dataDirectory = dataDirectory;
    this.process = null;
    this.authToken = "";
  }

  setAuthToken(token) {
    this.authToken = String(token || "");
  }

  request(method, route, body, timeoutMs = 1500) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const request = http.request(
        {
          hostname: "127.0.0.1",
          port: 8000,
          path: route,
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
      request.setTimeout(timeoutMs, () => request.destroy(new Error("Local API timed out")));
      if (payload) request.write(payload);
      request.end();
    });
  }

  start() {
    if (this.isDevelopment) return;
    const executable = path.join(this.resourcesPath, "api", "vocabulary-api.exe");
    this.process = spawn(executable, [], {
      windowsHide: true,
      env: { ...process.env, VOCABULARY_DATA_DIR: this.dataDirectory },
    });
    this.process.on("error", (error) => console.error("Could not start local API", error));
  }

  async waitUntilReady(attempts = 30) {
    while (attempts > 0) {
      try {
        const result = await this.request("GET", "/health");
        if (result.status === 200) return true;
      } catch {}
      attempts -= 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
  }

  stop() {
    if (this.process && !this.process.killed) this.process.kill();
  }
}

module.exports = { LocalApiClient };
