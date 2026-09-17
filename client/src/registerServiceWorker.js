import { Workbox } from 'workbox-window';

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const wb = new Workbox('/sw.js');
  wb.register().then((registration) => {
    console.log('SW registered:', registration);
    wb.addEventListener('waiting', () => {
      if (confirm('New content available. Refresh?')) {
        wb.messageSkipWaiting();
        window.location.reload();
      }
    });
    wb.addEventListener('installed', () => {
      if (wb.active) console.log('App is ready to work offline');
    });
  }).catch((err) => {
    console.log('SW registration failed:', err);
  });
}
