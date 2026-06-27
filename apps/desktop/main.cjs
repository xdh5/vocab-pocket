const { app, BrowserWindow, ipcMain, Menu, nativeImage, screen, shell, Tray } = require("electron");
const { spawn } = require("child_process");
const { searchWord } = require("ecdict");
const fs = require("fs");
const http = require("http");
const path = require("path");

const isDevelopment = !app.isPackaged;
const appIconPath = path.join(__dirname, "assets", "app-icon.png");
const trayIconPath = path.join(__dirname, "assets", "tray-icon.png");
let apiProcess = null;
let mainWindow = null;
let hoverWindow = null;
let tray = null;
let isQuitting = false;
let hoverEnabled = false;
let hoverTimer = null;
let hoverRequestRunning = false;
let hoverShowing = false;
let lastCandidate = "";
let stableCandidateCount = 0;

function hoverSettingsPath() {
  return path.join(app.getPath("userData"), "settings.json");
}

function loadHoverPreference() {
  try {
    const settings = JSON.parse(fs.readFileSync(hoverSettingsPath(), "utf8"));
    return settings.hoverEnabled !== false;
  } catch {
    return true;
  }
}

function saveHoverPreference() {
  try {
    const file = hoverSettingsPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ hoverEnabled }, null, 2), "utf8");
  } catch (error) {
    console.error("[settings] could not save hover preference", error);
  }
}

const POS_LABELS = {
  n: "n", v: "v", vi: "vi", vt: "vt", a: "adj", adj: "adj",
  ad: "adv", adv: "adv", prep: "prep", pron: "pron", conj: "conj", num: "num",
  art: "art", int: "int", aux: "aux"
};

function lookupDictionary(word) {
  try {
    const entry = searchWord(word, { caseInsensitive: true, withRoot: true });
    if (!entry?.translation) return { phonetic: "", meanings: [] };
    const meanings = [];
    for (const line of entry.translation.split("\\n")) {
      const match = line.trim().match(/^([a-z]+)\.\s*(.+)$/i);
      if (!match) continue;
      const pos = POS_LABELS[match[1].toLowerCase()] || match[1].toLowerCase();
      const text = match[2].split(/[,，;/]/).map((part) => part.trim()).filter(Boolean).slice(0, 3).join("，");
      if (text && !meanings.some((item) => item.pos === pos && item.text === text)) meanings.push({ pos, text });
      if (meanings.length >= 3) break;
    }
    return { phonetic: entry.phonetic || "", meanings };
  } catch (error) {
    console.error("[dictionary] lookup failed", error);
    return { phonetic: "", meanings: [] };
  }
}

function apiRequest(method, route, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const request = http.request({
      hostname: "127.0.0.1",
      port: 8000,
      path: route,
      method,
      headers: payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}
    }, (response) => {
      let data = "";
      response.on("data", (chunk) => { data += chunk; });
      response.on("end", () => {
        let parsed = null;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ status: response.statusCode, data: parsed });
      });
    });
    request.on("error", reject);
    request.setTimeout(1500, () => request.destroy(new Error("Local API timed out")));
    if (payload) request.write(payload);
    request.end();
  });
}

function startPackagedApi() {
  if (isDevelopment) return;
  const executable = path.join(process.resourcesPath, "api", "vocabulary-api.exe");
  apiProcess = spawn(executable, [], {
    windowsHide: true,
    env: { ...process.env, VOCABULARY_DATA_DIR: path.join(app.getPath("userData"), "data") }
  });
  apiProcess.on("error", (error) => console.error("Could not start local API", error));
}

