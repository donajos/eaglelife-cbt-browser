const path = require("path");

const ROOT = path.join(__dirname, "..");


module.exports = {
    ROOT,
    PRELOAD: path.join(ROOT, "preload.js")
};