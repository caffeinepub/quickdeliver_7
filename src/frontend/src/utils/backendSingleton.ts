import type { Identity } from "@icp-sdk/core/agent";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

const ADMIN_TOKEN_STORAGE_KEY = "_brink_admin_token";

/**
 * Extracts the admin token from the current URL (query string or hash),
 * persists it to localStorage, and returns it.
 * Falls back to localStorage if not in the URL.
 */
function extractAndPersistAdminToken(): string {
  // 1. Check regular query string: ?caffeineAdminToken=XXX
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const fromQuery = urlParams.get("caffeineAdminToken");
    if (fromQuery) {
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, fromQuery);
      return fromQuery;
    }
  } catch {
    /* ignore */
  }

  // 2. Check hash for both formats:
  //    #caffeineAdminToken=XXX  (raw)
  //    #/route?caffeineAdminToken=XXX  (hash-routed)
  try {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const hashContent = hash.substring(1); // strip leading #

      // Try raw hash first
      const rawParams = new URLSearchParams(hashContent);
      const fromRawHash = rawParams.get("caffeineAdminToken");
      if (fromRawHash) {
        localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, fromRawHash);
        return fromRawHash;
      }

      // Try hash with route prefix: find ? and parse everything after
      const qIdx = hashContent.indexOf("?");
      if (qIdx !== -1) {
        const hashQuery = hashContent.substring(qIdx + 1);
        const hashQueryParams = new URLSearchParams(hashQuery);
        const fromHashQuery = hashQueryParams.get("caffeineAdminToken");
        if (fromHashQuery) {
          localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, fromHashQuery);
          return fromHashQuery;
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 3. Fall back to sessionStorage (may have been set by earlier getSecretFromHash call)
  try {
    const fromSession = sessionStorage.getItem("caffeineAdminToken");
    if (fromSession) {
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, fromSession);
      return fromSession;
    }
  } catch {
    /* ignore */
  }

  // 4. Fall back to localStorage
  try {
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

// Extract and persist the token as soon as this module loads,
// so the token is saved before any navigation changes the URL.
const _earlyToken = extractAndPersistAdminToken();

let currentIdentity: Identity | undefined;
let backendPromise: Promise<backendInterface> | null = null;

/**
 * Call this whenever the user logs in or out.
 * It resets the cached actor so the next call to getBackend()
 * creates a fresh actor with the new (or absent) identity.
 */
export function setBackendIdentity(identity: Identity | undefined) {
  currentIdentity = identity;
  backendPromise = null;
}

export function getBackend(): Promise<backendInterface> {
  if (!backendPromise) {
    const identity = currentIdentity;
    backendPromise = (async () => {
      const options = identity ? { agentOptions: { identity } } : undefined;
      const actor = await createActorWithConfig(options);
      // Initialize access control with the persisted admin token
      const adminToken = extractAndPersistAdminToken() || _earlyToken;
      if (adminToken) {
        try {
          await actor._initializeAccessControlWithSecret(adminToken);
        } catch {
          // non-fatal; anonymous users won't have admin access
        }
      }
      return actor;
    })().catch((err) => {
      backendPromise = null;
      throw err;
    });
  }
  return backendPromise;
}