async function waitForApi(attempts = 30) {
  while (attempts > 0) {
    try {
      const result = await apiRequest("GET", "/health");
      if (result.status === 200) return true;
    } catch {}
    attempts -= 1;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return false;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 720,
    minWidth: 760,
    minHeight: 560,
    backgroundColor: "#f6f2e9",
    icon: appIconPath,
    title: "My Vocabulary",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDevelopment) mainWindow.loadURL("http://localhost:5173");
  else mainWindow.loadFile(path.join(__dirname, "../web/dist/index.html"));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createHoverWindow() {
  hoverWindow = new BrowserWindow({
    width: 310,
    height: 152,
    show: false,
    frame: false,
    resizable: false,
    transparent: false,
    backgroundColor: "#fffdf7",
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  hoverWindow.setAlwaysOnTop(true, "pop-up-menu");
}

function showHoverWord(word, addCount, point) {
  if (hoverShowing) return;
  hoverShowing = true;
  const display = screen.getDisplayNearestPoint(point);
  const bounds = display.workArea;
  const dictionary = lookupDictionary(word);
  const hoverWidth = 310;
  const hoverHeight = Math.min(180, 138 + Math.max(1, dictionary.meanings.length) * 14);
  hoverWindow.setSize(hoverWidth, hoverHeight, false);
  let x = point.x + 18;
  let y = point.y + 20;
  if (x + hoverWidth > bounds.x + bounds.width) x = point.x - hoverWidth - 18;
  if (y + hoverHeight > bounds.y + bounds.height) y = point.y - hoverHeight - 20;
  hoverWindow.setPosition(Math.max(bounds.x, x), Math.max(bounds.y, y), false);
  const meanings = JSON.stringify(dictionary.meanings);
  const query = `?word=${encodeURIComponent(word)}&count=${addCount}&phonetic=${encodeURIComponent(dictionary.phonetic)}&meanings=${encodeURIComponent(meanings)}`;
  const loading = isDevelopment
    ? hoverWindow.loadURL(`http://localhost:5173/hover.html${query}`)
    : hoverWindow.loadFile(path.join(__dirname, "../web/dist/hover.html"), {
        query: { word, count: String(addCount), phonetic: dictionary.phonetic, meanings }
      });
  loading
    .then(() => {
      if (hoverShowing) {
        hoverWindow.show();
        hoverWindow.setAlwaysOnTop(true, "pop-up-menu");
      }
    })
    .catch((error) => {
      console.error("[hover] window failed to load", error);
      dismissHover();
    });
}

function dismissHover() {
  if (hoverWindow) hoverWindow.hide();
  hoverShowing = false;
  lastCandidate = "";
  stableCandidateCount = 0;
}

async function pollWordUnderCursor() {
  if (!hoverEnabled || hoverRequestRunning || hoverWindow?.isVisible()) return;
  hoverRequestRunning = true;
  const point = screen.getCursorScreenPoint();
  const physicalPoint = screen.dipToScreenPoint(point);
  try {
    const result = await apiRequest("GET", `/api/system/word-at-point?x=${physicalPoint.x}&y=${physicalPoint.y}`);
    const word = result.status === 200 ? result.data?.word || "" : "";
    if (!word) {
      lastCandidate = "";
      stableCandidateCount = 0;
    } else if (word === lastCandidate) {
      stableCandidateCount += 1;
      if (stableCandidateCount >= 2) showHoverWord(word, Number(result.data?.add_count || 0), point);
    } else {
      lastCandidate = word;
      stableCandidateCount = 1;
    }
  } catch {
    lastCandidate = "";
    stableCandidateCount = 0;
  } finally {
    hoverRequestRunning = false;
  }
}

function setHoverEnabled(enabled, persist = true) {
  hoverEnabled = enabled;
  dismissHover();
  if (hoverTimer) clearInterval(hoverTimer);
  hoverTimer = enabled ? setInterval(pollWordUnderCursor, 350) : null;
  if (persist) saveHoverPreference();
  updateTrayMenu();
}

function updateTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: "开启鼠标选词",
      type: "checkbox",
      checked: hoverEnabled,
      click: (item) => setHoverEnabled(item.checked)
    },
    { type: "separator" },
    { label: "打开单词本", click: showMainWindow },
    { label: "退出", click: () => { isQuitting = true; app.quit(); } }
  ]));
  tray.setToolTip(hoverEnabled ? "My Vocabulary · 选词已开启" : "My Vocabulary");
}

function showMainWindow() {
  if (!mainWindow) createMainWindow();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  const icon = nativeImage.createFromPath(trayIconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.on("click", showMainWindow);
  tray.on("double-click", showMainWindow);
  updateTrayMenu();
}

ipcMain.handle("hover:add-word", async (_, word, category) => {
  const result = await apiRequest("POST", "/api/words", {
    term: String(word || "").trim(),
    note: "通过鼠标选词添加",
    category: category === "listening_speaking" ? "listening_speaking" : "reading"
  });
  if (result.status === 201) {
    mainWindow?.webContents.send("words:changed");
    return { ok: true, count: result.data?.add_count || 1 };
  }
  return { ok: false };
});
ipcMain.on("hover:dismiss", dismissHover);

app.whenReady().then(async () => {
  app.setAppUserModelId("com.local.vocabulary");
  startPackagedApi();
  await waitForApi();
  createMainWindow();
  createHoverWindow();
  createTray();
  setHoverEnabled(loadHoverPreference(), false);
  app.on("activate", showMainWindow);
});

app.on("before-quit", () => {
  isQuitting = true;
  if (hoverTimer) clearInterval(hoverTimer);
  if (apiProcess && !apiProcess.killed) apiProcess.kill();
});
