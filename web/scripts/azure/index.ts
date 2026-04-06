import { BlobServiceClient } from "@azure/storage-blob";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    console.log("Azure Blob storage v12 - TypeScript quickstart sample");

    // Connect to Azure Storage account and display account info
    console.log("Connecting to Azure Storage account...");

    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
      throw Error("Azure Storage Connection string not found");
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.AZURE_STORAGE_CONNECTION_STRING
    );

    blobServiceClient.getAccountInfo().then((response) => {
      console.log(
        `Connected to Azure Storage account successfully. Account kind: ${response.accountKind}, SKU: ${response.skuName}, ${blobServiceClient.accountName} `
      );
    }).catch((error) => {
      console.error("Error connecting to Azure Storage account:", error instanceof Error ? error.message : error);
      throw error;
    });

    // // Create a unique name for the container
    if (!process.env.AZURE_STORAGE_CONTAINER_NAME) {
      throw Error("Azure Storage container name not found");
    }
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

    console.log('\nCreating container...');
    console.log('\t', containerName);

    // Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create the container
    const createContainerResponse = await containerClient.create();
    console.log(
        `Container was created successfully.\n\trequestId:${createContainerResponse.requestId}\n\tURL: ${containerClient.url}`
    );

    // // Create a unique name for the blob
    // const blobName = 'quickstart' + uuidv4() + '.txt';

    // // Get a block blob client
    // const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // // Display blob name and url
    // console.log(
    //     `\nUploading to Azure storage as blob\n\tname: ${blobName}:\n\tURL: ${blockBlobClient.url}`
    // );

    // // Upload data to the blob
    // const data = 'Hello, World!';
    // const uploadBlobResponse = await blockBlobClient.upload(data, data.length);
    // console.log(
    //     `Blob was uploaded successfully. requestId: ${uploadBlobResponse.requestId}`
    // );

    // console.log('\nListing blobs...');

    // // List the blob(s) in the container.
    // for await (const blob of containerClient.listBlobsFlat()) {
    //     // Get Blob Client from name, to get the URL
    //     const tempBlockBlobClient = containerClient.getBlockBlobClient(blob.name);

    //     // Display blob name and URL
    //     console.log(
    //         `\n\tname: ${blob.name}\n\tURL: ${tempBlockBlobClient.url}\n`
    //     );
    // }

    // // Get blob content from position 0 to the end
    // // In Node.js, get downloaded data by accessing downloadBlockBlobResponse.readableStreamBody
    // // In browsers, get downloaded data by accessing downloadBlockBlobResponse.blobBody
    // const downloadBlockBlobResponse = await blockBlobClient.download(0);
    // console.log('\nDownloaded blob content...');
    // console.log(
    //     '\t',
    //     await streamToText(downloadBlockBlobResponse.readableStreamBody)
    // );

    // // Delete container
    // console.log('\nDeleting container...');

    // const deleteContainerResponse = await containerClient.delete();
    // console.log(
    //     'Container was deleted successfully. requestId: ',
    //     deleteContainerResponse.requestId
    // );
  } catch (err) {
    console.log("Error running sample:", err instanceof Error ? err.message : err);
  }
}

main()
  .then(() => console.log("Done"))
  .catch((ex) => console.log(ex.message));

// Convert stream to text
async function streamToText(readable: NodeJS.ReadableStream | undefined): Promise<string> {
    if (!readable) {
        throw new Error("No readable stream provided");
    }

    readable.setEncoding('utf8');
    let data = '';
    for await (const chunk of readable) {
        data += chunk;
    }
    return data;
} 