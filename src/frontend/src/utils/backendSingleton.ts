import type { Identity } from "@icp-sdk/core/agent";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "./urlParams";

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
      // Initialize access control (needed for admin role check)
      try {
        const adminToken = getSecretParameter("caffeineAdminToken") || "";
        await actor._initializeAccessControlWithSecret(adminToken);
      } catch {
        // non-fatal; anonymous users won't have admin access
      }
      return actor;
    })().catch((err) => {
      backendPromise = null;
      throw err;
    });
  }
  return backendPromise;
}
