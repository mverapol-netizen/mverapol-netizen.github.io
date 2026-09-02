(() => {
  "use strict";

  let deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function buttons() {
    return [...document.querySelectorAll("[data-install-app]")];
  }

  function setButtonsHidden(hidden) {
    buttons().forEach((button) => button.classList.toggle("hidden", hidden));
  }

  function setMessage(text) {
    const message = document.querySelector("#installMessage");
    if (message) message.textContent = text;
  }

  function fallbackInstructions() {
    const ua = navigator.userAgent || "";
    const isiOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);

    if (isiOS) {
      setMessage("En iPhone/iPad: abre esta página en Safari, toca Compartir y luego ‘Añadir a pantalla de inicio’. ");
      alert("Para instalar Radar Laboral en iPhone/iPad: abre esta página en Safari, toca Compartir y elige ‘Añadir a pantalla de inicio’.");
      return;
    }

    if (isAndroid) {
      setMessage("En Android: abre el menú de Chrome y elige ‘Instalar aplicación’ o ‘Añadir a pantalla principal’.");
      alert("Para instalar Radar Laboral en Android: abre el menú ⋮ de Chrome y elige ‘Instalar aplicación’ o ‘Añadir a pantalla principal’.");
      return;
    }

    setMessage("En Chrome o Edge: abre el menú del navegador y elige ‘Instalar Radar Laboral’ o ‘Instalar esta aplicación’.");
    alert("Para instalar Radar Laboral: abre el menú de Chrome o Edge y elige ‘Instalar Radar Laboral’ o ‘Instalar esta aplicación’.");
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (!isStandalone()) setButtonsHidden(false);
    setMessage("Radar Laboral está lista para instalarse como aplicación.");
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    setButtonsHidden(true);
    setMessage("Radar Laboral ya está instalada en este dispositivo.");
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-install-app]");
    if (!button) return;

    if (isStandalone()) {
      setButtonsHidden(true);
      setMessage("Radar Laboral ya está instalada en este dispositivo.");
      return;
    }

    if (!deferredPrompt) {
      fallbackInstructions();
      return;
    }

    button.disabled = true;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    } finally {
      button.disabled = false;
    }
  });

  if (isStandalone()) {
    setButtonsHidden(true);
    setMessage("Radar Laboral ya está instalada en este dispositivo.");
  }
})();
