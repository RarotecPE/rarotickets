import { NextResponse } from "next/server";
import type { AuthFailure } from "@/server/auth/auth.errors";

export type ApiErrorBody = { code: string; message: string; details?: unknown };
export type ResultFailureParams = { error: Error; status?: number };
export type ApiSuccessBody<Value> = { data: Value; meta?: Record<string, unknown> };
export type ApiFailureBody = { error: ApiErrorBody };

export function jsonSuccess<Value>(data: Value, status = 200, meta?: Record<string, unknown>): NextResponse<ApiSuccessBody<Value>> {
  return NextResponse.json({ data, ...(meta ? { meta } : {}) }, { status, headers: { "Cache-Control": "no-store" } });
}

export function jsonError(params: ApiErrorParams): NextResponse<ApiFailureBody> {
  return NextResponse.json({ error: { code: params.code, message: params.message, ...(params.details !== undefined ? { details: params.details } : {}) } }, {
    status: params.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export type ApiErrorParams = { code: string; message: string; status: number; details?: unknown };

export function resultFailureResponse(params: ResultFailureParams): NextResponse<ApiFailureBody> {
  const domainCode = "code" in params.error && typeof params.error.code === "string" ? params.error.code : "BUSINESS_RULE_REJECTED";
  const details = "details" in params.error ? params.error.details : undefined;
  return jsonError({ code: domainCode, message: params.error.message, status: params.status ?? 422, details });
}

export function internalErrorResponse(error: unknown): NextResponse<ApiFailureBody> {
  console.error("[InternalError]", error);
  const rawMessage = error instanceof Error ? error.message : "";
  const isDatabaseOrRawQuery =
    rawMessage.includes("Failed query") ||
    rawMessage.includes("ECONNRESET") ||
    rawMessage.includes("ECONNREFUSED") ||
    rawMessage.includes("syntax error");

  const message = isDatabaseOrRawQuery
    ? "Não foi possível processar as informações no momento. Tente novamente mais tarde."
    : process.env.NODE_ENV === "production"
      ? "Ocorreu um erro interno. Tente novamente."
      : rawMessage || "Falha interna.";

  const details = process.env.NODE_ENV !== "production" && rawMessage ? { technicalMessage: rawMessage } : undefined;
  return jsonError({ code: "INTERNAL_ERROR", message, status: 500, details });
}

export function authErrorResponse(error: AuthFailure): NextResponse<ApiFailureBody> {
  return jsonError({ code: error.code, message: error.message, status: error.httpStatus });
}

export function parseJsonObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
