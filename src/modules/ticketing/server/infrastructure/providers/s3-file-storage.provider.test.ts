import { describe, expect, it, vi } from "vitest";
import { S3FileStorageProvider } from "./s3-file-storage.provider";
import type { S3Client } from "@aws-sdk/client-s3";

describe("S3FileStorageProvider (Cloudflare R2 compatible)", () => {
  const mockSend = vi.fn();
  const mockClient = {
    send: mockSend,
  } as unknown as S3Client;

  it("should store public file with app proxy url when publicBaseUrl is empty", async () => {
    mockSend.mockResolvedValueOnce({});

    const provider = new S3FileStorageProvider({
      client: mockClient,
      bucket: "rarobucket",
      publicBaseUrl: "",
      appBaseUrl: "http://localhost:3000",
    });

    const url = await provider.storePublic({
      key: "public/banners/banner-1.png",
      content: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
    });

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(url).toBe("http://localhost:3000/api/v1/public/files/public/banners/banner-1.png");
  });

  it("should store public file and return CDN url when publicBaseUrl is set", async () => {
    mockSend.mockResolvedValueOnce({});

    const provider = new S3FileStorageProvider({
      client: mockClient,
      bucket: "rarobucket",
      publicBaseUrl: "https://pub-abc.r2.dev",
      appBaseUrl: "http://localhost:3000",
    });

    const url = await provider.storePublic({
      key: "public/banners/banner-1.png",
      content: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
    });

    expect(url).toBe("https://pub-abc.r2.dev/public/banners/banner-1.png");
  });

  it("should prepend keyPrefix to S3/R2 commands when configured", async () => {
    mockSend.mockResolvedValueOnce({});

    const provider = new S3FileStorageProvider({
      client: mockClient,
      bucket: "rarobucket",
      publicBaseUrl: "",
      appBaseUrl: "http://localhost:3000",
      keyPrefix: "rarotickets",
    });

    await provider.storePublic({
      key: "public/banners/banner-1.png",
      content: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
    });

    const putCommand = mockSend.mock.calls[mockSend.mock.calls.length - 1][0];
    expect(putCommand.input.Key).toBe("rarotickets/public/banners/banner-1.png");
    expect(putCommand.input.Bucket).toBe("rarobucket");
  });
});

