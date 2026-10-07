import type { NextRequest } from "next/server";

export type ReadValueParams = { value: unknown; fallback?: string };
export type ReadBooleanParams = { value: unknown; fallback?: boolean };
export type ReadIntegerParams = { value: unknown; fallback: number };
export type ReadDateParams = { value: unknown; fallback?: Date };
export type ReadArrayParams = { value: unknown };
export type PaginationValues = { page: number; pageSize: number };
export type ClampParams = { value: number; minimum: number; maximum: number };

export function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readText(params: ReadValueParams): string {
  return typeof params.value === "string" ? params.value.trim() : params.fallback ?? "";
}

export function readOptionalText(params: ReadArrayParams): string | null {
  const normalized = readText({ value: params.value });
  return normalized || null;
}

export function readBoolean(params: ReadBooleanParams): boolean {
  return typeof params.value === "boolean" ? params.value : params.fallback ?? false;
}

export function readInteger(params: ReadIntegerParams): number {
  const parsed = typeof params.value === "number" ? params.value : Number(params.value);
  return Number.isInteger(parsed) ? parsed : params.fallback;
}

export function readDate(params: ReadDateParams): Date | null {
  if (params.value instanceof Date && !Number.isNaN(params.value.getTime())) return params.value;
  if (typeof params.value !== "string" && typeof params.value !== "number") return params.fallback ?? null;
  const date = new Date(params.value);
  return Number.isNaN(date.getTime()) ? params.fallback ?? null : date;
}

export function readObject(value: unknown): Record<string, unknown> {
  return isJsonRecord(value) ? value : {};
}

export function readStringArray(params: ReadArrayParams): string[] {
  return Array.isArray(params.value) ? params.value.filter((item): item is string => typeof item === "string") : [];
}

export function readPagination(params: URLSearchParams): PaginationValues {
  return {
    page: clamp({ value: readInteger({ value: params.get("page"), fallback: 1 }), minimum: 1, maximum: 100_000 }),
    pageSize: clamp({ value: readInteger({ value: params.get("pageSize"), fallback: 20 }), minimum: 1, maximum: 100 }),
  };
}

export function getClientIp(request: NextRequest): string | null {
  const forwardedHeader = request.headers.get("x-forwarded-for");
  const forwarded = forwardedHeader ? forwardedHeader.split(",")[0]?.trim() : "";
  return forwarded || request.headers.get("x-real-ip") || null;
}

export function clamp(params: ClampParams): number {
  return Math.min(Math.max(params.value, params.minimum), params.maximum);
}
