const { spawn } = require('node:child_process');
const path = require('node:path');
const electron = require('electron');

const app = electron.app;
const dialog = electron.dialog;
const STARTUP_TIMEOUT_MS = 10000;
const STOP_TIMEOUT_MS = 2000;

let hookProcess = null;
let hookReady = false;
let hookStartupPromise = null;
let shuttingDown = false;

function getHookExecutable() {
    if (app && app.isPackaged) {
        return path.join(process.resourcesPath, 'keyboard-hook.ps1');
    }

    return path.join(__dirname, '..', '..', 'native', 'keyboard-hook.ps1');
}

function showHookFailure(message) {
    console.error(message);
    if (dialog && typeof dialog.showErrorBox === 'function') {
        dialog.showErrorBox('Keyboard hook unavailable', message);
    }
}

function startKeyboardHook() {
    if (process.platform !== 'win32') {
        return Promise.resolve();
    }

    if (hookReady && hookProcess) {
        return Promise.resolve();
    }

    if (hookStartupPromise) {
        return hookStartupPromise;
    }

    shuttingDown = false;
    const scriptPath = getHookExecutable();

    hookStartupPromise = new Promise((resolve, reject) => {
        const child = spawn('powershell.exe', [
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            scriptPath
        ], {
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let output = '';
        let startupSettled = false;
        let expectedExit = false;

        hookProcess = child;

        const failStartup = (error) => {
            if (startupSettled) return;

            startupSettled = true;
            expectedExit = true;
            hookStartupPromise = null;
            clearTimeout(startupTimer);
            if (hookProcess === child) {
                hookProcess = null;
                hookReady = false;
            }
            child.kill();
            reject(error);
        };

        const startupTimer = setTimeout(() => {
            failStartup(new Error('The keyboard hook did not start within 10 seconds.'));
        }, STARTUP_TIMEOUT_MS);

        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            output += chunk;
            const lines = output.split(/\r?\n/);
            output = lines.pop();

            for (const line of lines) {
                if (line === 'READY' && !startupSettled) {
                    startupSettled = true;
                    hookReady = true;
                    hookStartupPromise = null;
                    clearTimeout(startupTimer);
                    resolve();
                } else if (line === 'ERROR') {
                    failStartup(new Error('The keyboard hook could not install its Windows hook.'));
                }
            }
        });

        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
            console.error(`Keyboard hook: ${chunk.trimEnd()}`);
        });

        child.stdin.on('error', (error) => {
            if (!shuttingDown) {
                console.error('Keyboard hook input pipe failed:', error);
            }
        });

        child.on('error', (error) => {
            failStartup(new Error(`Could not launch the keyboard hook helper: ${error.message}`));
        });

        child.on('exit', (code, signal) => {
            clearTimeout(startupTimer);
            if (hookProcess === child) {
                hookProcess = null;
                hookReady = false;
            }
            hookStartupPromise = null;

            if (!startupSettled) {
                failStartup(new Error(
                    `The keyboard hook helper exited before becoming ready (code ${code}, signal ${signal}).`
                ));
            } else if (!expectedExit && !shuttingDown) {
                showHookFailure(
                    `The keyboard hook helper exited unexpectedly (code ${code}, signal ${signal}). The app will close.`
                );
                app.quit();
            } else if (expectedExit) {
                return;
            }
        });
    });

    return hookStartupPromise;
}

function stopKeyboardHook() {
    shuttingDown = true;
    hookReady = false;
    hookStartupPromise = null;

    const child = hookProcess;
    if (!child) return;

    hookProcess = null;
    child.stdin.end();

    const stopTimer = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
            child.kill();
        }
    }, STOP_TIMEOUT_MS);
    stopTimer.unref();
    child.once('exit', () => clearTimeout(stopTimer));
}

if (app && typeof app.on === 'function') {
    app.on('before-quit', stopKeyboardHook);
}

module.exports = {
    startKeyboardHook,
    stopKeyboardHook
};
