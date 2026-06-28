const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  version: process.versions.electron,
  onWordsChanged: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("words:changed", listener);
    return () => ipcRenderer.removeListener("words:changed", listener);
  },
  auth: {
    setToken: (token) => ipcRenderer.invoke("auth:set-token", token),
  },
  hover: {
    addWord: (word, mode, wordInfo) => ipcRenderer.invoke("hover:add-word", word, mode, wordInfo),
    dismiss: () => ipcRenderer.send("hover:dismiss"),
  },
  dictionary: {
    lookup: (word) => ipcRenderer.invoke("dictionary:lookup", word),
  },
});
