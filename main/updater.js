//updater.js

const { autoUpdater } = require("electron-updater");
const store = require("./services/storeServices");
const log = require("electron-log");

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = "info";
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;


function initUpdater() {
    store.set('updateChecked', false);
    let serverIP = store.get('serverIP');
    
    if (!serverIP) return;
    
    autoUpdater.setFeedURL({
        provider: "generic",
        url: `http://${serverIP}/updates/`
    });
    
    if (!store.get('updateChecked')) {
        autoUpdater.checkForUpdates();
        store.set('updateChecked', true);
    }
    
            
}


module.exports = { initUpdater };