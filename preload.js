// preload.js
// Runs in a secure context between main and renderer
const { contextBridge, ipcRenderer } = require("electron");

function createNavigationOverlay() {

  if (document.getElementById("nav-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "nav-overlay";

  overlay.style = `
    position:fixed;
    top:0;
    left:0;
    width:100%;
    height:100%;
    background:white;
    display:flex;
    justify-content:center;
    align-items:center;
    color:red;
    font-size:22px;
    font-family:sans-serif;
    z-index:99999;
  `;

  overlay.innerHTML = `
    Cannot reach exam server.<br>
    Waiting for connection...
  `;

  const append = () => document.body.appendChild(overlay);

  if (document.body) append();
  else window.addEventListener("DOMContentLoaded", append);
}

function removeNavigationOverlay() {
  const overlay = document.getElementById("nav-overlay");
  if (overlay) overlay.remove();
}

ipcRenderer.on("network-offline", () => {
  createNavigationOverlay();
});

ipcRenderer.on("network-online", () => {
  removeNavigationOverlay();
});

// Expose functions to renderer securely
contextBridge.exposeInMainWorld('electronAPI', {
    saveIP: (ip) => ipcRenderer.send('save-ip', ip),
    getIP: () => ipcRenderer.invoke('get-ip'),
    startPage: () => ipcRenderer.send('start'),
    examLogin: () => ipcRenderer.invoke('exam-login'),
    showMessage: (message) => ipcRenderer.send('show-message', message),
    onShowMessage: (callback) =>
        ipcRenderer.on('show-message', (event, message) => callback(message)),
    closeModal: () => ipcRenderer.send('modal-closed'),
    getVersion: () => ipcRenderer.invoke('get-version')
    //notifyOffline: () => ipcRenderer.send('network-offline'),
    //notifyOnline: () => ipcRenderer.send('network-online'),
    //showOfflineOverlay: () => ipcRenderer.send('network-offline'),
    //removeOfflineOverlay: () => ipcRenderer.send('network-online')
});