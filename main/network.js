const axios = require("axios");

let serverIP;

function initNetwork(ip) {
    serverIP = ip;
}

async function checkServer(host) {
    try {
        const response = await fetch(`http://${host}/cbtexam/`, {
            method: 'HEAD'
        });

        return response.ok;
    } catch (err) {
        throw err;
    }
}

async function reconnectLoop() {

    if (!examWindow || examWindow.isDestroyed()) return;
    if (reconnecting) return;

    reconnecting = true;

    try {
        await checkServer(serverIP);

        if (!serverReachable) {
            serverReachable = true;
            safeSend('network-online');
        }

        // Reload only if current page is blank/error
        const currentURL = examWindow.webContents.getURL();

        if (!currentURL || currentURL.startsWith('chrome-error://') || currentURL === 'about:blank') {
            await safeLoadURL(lastExamURL);
        }

    } catch {
        serverReachable = false;
        safeSend('network-offline');

    } finally {
        reconnecting = false;

        reconnectTimer = setTimeout(reconnectLoop, 2000);
    }
}

module.exports = {
    initNetwork,
    checkServer,
    reconnectLoop
};