import type { IFileStorageProvider, ReadStoredFileParams, StoreFileParams, StoredFileContent } from "@/modules/ticketing/domain/services/file-storage-provider.interface";

export abstract class FileStorageProvider implements IFileStorageProvider {
  abstract storePrivate(params: StoreFileParams): Promise<void>;
  abstract storePublic(params: StoreFileParams): Promise<string>;
  abstract read(params: ReadStoredFileParams): Promise<StoredFileContent | null>;
  abstract delete(params: ReadStoredFileParams): Promise<void>;
}
