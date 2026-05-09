const axios = require("axios");
let interval;
let serverCommandInterval = null;

function checkServerCommands() {

    if (serverCommandInterval) return; // already running

    serverCommandInterval = setInterval(async () => {
        // skip check if examWindow is open
        if (examWindow && !examWindow.isDestroyed()) return;

        try {
            const res = await axios.get(`http://${serverIP}/updates/api/system-status.php`);

            if (res.data.examActive) {
                kioskMode = true;
            } else {
                kioskMode = false;
            }
            if (res.data.lockClient) {
                appLock = true;
            } else {
                appLock = false;
            }
            if(res.data.shutdown){
                app.quit();
            }


        } catch (err) {
            console.log("Failed to check server version:", err.message);
        }
    }, 60000); // every 60 seconds
}

function stopServerControl() {
    if (serverCommandInterval) {
        clearInterval(serverCommandInterval);
        serverCommandInterval = null;
    }
}


function initServerControl() {
    checkServerCommands();
}

module.exports = {
    initServerControl,
    stopServerControl
};