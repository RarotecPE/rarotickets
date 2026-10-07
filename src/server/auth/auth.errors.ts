import { DomainError } from "@/@core/domain/errors/domain-error.base";
import type { AuthFailureParams } from "./auth.types";

export class AuthFailure extends DomainError {
  readonly kind: AuthFailureParams["kind"];
  readonly httpStatus: AuthFailureParams["httpStatus"];

  constructor(params: AuthFailureParams) {
    super({ code: params.code, message: params.message });
    this.kind = params.kind;
    this.httpStatus = params.httpStatus;
  }
}
