import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { FileStorageProvider } from "./file-storage-provider.base";
import type {
  ReadStoredFileParams,
  StoreFileParams,
  StoredFileContent,
} from "@/modules/ticketing/domain/services/file-storage-provider.interface";

export type LocalFileStorageProviderDependencies = {
  directory: string;
  appBaseUrl: string;
};

export class LocalFileStorageProvider extends FileStorageProvider {
  private readonly directory: string;
  private readonly appBaseUrl: string;

  constructor(dependencies: LocalFileStorageProviderDependencies) {
    super();
    this.directory = isAbsolute(dependencies.directory)
      ? dependencies.directory
      : resolve(
          /*turbopackIgnore: true*/ process.cwd(),
          dependencies.directory,
        );
    this.appBaseUrl = dependencies.appBaseUrl.replace(/\/$/, "");
  }

  async storePrivate(params: StoreFileParams): Promise<void> {
    await this.writeStoredFile(params);
  }

  async storePublic(params: StoreFileParams): Promise<string> {
    if (!params.key.startsWith("public/"))
      throw new Error("Arquivos públicos devem usar o diretório public/.");
    await this.writeStoredFile(params);
    const path = params.key.split("/").map(encodeURIComponent).join("/");
    return `${this.appBaseUrl}/api/v1/public/files/${path}`;
  }

  async read(params: ReadStoredFileParams): Promise<StoredFileContent | null> {
    const path = this.resolvePath(params.key);
    try {
      const content = await readFile(path);
      return {
        content: new Uint8Array(content),
        contentType: inferContentType(params.key),
      };
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }

  async delete(params: ReadStoredFileParams): Promise<void> {
    await rm(this.resolvePath(params.key), { force: true });
  }

  private async writeStoredFile(params: StoreFileParams): Promise<void> {
    const path = this.resolvePath(params.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, params.content, { flag: "wx" });
  }

  private resolvePath(key: string): string {
    if (
      !key ||
      key.includes("\\") ||
      isAbsolute(key) ||
      key.split("/").some((part) => !part || part === "." || part === "..")
    ) {
      throw new Error("Chave de armazenamento inválida.");
    }
    const filePath = resolve(this.directory, key);
    if (!filePath.startsWith(`${this.directory}${sep}`))
      throw new Error("Chave de armazenamento inválida.");
    return filePath;
  }
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function inferContentType(key: string): string {
  const extension = key.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  return "application/octet-stream";
}
