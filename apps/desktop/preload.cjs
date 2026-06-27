const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  version: process.versions.electron,
  onWordsChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("words:changed", listener);
    return () => ipcRenderer.removeListener("words:changed", listener);
  },
  hover: {
    addWord: (word, category) => ipcRenderer.invoke("hover:add-word", word, category),
    dismiss: () => ipcRenderer.send("hover:dismiss")
  }
});
