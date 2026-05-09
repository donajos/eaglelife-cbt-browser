//modal.js

// Modal handling
window.addEventListener("DOMContentLoaded", () => {
    const globalModal = document.getElementById("globalModal");
    const globalModalMessage = document.getElementById("globalModalMessage");
    const globalModalOk = document.getElementById("globalModalOk");

    window.electronAPI.onShowMessage((message) => {
        globalModalMessage.textContent = message;
        globalModal.classList.remove("hidden");
    });

    globalModalOk.addEventListener("click", () => {
        window.electronAPI.closeModal();
        globalModal.classList.add("hidden");
    });
});

/* modalOk.addEventListener("click", () => {
    modal.classList.add("hidden");
    ipInput.focus(); // restore focus
}); */
