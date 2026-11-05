//updater.js

const store = require("./services/storeServices");
const log = require("electron-log");
const { getExamWindow } = require("./kiosk");

let autoUpdater = null;
if (process.versions && process.versions.electron) {
    ({ autoUpdater } = require("electron-updater"));
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = "info";
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on("update-downloaded", () => {
        const examWindow = getExamWindow();

        if (examWindow && !examWindow.isDestroyed()) {
            store.set('pendingUpdate', true);
            log.info("Update downloaded; installation is deferred until the exam window closes.");
            return;
        }

        store.set('pendingUpdate', false);
        log.info("Update downloaded; restarting to install.");
        autoUpdater.quitAndInstall();
    });
}

let pendingCheck = null;

function configureUpdater() {
    if (!autoUpdater) {
        throw new Error("Auto-updates are unavailable outside Electron.");
    }

    const serverIP = store.get('serverIP');

    if (!serverIP) {
        throw new Error("Update server is not configured.");
    }

    autoUpdater.setFeedURL({
        provider: "generic",
        url: `http://${serverIP}/updates/`
    });
}

function checkForUpdates() {
    configureUpdater();

    if (!pendingCheck) {
        pendingCheck = autoUpdater.checkForUpdates()
            .then(result => ({
                success: true,
                updateAvailable: result ? result.isUpdateAvailable : null
            }))
            .finally(() => {
                pendingCheck = null;
            });
    }

    return pendingCheck;
}

function initUpdater() {
    if (!autoUpdater || !store.get('serverIP')) return;

    checkForUpdates().catch(error => {
        log.error("Unable to check for updates:", error);
    });
}


module.exports = { initUpdater, checkForUpdates };