import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";
import { LocalFileStorageProvider } from "@/modules/ticketing/server/infrastructure/providers/local-file-storage.provider";
import { S3FileStorageProvider } from "@/modules/ticketing/server/infrastructure/providers/s3-file-storage.provider";
import { readEnvironment } from "@/server/config/environment.config";

export function getFileStorageProvider(): IFileStorageProvider {
  const environment = readEnvironment();
  if (environment.storageDriver === "local") return new LocalFileStorageProvider({ directory: environment.storageLocalDirectory, appBaseUrl: environment.appBaseUrl });
  const client = new S3Client({
    region: environment.s3Region,
    ...(environment.s3Endpoint ? { endpoint: environment.s3Endpoint, forcePathStyle: true } : {}),
    ...(environment.s3AccessKeyId && environment.s3SecretAccessKey ? { credentials: { accessKeyId: environment.s3AccessKeyId, secretAccessKey: environment.s3SecretAccessKey } } : {}),
  });
  return new S3FileStorageProvider({ client, bucket: environment.s3Bucket, publicBaseUrl: environment.s3PublicBaseUrl, appBaseUrl: environment.appBaseUrl });
}
