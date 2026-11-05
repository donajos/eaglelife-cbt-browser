

const registerConfigHandlers = require("./configHandlers");
const registerExamHandlers = require("./examHandlers");
const registerAppHandlers = require("./appHandlers");
const {registerModalHandlers} = require("./modalHandlers");
const RegisterUpdateLink = require("./updateLink");



function registerIPC() {
    registerConfigHandlers();
    registerExamHandlers();
    registerAppHandlers();
    registerModalHandlers();
    RegisterUpdateLink();
}

module.exports = registerIPC;