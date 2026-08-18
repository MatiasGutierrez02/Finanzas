import { defineBoot } from '#q-app';

export default defineBoot(async () => {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Persistent storage is best-effort and must never block application startup.
  }
});
