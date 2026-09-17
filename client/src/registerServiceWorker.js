export async function registerServiceWorker() {
  let updateSW;
  try {
    const mod = await import('virtual:pwa-register');
    updateSW = mod.registerSW;
  } catch {
    console.log('PWA module not available');
    return;
  }
  updateSW({
    onNeedRefresh() {
      if (confirm('New content available. Refresh?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App is ready to work offline');
    },
  });
}
