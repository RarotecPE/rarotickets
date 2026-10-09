import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { FileStorageProvider } from "./file-storage-provider.base";
import type { ReadStoredFileParams, StoreFileParams, StoredFileContent } from "@/modules/ticketing/domain/services/file-storage-provider.interface";

export type S3FileStorageProviderDependencies = { client: S3Client; bucket: string; publicBaseUrl: string; appBaseUrl: string };

export class S3FileStorageProvider extends FileStorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly appBaseUrl: string;

  constructor(dependencies: S3FileStorageProviderDependencies) {
    super();
    this.client = dependencies.client;
    this.bucket = dependencies.bucket;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
    this.appBaseUrl = dependencies.appBaseUrl.replace(/\/$/, "");
  }

  async storePrivate(params: StoreFileParams): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: params.key, Body: params.content, ContentType: params.contentType, ServerSideEncryption: "AES256" }));
  }

  async storePublic(params: StoreFileParams): Promise<string> {
    if (!params.key.startsWith("public/")) throw new Error("Arquivos públicos devem usar o diretório public/.");
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: params.key, Body: params.content, ContentType: params.contentType, CacheControl: "public, max-age=31536000, immutable" }));
    if (this.publicBaseUrl) return `${this.publicBaseUrl}/${params.key.split("/").map(encodeURIComponent).join("/")}`;
    const path = params.key.split("/").map(encodeURIComponent).join("/");
    return `${this.appBaseUrl}/api/v1/public/files/${path}`;
  }

  async read(params: ReadStoredFileParams): Promise<StoredFileContent | null> {
    try {
      const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: params.key }));
      const content = await object.Body?.transformToByteArray();
      if (!content) return null;
      return { content: new Uint8Array(content), contentType: object.ContentType ?? "application/octet-stream" };
    } catch (error) {
      if (isMissingObject(error)) return null;
      throw error;
    }
  }

  async delete(params: ReadStoredFileParams): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: params.key }));
  }
}

function isMissingObject(error: unknown): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === "NoSuchKey";
}
