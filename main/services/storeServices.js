// storeServices.js

const Store = require("electron-store").default;

const store = new Store({
    projectName: "cbtexam"
});

module.exports = store;