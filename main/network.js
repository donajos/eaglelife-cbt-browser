//network.js
const axios = require("axios");
const store = require("./services/storeServices");
let reconnectTimer = null;

function initNetwork(){
    serverIP = store.get('serverIP');
    return serverIP;
}

function safeSend(channel, examWindow, data = null) {
    try {
        if (
            examWindow &&
            !examWindow.isDestroyed() &&
            examWindow.webContents &&
            !examWindow.webContents.isDestroyed()
        ) {
            examWindow.webContents.send(channel, data);
        }
    } catch (err) {
        console.log("safeSend skipped:", err.message);
    }
}


async function checkServer(host) {
    initNetwork();
    try {
        const response = await fetch(`http://${host}/cbtexam/`, {
            method: 'HEAD'
        });

        return response.ok;
    } catch (err) {
        throw err;
    }
}


async function reconnectLoop(examWindow, serverReachable, lastExamURL, reconnecting) {
    initNetwork();

    if (!examWindow || examWindow.isDestroyed()) return;
    if (reconnecting) return;

    reconnecting = true;

    try {
        await checkServer(serverIP);

        if (!serverReachable) {
            serverReachable = true;
            safeSend('network-online', examWindow);
        }

        // Reload only if current page is blank/error
        const currentURL = examWindow.webContents.getURL();

        if (!currentURL || currentURL.startsWith('chrome-error://') || currentURL === 'about:blank') {
            await safeLoadURL(lastExamURL);
        }

    } catch {
        serverReachable = false;
        safeSend('network-offline', examWindow);

    } finally {
        reconnecting = false;

        reconnectTimer = setTimeout(() => {
                                reconnectLoop(examWindow, serverReachable, lastExamURL);
                                }, 20000);
    }
}



module.exports = {
    initNetwork,
    checkServer,
    reconnectLoop,
    safeSend
};