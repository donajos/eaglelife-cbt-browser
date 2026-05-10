const { ipcMain } = require('electron');

const registerConfigHandlers = require("./configHandlers");
const registerExamHandlers = require("./examHandlers");
const registerAppHandlers = require("./appHandlers");
const {registerModalHandlers} = require("./modalHandlers");
const { openStart, openExam } = require('../controllers/windowController');


function registerIPC() {
    registerConfigHandlers();
    registerExamHandlers();
    registerAppHandlers();
    registerModalHandlers();
}

module.exports = registerIPC;