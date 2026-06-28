const fs = require("node:fs");
const path = require("node:path");

class SettingsStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.values = this.#read();
  }

  #read() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
    } catch {
      return {};
    }
  }

  #write() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.values, null, 2), "utf8");
  }

  get(key, fallback) {
    return this.values[key] ?? fallback;
  }

  set(key, value) {
    this.values[key] = value;
    try {
      this.#write();
    } catch (error) {
      console.error("Could not save desktop settings", error);
    }
  }
}

module.exports = { SettingsStore };
