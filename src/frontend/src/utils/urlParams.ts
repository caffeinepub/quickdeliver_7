/**
 * Utility functions for parsing and managing URL parameters
 * Works with both hash-based and browser-based routing
 */

export function getUrlParameter(paramName: string): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const regularParam = urlParams.get(paramName);
  if (regularParam !== null) return regularParam;

  const hash = window.location.hash;
  const queryStartIndex = hash.indexOf("?");
  if (queryStartIndex !== -1) {
    const hashQuery = hash.substring(queryStartIndex + 1);
    const hashParams = new URLSearchParams(hashQuery);
    return hashParams.get(paramName);
  }
  return null;
}

export function storeSessionParameter(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to store session parameter ${key}:`, error);
  }
}

export function getSessionParameter(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to retrieve session parameter ${key}:`, error);
    return null;
  }
}

export function getPersistedUrlParameter(
  paramName: string,
  storageKey?: string,
): string | null {
  const key = storageKey || paramName;
  const urlValue = getUrlParameter(paramName);
  if (urlValue !== null) {
    storeSessionParameter(key, urlValue);
    return urlValue;
  }
  return getSessionParameter(key);
}

export function clearSessionParameter(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(`Failed to clear session parameter ${key}:`, error);
  }
}

function clearParamFromHash(paramName: string): void {
  if (!window.history.replaceState) return;
  const hash = window.location.hash;
  if (!hash || hash.length <= 1) return;

  const hashContent = hash.substring(1);
  const queryStartIndex = hashContent.indexOf("?");
  if (queryStartIndex === -1) return;

  const routePath = hashContent.substring(0, queryStartIndex);
  const queryString = hashContent.substring(queryStartIndex + 1);
  const params = new URLSearchParams(queryString);
  params.delete(paramName);

  const newQueryString = params.toString();
  let newHash = routePath;
  if (newQueryString) newHash += `?${newQueryString}`;

  const newUrl =
    window.location.pathname +
    window.location.search +
    (newHash ? `#${newHash}` : "");
  window.history.replaceState(null, "", newUrl);
}

/**
 * Gets a secret parameter from URL hash or localStorage (persistent across sessions).
 * When found in URL hash, stores it in localStorage for future visits.
 */
export function getSecretParameter(paramName: string): string | null {
  // Check localStorage first (persists across browser restarts)
  try {
    const stored = localStorage.getItem(`secret_${paramName}`);
    if (stored) return stored;
  } catch {
    // ignore
  }

  // Fall back to sessionStorage
  const session = getSessionParameter(paramName);
  if (session) {
    // Promote to localStorage
    try {
      localStorage.setItem(`secret_${paramName}`, session);
    } catch {
      /* ignore */
    }
    return session;
  }

  // Try to extract from hash
  const hash = window.location.hash;
  if (hash && hash.length > 1) {
    const hashContent = hash.substring(1);
    const params = new URLSearchParams(hashContent);
    const secret = params.get(paramName);
    if (secret) {
      // Store in both storages for persistence
      storeSessionParameter(paramName, secret);
      try {
        localStorage.setItem(`secret_${paramName}`, secret);
      } catch {
        /* ignore */
      }
      clearParamFromHash(paramName);
      return secret;
    }
  }

  return null;
}
