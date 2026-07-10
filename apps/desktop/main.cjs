const { app, dialog, ipcMain, Menu, nativeImage, Tray } = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("node:path");

const { DictionaryService } = require("./src/dictionary.cjs");
const { HoverController } = require("./src/hover-controller.cjs");
const { LocalApiClient } = require("./src/local-api.cjs");
const { SettingsStore } = require("./src/settings-store.cjs");
const { WindowManager } = require("./src/window-manager.cjs");

const isDevelopment = !app.isPackaged;
const productionUrl = process.env.VOCABOOM_WEB_URL || "https://vocaboom.cyberlab.bond";
const apiBaseUrl = isDevelopment
  ? process.env.VOCABOOM_API_URL || "http://127.0.0.1:8000"
  : process.env.VOCABOOM_API_URL || productionUrl;

let isQuitting = false;
let tray = null;
let localApi = null;
let hoverController = null;
let windowManager = null;
let settingsStore = null;
let dictionary = null;

function updateTrayMenu() {
  if (!tray || !hoverController) return;
  const enabled = hoverController.isEnabled();
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "开启鼠标选词",
        type: "checkbox",
        checked: enabled,
        click: (item) => hoverController.setEnabled(item.checked),
      },
      { type: "separator" },
      { label: "打开单词本", click: () => windowManager.showMainWindow() },
      {
        label: "检查更新",
        enabled: !isDevelopment,
        click: () => autoUpdater.checkForUpdatesAndNotify(),
      },
      { type: "separator" },
      {
        label: "退出",
        click: () => {
          isQuitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.setToolTip(enabled ? "Vocaboom · 选词已开启" : "Vocaboom");
}

function createTray() {
  const trayIconPath = path.join(__dirname, "assets", "tray-icon.png");
  const icon = nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.on("click", () => windowManager.showMainWindow());
  tray.on("double-click", () => windowManager.showMainWindow());
  updateTrayMenu();
}

function registerAutoUpdater() {
  if (isDevelopment) return;

  autoUpdater.autoDownload = true;
  autoUpdater.on("update-downloaded", () => {
    const choice = dialog.showMessageBoxSync({
      type: "info",
      title: "Vocaboom 更新已下载",
      message: "新版已经准备好，要现在重启并安装吗？",
      buttons: ["现在安装", "稍后"],
      defaultId: 0,
      cancelId: 1,
    });
    if (choice === 0) {
      isQuitting = true;
      autoUpdater.quitAndInstall();
    }
  });
  autoUpdater.on("error", (error) => {
    console.error("Auto updater failed", error);
  });
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 5000);
}

function registerIpcHandlers() {
  ipcMain.handle("auth:set-token", (_, token) => {
    const value = String(token || "");
    localApi.setAuthToken(value);
    settingsStore.set("authToken", value);
    return true;
  });
  ipcMain.handle("hover:add-word", async (_, word, mode, wordInfo = {}) => {
    const result = await localApi.request(
      "POST",
      "/api/words",
      {
        term: String(word || "").trim(),
        headword: String(wordInfo.headword || word || "").trim(),
        form_type: String(wordInfo.formType || "原形"),
        common_forms: Array.isArray(wordInfo.commonForms) ? wordInfo.commonForms : [],
        note: "通过鼠标选词添加",
        mode: mode === "listening_speaking" ? "listening_speaking" : "reading",
      },
      10_000,
    );
    if (result.status !== 201) return { ok: false };
    windowManager.notifyWordsChanged();
    return {
      ok: true,
      count: result.data?.add_count || 1,
      headword: result.data?.term || String(word || "").trim(),
    };
  });
  ipcMain.handle("dictionary:lookup", (_, word) => dictionary.lookup(String(word || "").trim()));
  ipcMain.on("hover:dismiss", () => hoverController.dismiss());
}

app.whenReady().then(async () => {
  app.setAppUserModelId("com.vocaboom.desktop");
  settingsStore = new SettingsStore(path.join(app.getPath("userData"), "settings.json"));
  localApi = new LocalApiClient({ apiBaseUrl });
  localApi.setAuthToken(settingsStore.get("authToken", ""));
  localApi.start();
  await localApi.waitUntilReady();

  windowManager = new WindowManager({
    isDevelopment,
    desktopDirectory: __dirname,
    shouldQuit: () => isQuitting,
    productionUrl,
  });
  windowManager.createWindows();
  dictionary = new DictionaryService();

  hoverController = new HoverController({
    apiClient: localApi,
    dictionary,
    windowManager,
    onStateChanged: updateTrayMenu,
    onPreferenceChanged: (enabled) => settingsStore.set("hoverEnabled", enabled),
  });

  createTray();
  registerIpcHandlers();
  registerAutoUpdater();
  hoverController.setEnabled(settingsStore.get("hoverEnabled", true), { persist: false });
  app.on("activate", () => windowManager.showMainWindow());
});

app.on("before-quit", () => {
  isQuitting = true;
  hoverController?.stop();
  localApi?.stop();
});
