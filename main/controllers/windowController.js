const { createExamWindow, createStartWindow } = require("../windows");

function openExam() {
    createExamWindow();
}
function openStart() {
    createStartWindow();
}
module.exports = {
    openExam,
    openStart
};