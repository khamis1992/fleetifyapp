/**
 * Version checking utility to detect stale deployments
 * This helps prevent chunk loading errors when a new version is deployed
 */

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const VERSION_KEY = 'app_version';

/**
 * Get the current app version from the build
 * In production, this is the build timestamp
 */
export function getCurrentVersion(): string {
  // Use import.meta.env.VITE_BUILD_TIME if available, otherwise use a timestamp
  return import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
}

/**
 * Check if a new version is available by fetching the index.html
 * and comparing the script tags
 */
export async function checkForNewVersion(): Promise<boolean> {
  try {
    const response = await fetch('/index.html', {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      console.warn('[VERSION_CHECK] Failed to fetch index.html:', response.status);
      return false;
    }
    
    const html = await response.text();
    
    // Extract script tags from the HTML
    const scriptMatches = html.match(/<script[^>]*src="([^"]+)"[^>]*>/g);
    if (!scriptMatches) {
      console.warn('[VERSION_CHECK] No script tags found in index.html');
      return false;
    }
    
    // Get the main app script (usually contains a hash)
    const appScript = scriptMatches.find(script => script.includes('/assets/index-'));
    if (!appScript) {
      console.warn('[VERSION_CHECK] No main app script found');
      return false;
    }
    
    // Extract the hash from the script tag
    const hashMatch = appScript.match(/index-([^.]+)\.js/);
    if (!hashMatch) {
      console.warn('[VERSION_CHECK] No hash found in script tag');
      return false;
    }
    
    const newHash = hashMatch[1];
    const currentHash = sessionStorage.getItem(VERSION_KEY);
    
    if (!currentHash) {
      // First time checking, store the current hash
      sessionStorage.setItem(VERSION_KEY, newHash);
      console.log('[VERSION_CHECK] Stored initial version hash:', newHash);
      return false;
    }
    
    if (currentHash !== newHash) {
      console.log('[VERSION_CHECK] New version detected!', {
        current: currentHash,
        new: newHash
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('[VERSION_CHECK] Error checking for new version:', error);
    return false;
  }
}

/**
 * Start periodic version checking
 */
export function startVersionChecking(onNewVersion?: () => void): () => void {
  console.log('[VERSION_CHECK] Starting periodic version checking...');
  
  const checkVersion = async () => {
    const hasNewVersion = await checkForNewVersion();
    if (hasNewVersion) {
      console.log('[VERSION_CHECK] New version available, triggering callback');
      if (onNewVersion) {
        onNewVersion();
      } else {
        // Default behavior: show a notification and reload after a delay
        console.log('[VERSION_CHECK] No callback provided, will reload in 30 seconds');
        setTimeout(() => {
          console.log('[VERSION_CHECK] Reloading to get new version...');
          window.location.reload();
        }, 30000);
      }
    }
  };
  
  // Check immediately on start
  checkVersion();
  
  // Then check periodically
  const intervalId = setInterval(checkVersion, VERSION_CHECK_INTERVAL);
  
  // Return cleanup function
  return () => {
    console.log('[VERSION_CHECK] Stopping version checking');
    clearInterval(intervalId);
  };
}

/**
 * Force reload to get the latest version
 */
export function forceReload(): void {
  console.log('[VERSION_CHECK] Force reloading to get latest version...');
  sessionStorage.removeItem(VERSION_KEY);
  sessionStorage.removeItem('chunk_reload_attempted');
  window.location.reload();
}

