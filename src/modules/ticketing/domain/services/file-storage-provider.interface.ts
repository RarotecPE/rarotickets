export type StoreFileParams = {
  key: string;
  contentType: string;
  content: Uint8Array;
  preferExternalUrl?: boolean;
};
export type ReadStoredFileParams = { key: string };
export type StoredFileContent = { content: Uint8Array; contentType: string };

export interface IFileStorageProvider {
  storePrivate(params: StoreFileParams): Promise<void>;
  storePublic(params: StoreFileParams): Promise<string>;
  read(params: ReadStoredFileParams): Promise<StoredFileContent | null>;
  delete(params: ReadStoredFileParams): Promise<void>;
}
