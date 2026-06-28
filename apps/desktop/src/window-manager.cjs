const { BrowserWindow, screen, shell } = require("electron");
const path = require("node:path");

class WindowManager {
  constructor({ isDevelopment, desktopDirectory, shouldQuit }) {
    this.isDevelopment = isDevelopment;
    this.desktopDirectory = desktopDirectory;
    this.shouldQuit = shouldQuit;
    this.mainWindow = null;
    this.hoverWindow = null;
    this.hoverShowing = false;
  }

  createWindows() {
    this.#createMainWindow();
    this.#createHoverWindow();
  }

  #webPreferences() {
    return {
      preload: path.join(this.desktopDirectory, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    };
  }

  #createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1040,
      height: 720,
      minWidth: 760,
      minHeight: 560,
      backgroundColor: "#f6f2e9",
      icon: path.join(this.desktopDirectory, "assets", "app-icon.png"),
      title: "Vocaboom",
      autoHideMenuBar: true,
      webPreferences: this.#webPreferences(),
    });
    if (this.isDevelopment) this.mainWindow.loadURL("http://localhost:5173");
    else this.mainWindow.loadFile(path.join(this.desktopDirectory, "../web/dist/index.html"));
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: "deny" };
    });
    this.mainWindow.on("close", (event) => {
      if (!this.shouldQuit()) {
        event.preventDefault();
        this.mainWindow.hide();
      }
    });
  }

  #createHoverWindow() {
    this.hoverWindow = new BrowserWindow({
      width: 310,
      height: 152,
      show: false,
      frame: false,
      resizable: false,
      backgroundColor: "#fffdf7",
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: true,
      webPreferences: this.#webPreferences(),
    });
    this.hoverWindow.setAlwaysOnTop(true, "pop-up-menu");
  }

  showMainWindow() {
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  notifyWordsChanged() {
    this.mainWindow?.webContents.send("words:changed");
  }

  isHoverVisible() {
    return Boolean(this.hoverWindow?.isVisible());
  }

  dismissHover() {
    this.hoverWindow?.hide();
    this.hoverShowing = false;
  }

  async showHoverWord({ word, addCount, point, dictionary }) {
    if (this.hoverShowing) return;
    this.hoverShowing = true;
    const display = screen.getDisplayNearestPoint(point);
    const bounds = display.workArea;
    const width = 310;
    const height = Math.min(180, 138 + Math.max(1, dictionary.meanings.length) * 14);
    this.hoverWindow.setSize(width, height, false);
    let x = point.x + 18;
    let y = point.y + 20;
    if (x + width > bounds.x + bounds.width) x = point.x - width - 18;
    if (y + height > bounds.y + bounds.height) y = point.y - height - 20;
    this.hoverWindow.setPosition(Math.max(bounds.x, x), Math.max(bounds.y, y), false);

    const query = {
      word,
      headword: dictionary.headword,
      formType: dictionary.formType,
      commonForms: JSON.stringify(dictionary.commonForms),
      count: String(addCount),
      phonetic: dictionary.phonetic,
      meanings: JSON.stringify(dictionary.meanings),
    };
    try {
      if (this.isDevelopment) {
        const params = new URLSearchParams(query);
        await this.hoverWindow.loadURL(`http://localhost:5173/hover.html?${params}`);
      } else {
        await this.hoverWindow.loadFile(path.join(this.desktopDirectory, "../web/dist/hover.html"), {
          query,
        });
      }
      if (this.hoverShowing) {
        this.hoverWindow.show();
        this.hoverWindow.setAlwaysOnTop(true, "pop-up-menu");
      }
    } catch (error) {
      console.error("Hover window failed to load", error);
      this.dismissHover();
    }
  }
}

module.exports = { WindowManager };
