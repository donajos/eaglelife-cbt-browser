const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { app } = require('electron');

let originalTaskbarState = null;

function getTaskbarScript() {
    if (app && app.isPackaged) {
        return path.join(process.resourcesPath, 'taskbar.ps1');
    }

    return path.join(__dirname, '..', '..', 'native', 'taskbar.ps1');
}

function runTaskbarCommand(action, state) {
    const args = [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        getTaskbarScript(),
        '-Action',
        action
    ];

    if (state !== undefined) {
        args.push('-State', String(state));
    }

    const result = spawnSync('powershell.exe', args, {
        windowsHide: true,
        encoding: 'utf8',
        timeout: 10000
    });

    if (result.error) {
        throw new Error(`Could not run the Windows taskbar helper: ${result.error.message}`);
    }
    if (result.status !== 0) {
        const detail = (result.stderr || result.stdout || '').trim();
        throw new Error(`The Windows taskbar helper failed${detail ? `: ${detail}` : '.'}`);
    }

    return result.stdout.trim();
}

function hideTaskbar() {
    if (process.platform !== 'win32' || originalTaskbarState !== null) {
        return;
    }

    const state = Number(runTaskbarCommand('hide'));
    if (!Number.isInteger(state) || state < 0) {
        throw new Error('The Windows taskbar helper returned an invalid taskbar state.');
    }

    originalTaskbarState = state;
}

function restoreTaskbar() {
    if (process.platform !== 'win32' || originalTaskbarState === null) {
        return;
    }

    const state = originalTaskbarState;
    originalTaskbarState = null;
    try {
        runTaskbarCommand('restore', state);
    } catch (error) {
        originalTaskbarState = state;
        console.error('Unable to restore the Windows taskbar state:', error);
    }
}

if (app && typeof app.on === 'function') {
    app.on('before-quit', restoreTaskbar);
}

module.exports = {
    hideTaskbar,
    restoreTaskbar
};
