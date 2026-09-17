import { registerSW } from 'virtual:pwa-register';

export function registerServiceWorker() {
  const updateSW = registerSW({
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
