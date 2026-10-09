import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { FileStorageProvider } from "./file-storage-provider.base";
import type {
  ReadStoredFileParams,
  StoreFileParams,
  StoredFileContent,
} from "@/modules/ticketing/domain/services/file-storage-provider.interface";

export type S3FileStorageProviderDependencies = {
  client: S3Client;
  bucket: string;
  publicBaseUrl: string;
  appBaseUrl: string;
  keyPrefix?: string;
};

export class S3FileStorageProvider extends FileStorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly appBaseUrl: string;
  private readonly keyPrefix: string;

  constructor(dependencies: S3FileStorageProviderDependencies) {
    super();
    this.client = dependencies.client;
    this.bucket = dependencies.bucket;
    this.publicBaseUrl = dependencies.publicBaseUrl.replace(/\/$/, "");
    this.appBaseUrl = dependencies.appBaseUrl.replace(/\/$/, "");
    this.keyPrefix = (dependencies.keyPrefix ?? "").trim().replace(/^\/+|\/+$/g, "");
  }

  private buildKey(key: string): string {
    if (!this.keyPrefix) return key;
    return `${this.keyPrefix}/${key}`;
  }

  async storePrivate(params: StoreFileParams): Promise<void> {
    const fullKey = this.buildKey(params.key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: params.content,
        ContentType: params.contentType,
      }),
    );
  }

  async storePublic(params: StoreFileParams): Promise<string> {
    if (!params.key.startsWith("public/")) {
      throw new Error("Arquivos públicos devem usar o diretório public/.");
    }
    const fullKey = this.buildKey(params.key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: fullKey,
        Body: params.content,
        ContentType: params.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    if (this.publicBaseUrl) {
      const urlEndsWithPrefix =
        this.keyPrefix && this.publicBaseUrl.endsWith(`/${this.keyPrefix}`);
      const relativePath = urlEndsWithPrefix ? params.key : fullKey;
      const path = relativePath.split("/").map(encodeURIComponent).join("/");
      return `${this.publicBaseUrl}/${path}`;
    }

    const path = params.key.split("/").map(encodeURIComponent).join("/");
    return `${this.appBaseUrl}/api/v1/public/files/${path}`;
  }

  async read(params: ReadStoredFileParams): Promise<StoredFileContent | null> {
    try {
      const fullKey = this.buildKey(params.key);
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: fullKey }),
      );
      const content = await object.Body?.transformToByteArray();
      if (!content) return null;
      return {
        content: new Uint8Array(content),
        contentType: object.ContentType ?? "application/octet-stream",
      };
    } catch (error) {
      if (isMissingObject(error)) return null;
      throw error;
    }
  }

  async delete(params: ReadStoredFileParams): Promise<void> {
    const fullKey = this.buildKey(params.key);
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: fullKey }),
    );
  }
}

export { S3FileStorageProvider as R2FileStorageProvider };
export type { S3FileStorageProviderDependencies as R2FileStorageProviderDependencies };

function isMissingObject(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "NoSuchKey"
  );
}
