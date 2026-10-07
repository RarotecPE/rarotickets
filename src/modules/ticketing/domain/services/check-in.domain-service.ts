import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type CheckInEligibilityParams = {
  registrationStatus: string;
  eventStatus: string;
  eventDayMatches: boolean;
  at: Date;
  alreadyCheckedIn: boolean;
  supervisorReentry: boolean;
  justification?: string;
};
export type CheckInEligibility = { type: "normal" | "reentrada_autorizada" };

export class CheckInRuleError extends DomainError {
  constructor(params: CheckInRuleErrorParams) { super(params); }
}
export type CheckInRuleErrorParams = { code: string; message: string };

export class CheckInDomainService extends DomainService<CheckInEligibilityParams, CheckInEligibility> {
  execute(params: CheckInEligibilityParams): Result<CheckInEligibility, CheckInRuleError> {
    if (params.registrationStatus !== "confirmada") return Result.fail(new CheckInRuleError({ code: "REGISTRATION_NOT_CONFIRMED", message: "A inscrição ainda não está confirmada." }));
    const allowedStatus = params.eventStatus === "em_andamento";
    if (!allowedStatus && !params.eventDayMatches) return Result.fail(new CheckInRuleError({ code: "CHECKIN_OUTSIDE_EVENT", message: "O check-in só pode ser realizado durante o evento." }));
    if (params.alreadyCheckedIn && !params.supervisorReentry) return Result.fail(new CheckInRuleError({ code: "CHECKIN_DUPLICATE", message: "Check-in já realizado para esta inscrição." }));
    if (params.alreadyCheckedIn && params.supervisorReentry && !params.justification?.trim()) return Result.fail(new CheckInRuleError({ code: "REENTRY_JUSTIFICATION_REQUIRED", message: "Informe a justificativa para autorizar a reentrada." }));
    return Result.ok({ type: params.alreadyCheckedIn ? "reentrada_autorizada" : "normal" });
  }
}

