import { HttpAgent } from "@icp-sdk/core/agent";
import { useCallback } from "react";
import { loadConfig } from "../config";
import { StorageClient } from "../utils/StorageClient";

let storageClientCache: StorageClient | null = null;

async function getStorageClient(): Promise<StorageClient> {
  if (storageClientCache) return storageClientCache;
  const config = await loadConfig();
  const agent = new HttpAgent({ host: config.backend_host });
  if (config.backend_host?.includes("localhost")) {
    await agent.fetchRootKey().catch(() => {});
  }
  storageClientCache = new StorageClient(
    config.bucket_name,
    config.storage_gateway_url,
    config.backend_canister_id,
    config.project_id,
    agent,
  );
  return storageClientCache;
}

export function useBlobStorage() {
  const upload = useCallback(async (file: File): Promise<{ key: string }> => {
    const client = await getStorageClient();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { hash } = await client.putFile(bytes);
    return { key: hash };
  }, []);

  const getBlobUrl = useCallback((key: string): string => {
    // Return a lazy-resolved URL pattern; actual URL resolved async below
    return `/api/blob/${key}`;
  }, []);

  const getBlobUrlAsync = useCallback(async (key: string): Promise<string> => {
    const client = await getStorageClient();
    return client.getDirectURL(key);
  }, []);

  return { upload, getBlobUrl, getBlobUrlAsync };
}
