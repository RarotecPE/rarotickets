import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { readEnvironment } from "./environment.config";

describe("Environment Config Storage Resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should detect Cloudflare R2 when R2 variables are provided", () => {
    delete process.env.STORAGE_DRIVER;
    process.env.R2_ENDPOINT = "https://6563cf21071683af4499393383e1e658.r2.cloudflarestorage.com";
    process.env.R2_BUCKET = "rarobucket";
    process.env.R2_ACCESS_KEY_ID = "key123";
    process.env.R2_SECRET_ACCESS_KEY = "sec123";
    process.env.R2_BASE_PREFIX = "";

    const env = readEnvironment();
    expect(env.storageDriver).toBe("r2");
    expect(env.r2Bucket).toBe("rarobucket");
    expect(env.r2AccessKeyId).toBe("key123");
    expect(env.r2SecretAccessKey).toBe("sec123");
    expect(env.storageKeyPrefix).toBe("");
    expect(env.publicStorageBaseUrl).toBe("");
  });

  it("should parse R2_BASE_PREFIX as public domain when it starts with https", () => {
    process.env.R2_ENDPOINT = "https://r2.cloudflarestorage.com";
    process.env.R2_BUCKET = "rarobucket";
    process.env.R2_BASE_PREFIX = "https://pub-abc.r2.dev";

    const env = readEnvironment();
    expect(env.storageKeyPrefix).toBe("");
    expect(env.publicStorageBaseUrl).toBe("https://pub-abc.r2.dev");
  });

  it("should parse R2_BASE_PREFIX as key folder prefix when it is a plain path", () => {
    process.env.R2_ENDPOINT = "https://r2.cloudflarestorage.com";
    process.env.R2_BUCKET = "rarobucket";
    process.env.R2_BASE_PREFIX = "rarotickets/homolog";

    const env = readEnvironment();
    expect(env.storageKeyPrefix).toBe("rarotickets/homolog");
    expect(env.publicStorageBaseUrl).toBe("");
  });

  it("should strip bucket name from R2_ENDPOINT if accidentally included", () => {
    process.env.R2_ENDPOINT = "https://acc.r2.cloudflarestorage.com/rarobucket";
    process.env.R2_BUCKET = "rarobucket";

    const env = readEnvironment();
    expect(env.r2Endpoint).toBe("https://acc.r2.cloudflarestorage.com");
  });

  it("should strip quotes from env values", () => {
    process.env.R2_ENDPOINT = '"https://r2.cloudflarestorage.com"';
    process.env.R2_BUCKET = '"rarobucket"';

    const env = readEnvironment();
    expect(env.r2Endpoint).toBe("https://r2.cloudflarestorage.com");
    expect(env.r2Bucket).toBe("rarobucket");
  });

  it("should use R2_PROJECT_FOLDER to define project folder within bucket", () => {
    process.env.R2_ENDPOINT = "https://r2.cloudflarestorage.com";
    process.env.R2_BUCKET = "rarobucket";
    process.env.R2_PROJECT_FOLDER = "rarotickets";
    process.env.R2_BASE_PREFIX = "";

    const env = readEnvironment();
    expect(env.r2ProjectFolder).toBe("rarotickets");
    expect(env.storageKeyPrefix).toBe("rarotickets");
    expect(env.publicStorageBaseUrl).toBe("");
  });

  it("should combine R2_PROJECT_FOLDER with public domain in R2_BASE_PREFIX", () => {
    process.env.R2_ENDPOINT = "https://r2.cloudflarestorage.com";
    process.env.R2_BUCKET = "rarobucket";
    process.env.R2_PROJECT_FOLDER = "rarotickets";
    process.env.R2_BASE_PREFIX = "https://pub-abc.r2.dev";

    const env = readEnvironment();
    expect(env.r2ProjectFolder).toBe("rarotickets");
    expect(env.storageKeyPrefix).toBe("rarotickets");
    expect(env.publicStorageBaseUrl).toBe("https://pub-abc.r2.dev");
  });
});

