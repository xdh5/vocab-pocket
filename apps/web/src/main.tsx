import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles.css";

if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element was not found");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
