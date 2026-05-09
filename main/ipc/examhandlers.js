const { ipcMain } = require('electron');

ipcMain.on('start', () => {
   
    // Instead of a new window, just load the next file in the SAME window
    if (startWindow) {
        startWindow.loadFile('C:/Users/user/cbtexam_client/renderer/login.html');
    }
    
});

ipcMain.handle('exam-login', async () => {
    if (!startWindow) return { success: false };

    try {
         if (!examWindow) {
            await autoUpdater.checkForUpdates();
        }       
        // Check if server is reachable
        await checkServer(serverIP);

        // Close the start window and open the exam window
        startWindow.close();
        createExamWindow();

        return { success: true };
    } catch {
        // Show modal if server unreachable
        await showMessage("Cannot reach server");
        return { success: false };
    }
});