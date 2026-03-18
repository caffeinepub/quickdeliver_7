import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";

let backendPromise: Promise<backendInterface> | null = null;

export function getBackend(): Promise<backendInterface> {
  if (!backendPromise) {
    backendPromise = createActorWithConfig().catch((err) => {
      backendPromise = null;
      throw err;
    });
  }
  return backendPromise;
}
