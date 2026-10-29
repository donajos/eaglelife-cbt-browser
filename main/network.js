//network.js
const axios = require("axios");
const store = require("./services/storeServices");
let reconnectTimer = null;
let serverIP = null;
let reconnecting = false;

function initNetwork() {
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
    const targetHost = host || initNetwork();

    if (!targetHost) {
        throw new Error('Server IP is not configured');
    }

    try {
        const response = await fetch(`http://${targetHost}/cbtexam/`, {
            method: 'HEAD'
        });

        return response.ok;
    } catch (err) {
        throw err;
    }
}


async function reconnectLoop(examWindow, serverReachable, lastExamURL) {
    const currentHost = initNetwork();

    if (!examWindow || examWindow.isDestroyed() || !currentHost) return;
    if (reconnecting) return;

    reconnecting = true;

    try {
        await checkServer(currentHost);

        if (!serverReachable) {
            serverReachable = true;
            safeSend('network-online', examWindow);
        }

        const currentURL = examWindow.webContents.getURL();

        if (!currentURL || currentURL.startsWith('chrome-error://') || currentURL === 'about:blank') {
            if (lastExamURL) {
                await examWindow.loadURL(lastExamURL).catch(() => {});
            }
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