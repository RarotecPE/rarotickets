import { Entity, EntityConstructorParams } from "@/@core/domain/entity.base";
import { Identifier } from "@/@core/domain/identifier";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";
import { CouponCode } from "../value-objects/coupon-code.vo";

export type CouponDiscountType = "percentual" | "valor_fixo";

export type CouponProps = {
  eventId: string;
  lotId: string;
  code: CouponCode;
  type: CouponDiscountType;
  discountValue: number; // percentage (1-100) or fixed amount in cents
  maxUses: number | null;
  usedCount: number;
  startAt: Date;
  endAt: Date;
  active: boolean;
  allowedEmails: string[];
  allowedCpfs: string[];
};

export class CouponRuleError extends DomainError {
  constructor(params: { code: string; message: string }) {
    super(params);
  }
}

export class CouponUnavailableError extends DomainError {
  constructor(message = "Cupom não disponível.") {
    super({ code: "COUPON_UNAVAILABLE", message });
  }
}

export type CreateCouponParams = {
  id?: Identifier | string;
  eventId: string;
  lotId: string;
  code: string | CouponCode;
  type: CouponDiscountType;
  discountValue: number;
  maxUses?: number | null;
  usedCount?: number;
  startAt: Date;
  endAt: Date;
  active?: boolean;
  allowedEmails?: string[];
  allowedCpfs?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

export class Coupon extends Entity<CouponProps> {
  private constructor(params: EntityConstructorParams<CouponProps>) {
    super(params);
  }

  get eventId(): string {
    return this.props.eventId;
  }

  get lotId(): string {
    return this.props.lotId;
  }

  get code(): string {
    return this.props.code.value;
  }

  get codeVO(): CouponCode {
    return this.props.code;
  }

  get type(): CouponDiscountType {
    return this.props.type;
  }

  get discountValue(): number {
    return this.props.discountValue;
  }

  get maxUses(): number | null {
    return this.props.maxUses;
  }

  get usedCount(): number {
    return this.props.usedCount;
  }

  get startAt(): Date {
    return new Date(this.props.startAt.getTime());
  }

  get endAt(): Date {
    return new Date(this.props.endAt.getTime());
  }

  get active(): boolean {
    return this.props.active;
  }

  get allowedEmails(): string[] {
    return [...this.props.allowedEmails];
  }

  get allowedCpfs(): string[] {
    return [...this.props.allowedCpfs];
  }

  static create(params: CreateCouponParams): Result<Coupon, DomainError> {
    const codeResult: Result<CouponCode, DomainError> =
      params.code instanceof CouponCode
        ? Result.ok<CouponCode, DomainError>(params.code)
        : CouponCode.create(params.code);
    if (codeResult.isFailure) {
      return Result.fail(codeResult.error);
    }

    if (params.type === "percentual") {
      if (params.discountValue < 1 || params.discountValue > 100) {
        return Result.fail(
          new CouponRuleError({
            code: "INVALID_DISCOUNT_PERCENT",
            message: "O desconto percentual deve estar entre 1% e 100%.",
          })
        );
      }
    } else if (params.type === "valor_fixo") {
      if (params.discountValue <= 0) {
        return Result.fail(
          new CouponRuleError({
            code: "INVALID_DISCOUNT_VALUE",
            message: "O valor fixo do desconto deve ser maior que zero.",
          })
        );
      }
    } else {
      return Result.fail(
        new CouponRuleError({
          code: "INVALID_COUPON_TYPE",
          message: "Tipo de desconto inválido.",
        })
      );
    }

    if (params.endAt.getTime() <= params.startAt.getTime()) {
      return Result.fail(
        new CouponRuleError({
          code: "INVALID_COUPON_DATES",
          message: "A data de expiração do cupom deve ser posterior à data de início.",
        })
      );
    }

    if (params.maxUses !== undefined && params.maxUses !== null && params.maxUses <= 0) {
      return Result.fail(
        new CouponRuleError({
          code: "INVALID_MAX_USES",
          message: "A quantidade máxima de usos deve ser maior que zero.",
        })
      );
    }

    const cleanEmails = (params.allowedEmails ?? [])
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const cleanCpfs = (params.allowedCpfs ?? [])
      .map((c) => c.replace(/\D/g, ""))
      .filter((c) => c.length === 11);

    const couponId =
      params.id instanceof Identifier
        ? params.id
        : Identifier.fromExisting(params.id ?? crypto.randomUUID());

    const now = new Date();
    return Result.ok(
      new Coupon({
        id: couponId,
        props: {
          eventId: params.eventId,
          lotId: params.lotId,
          code: codeResult.value,
          type: params.type,
          discountValue: params.discountValue,
          maxUses: params.maxUses ?? null,
          usedCount: params.usedCount ?? 0,
          startAt: new Date(params.startAt.getTime()),
          endAt: new Date(params.endAt.getTime()),
          active: params.active ?? true,
          allowedEmails: cleanEmails,
          allowedCpfs: cleanCpfs,
        },
        createdAt: params.createdAt ?? now,
        updatedAt: params.updatedAt ?? now,
      })
    );
  }

  validateForLot(lot: { priceCents: number; startAt: Date; endAt: Date }): Result<void, CouponRuleError> {
    if (this.props.type === "valor_fixo" && this.props.discountValue > lot.priceCents) {
      return Result.fail(
        new CouponRuleError({
          code: "COUPON_EXCEEDS_LOT_PRICE",
          message: `O valor do desconto (R$ ${(this.props.discountValue / 100).toFixed(2)}) não pode exceder o valor do lote (R$ ${(lot.priceCents / 100).toFixed(2)}).`,
        })
      );
    }

    if (this.props.startAt.getTime() < lot.startAt.getTime()) {
      return Result.fail(
        new CouponRuleError({
          code: "COUPON_START_BEFORE_LOT",
          message: "A data de início do cupom não pode ser anterior à data de início do lote.",
        })
      );
    }

    if (this.props.endAt.getTime() > lot.endAt.getTime()) {
      return Result.fail(
        new CouponRuleError({
          code: "COUPON_END_AFTER_LOT",
          message: "A data de expiração do cupom não pode ser posterior à data de término do lote.",
        })
      );
    }

    return Result.ok(undefined);
  }

  canBeUsedBy(participant: { email: string; cpf?: string | null }): boolean {
    const hasEmailRestrictions = this.props.allowedEmails.length > 0;
    const hasCpfRestrictions = this.props.allowedCpfs.length > 0;

    // If no restrictions defined, any participant can use it
    if (!hasEmailRestrictions && !hasCpfRestrictions) {
      return true;
    }

    const participantEmail = participant.email.trim().toLowerCase();
    const participantCpf = participant.cpf ? participant.cpf.replace(/\D/g, "") : null;

    if (hasEmailRestrictions && this.props.allowedEmails.includes(participantEmail)) {
      return true;
    }

    if (hasCpfRestrictions && participantCpf && this.props.allowedCpfs.includes(participantCpf)) {
      return true;
    }

    return false;
  }

  isAvailable(at: Date, heldCount: number = 0): boolean {
    if (!this.props.active) {
      return false;
    }

    const time = at.getTime();
    if (time < this.props.startAt.getTime() || time > this.props.endAt.getTime()) {
      return false;
    }

    if (this.props.maxUses !== null && this.props.usedCount + heldCount >= this.props.maxUses) {
      return false;
    }

    return true;
  }

  calculateDiscount(lotPriceCents: number): number {
    if (lotPriceCents <= 0) return 0;

    if (this.props.type === "percentual") {
      const discount = Math.round((lotPriceCents * this.props.discountValue) / 100);
      return Math.min(lotPriceCents, Math.max(0, discount));
    }

    return Math.min(lotPriceCents, Math.max(0, Math.round(this.props.discountValue)));
  }
}
