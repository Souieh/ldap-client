/**
 * Utility to detect if the app is running in a Tauri/Desktop environment.
 */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Returns the base URL for API requests.
 * In a web browser, this is an empty string (relative to the current host).
 * In a desktop app, this may need to point to a local proxy or the original web server.
 */
export function getApiBaseUrl(): string {
  if (isTauri()) {
    // For a desktop app, we might need a fixed URL or use Tauri's HTTP plugin.
    // If the backend is still remote, return that URL here.
    return process.env.NEXT_PUBLIC_API_URL || '';
  }
  return '';
}
