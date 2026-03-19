import type { Identity } from "@icp-sdk/core/agent";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

let currentIdentity: Identity | undefined;
let backendPromise: Promise<backendInterface> | null = null;

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
      return actor;
    })().catch((err) => {
      backendPromise = null;
      throw err;
    });
  }
  return backendPromise;
}
