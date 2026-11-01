(() => {
  const installButton = document.getElementById('pwaInstallBtn');
  let installPrompt = null;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (installButton) installButton.classList.add('hidden');
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) {
        Swal.fire('La app ya está instalada', 'OmniDoc Studio ya está disponible desde la pantalla de inicio o el menú de aplicaciones.', 'info');
        return;
      }
      if (installPrompt) {
        installPrompt.prompt();
        await installPrompt.userChoice;
        installPrompt = null;
        return;
      }
      Swal.fire({
        title: 'Añadir OmniDoc a este dispositivo',
        icon: 'info',
        html: '<p>En el menú del navegador elige <strong>Instalar aplicación</strong> o <strong>Añadir a pantalla de inicio</strong>.</p><p class="mt-2 text-xs text-slate-500">En iPhone o iPad, abre esta página en Safari y usa Compartir → Añadir a pantalla de inicio.</p>',
        confirmButtonText: 'Entendido'
      });
    });
  }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(error => console.warn('No se pudo registrar la app instalable:', error));
    });
  }
})();
