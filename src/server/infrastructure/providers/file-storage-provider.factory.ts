import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import type { IFileStorageProvider } from "@/modules/ticketing/domain/services/file-storage-provider.interface";
import { LocalFileStorageProvider } from "@/modules/ticketing/server/infrastructure/providers/local-file-storage.provider";
import { S3FileStorageProvider } from "@/modules/ticketing/server/infrastructure/providers/s3-file-storage.provider";
import { readEnvironment } from "@/server/config/environment.config";

export function getFileStorageProvider(): IFileStorageProvider {
  const environment = readEnvironment();
  if (environment.storageDriver === "local") {
    return new LocalFileStorageProvider({
      directory: environment.storageLocalDirectory,
      appBaseUrl: environment.appBaseUrl,
    });
  }

  const isR2 =
    environment.storageDriver === "r2" ||
    Boolean(environment.r2Endpoint || environment.r2Bucket);

  const endpoint = isR2
    ? environment.r2Endpoint || environment.s3Endpoint || undefined
    : environment.s3Endpoint || environment.r2Endpoint || undefined;

  const bucket = isR2
    ? environment.r2Bucket || environment.s3Bucket
    : environment.s3Bucket || environment.r2Bucket;

  const accessKeyId = isR2
    ? environment.r2AccessKeyId || environment.s3AccessKeyId
    : environment.s3AccessKeyId || environment.r2AccessKeyId;

  const secretAccessKey = isR2
    ? environment.r2SecretAccessKey || environment.s3SecretAccessKey
    : environment.s3SecretAccessKey || environment.r2SecretAccessKey;

  const region = isR2 ? "auto" : environment.s3Region || "auto";

  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });

  return new S3FileStorageProvider({
    client,
    bucket,
    publicBaseUrl: environment.publicStorageBaseUrl,
    appBaseUrl: environment.appBaseUrl,
    keyPrefix: environment.storageKeyPrefix,
  });
}
