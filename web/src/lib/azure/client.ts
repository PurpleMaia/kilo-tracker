import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";

let client: BlobServiceClient | null = null;
let container: ContainerClient | null = null;

let _azureBlobStorage: { client: BlobServiceClient, container: ContainerClient } | null = null;

export function getAzureBlobStorage(): { client: BlobServiceClient, container: ContainerClient } {
  if (_azureBlobStorage) return _azureBlobStorage;

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME?.trim();

  if (!connectionString) {
    throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING environment variable");
  }

  if (!containerName) {
    throw new Error("Missing AZURE_STORAGE_CONTAINER_NAME environment variable");
  }

  client = BlobServiceClient.fromConnectionString(connectionString);

  container = client.getContainerClient(containerName);

  return { client, container };
}