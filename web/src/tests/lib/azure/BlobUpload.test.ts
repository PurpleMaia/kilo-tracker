import { getAzureBlobStorage } from "@/lib/azure/client";

// Minimal valid JPEG (1x1 pixel) — this is the test image we upload
const JPEG_BYTES = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=",
  "base64"
);

const TEST_BLOB_PATH = `kilo/_test_upload/test-image-${Date.now()}.jpg`;

describe("Azure Blob Storage Upload", () => {
  let blobUrl: string;

  beforeAll(async () => {
    // Ensure the container exists (createIfNotExists is idempotent)
    const { container } = getAzureBlobStorage();
    const createResponse = await container.createIfNotExists();
    console.log(`[0] Container createIfNotExists — created: ${createResponse.succeeded}`);
  });

  test("should upload a test image to Azure Blob Storage", async () => {
    console.log("--- Azure Blob Upload Test ---");
    console.log(`[1] Test image size: ${JPEG_BYTES.length} bytes`);
    console.log(`[2] Target blob path: ${TEST_BLOB_PATH}`);

    // Get the singleton Azure blob client
    const { container } = getAzureBlobStorage();
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;
    console.log(`[3] Container: ${containerName}`);

    // Get a block blob client for the target path
    const blockBlobClient = container.getBlockBlobClient(TEST_BLOB_PATH);
    blobUrl = blockBlobClient.url;
    console.log(`[4] Blob URL will be: ${blobUrl}`);

    // Upload the buffer with content type header
    console.log("[5] Uploading image data...");
    const uploadResponse = await blockBlobClient.uploadData(JPEG_BYTES, {
      blobHTTPHeaders: { blobContentType: "image/jpeg" },
    });

    console.log(`[6] Upload complete — requestId: ${uploadResponse.requestId}`);
    console.log(`[7] ETag: ${uploadResponse.etag}`);
    console.log(`[8] Last modified: ${uploadResponse.lastModified}`);

    expect(uploadResponse.requestId).toBeDefined();
    expect(uploadResponse.etag).toBeDefined();
  });

  test("should verify the uploaded blob exists and has correct properties", async () => {
    const { container } = getAzureBlobStorage();
    const blockBlobClient = container.getBlockBlobClient(TEST_BLOB_PATH);

    console.log(`[9] Fetching properties for: ${TEST_BLOB_PATH}`);
    const properties = await blockBlobClient.getProperties();

    console.log(`[10] Content-Type: ${properties.contentType}`);
    console.log(`[11] Content-Length: ${properties.contentLength} bytes`);
    console.log(`[12] Blob type: ${properties.blobType}`);
    console.log(`[13] Created on: ${properties.createdOn}`);

    expect(properties.contentType).toBe("image/jpeg");
    expect(properties.contentLength).toBe(JPEG_BYTES.length);
  });

  test("should download the blob and verify it matches the original image", async () => {
    const { container } = getAzureBlobStorage();
    const blockBlobClient = container.getBlockBlobClient(TEST_BLOB_PATH);

    console.log(`[14] Downloading blob: ${TEST_BLOB_PATH}`);
    const downloadResponse = await blockBlobClient.downloadToBuffer();

    console.log(`[15] Downloaded ${downloadResponse.length} bytes`);
    console.log(`[16] Original was ${JPEG_BYTES.length} bytes`);
    console.log(`[17] Bytes match: ${downloadResponse.equals(JPEG_BYTES)}`);

    expect(downloadResponse.equals(JPEG_BYTES)).toBe(true);
  });

  test("should delete the test blob", async () => {
    const { container } = getAzureBlobStorage();
    const blockBlobClient = container.getBlockBlobClient(TEST_BLOB_PATH);

    console.log(`[18] Deleting blob: ${TEST_BLOB_PATH}`);
    const deleteResponse = await blockBlobClient.delete();

    console.log(`[19] Delete complete — requestId: ${deleteResponse.requestId}`);

    // Verify it's gone
    const exists = await blockBlobClient.exists();
    console.log(`[20] Blob still exists: ${exists}`);
    console.log("--- Test complete, blob cleaned up ---");

    expect(exists).toBe(false);
  });
});
