import { Entity } from '../../../../@core/domain/entity.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type CouponDiscountType = 'PERCENTUAL' | 'VALOR_FIXO' | 'CORTESIA';
export type CouponProps = {
  eventId: string;
  code: string;
  type: CouponDiscountType;
  value: number;
  maxUses: number | null;
  usedUses: number;
  startsAt: Date;
  endsAt: Date;
  isActive: boolean;
};
export type CreateCouponParams = CouponProps & { id?: string; now?: Date };
export type ApplyCouponParams = { eventId: string; baseAmountInMinorUnits: number; usedUses: number; now: Date };
export type CouponApplication = {
  couponId: string;
  code: string;
  type: CouponDiscountType;
  value: number;
  discountAmountInMinorUnits: number;
  finalAmountInMinorUnits: number;
};
export type RecordCouponUsageParams = { now: Date };
export type CouponUsabilityParams = { eventId: string; usedUses: number; now: Date };

export class Coupon extends Entity<CouponProps> {
  private constructor(params: EntityConstructorParams<CouponProps>) {
    super(params);
  }

  public static create(params: CreateCouponParams): Result<Coupon, ValidationError> {
    const error = this.validate(params);
    if (error) return Result.fail(error);
    const entityParams: EntityConstructorParams<CouponProps> = {
      props: {
        eventId: params.eventId,
        code: params.code.trim().toUpperCase(),
        type: params.type,
        value: params.value,
        maxUses: params.maxUses,
        usedUses: params.usedUses,
        startsAt: new Date(params.startsAt.getTime()),
        endsAt: new Date(params.endsAt.getTime()),
        isActive: params.isActive,
      },
      ...(params.now ? { createdAt: params.now, updatedAt: params.now } : {}),
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new Coupon(entityParams));
  }

  public get eventId(): string { return this.props.eventId; }
  public get code(): string { return this.props.code; }
  public get type(): CouponDiscountType { return this.props.type; }
  public get value(): number { return this.props.value; }
  public get maxUses(): number | null { return this.props.maxUses; }
  public get usedUses(): number { return this.props.usedUses; }
  public get startsAt(): Date { return new Date(this.props.startsAt.getTime()); }
  public get endsAt(): Date { return new Date(this.props.endsAt.getTime()); }
  public get isActive(): boolean { return this.props.isActive; }

  public apply(params: ApplyCouponParams): Result<CouponApplication, ValidationError> {
    const error = this.checkUsability({ eventId: params.eventId, usedUses: params.usedUses, now: params.now });
    if (error) return Result.fail(error);
    if (!Number.isSafeInteger(params.baseAmountInMinorUnits) || params.baseAmountInMinorUnits < 0) {
      return Result.fail(new ValidationError({ code: 'COUPON_BASE_AMOUNT_INVALID', message: 'O valor original da inscrição é inválido.' }));
    }
    const discountAmountInMinorUnits = this.calculateDiscount(params.baseAmountInMinorUnits);
    return Result.ok({
      couponId: this.id.toString(),
      code: this.props.code,
      type: this.props.type,
      value: this.props.value,
      discountAmountInMinorUnits,
      finalAmountInMinorUnits: params.baseAmountInMinorUnits - discountAmountInMinorUnits,
    });
  }

  public recordUsage(params: RecordCouponUsageParams): Result<void, ValidationError> {
    const error = this.checkUsability({ eventId: this.props.eventId, usedUses: this.props.usedUses, now: params.now });
    if (error) return Result.fail(error);
    this.props.usedUses += 1;
    this.touch({ at: params.now });
    return Result.ok();
  }

  private calculateDiscount(baseAmountInMinorUnits: number): number {
    if (this.props.type === 'CORTESIA') return baseAmountInMinorUnits;
    if (this.props.type === 'VALOR_FIXO') return Math.min(baseAmountInMinorUnits, this.props.value);
    return Math.min(baseAmountInMinorUnits, Math.round(baseAmountInMinorUnits * this.props.value / 100));
  }

  private checkUsability(params: CouponUsabilityParams): ValidationError | null {
    if (params.eventId !== this.props.eventId) {
      return new ValidationError({ code: 'COUPON_WRONG_EVENT', message: 'O cupom não pertence a este evento.' });
    }
    if (!this.props.isActive || params.now.getTime() < this.props.startsAt.getTime()
      || params.now.getTime() > this.props.endsAt.getTime()) {
      return new ValidationError({ code: 'COUPON_NOT_VALID', message: 'O cupom não está ativo ou está fora do período de validade.' });
    }
    if (this.props.maxUses !== null && params.usedUses >= this.props.maxUses) {
      return new ValidationError({ code: 'COUPON_USAGE_LIMIT_REACHED', message: 'O limite de utilizações do cupom foi atingido.' });
    }
    return null;
  }

  private static validate(params: CreateCouponParams): ValidationError | null {
    if (!params.eventId.trim() || !params.code.trim() || params.startsAt.getTime() > params.endsAt.getTime()) {
      return new ValidationError({ code: 'COUPON_INVALID', message: 'O cupom deve possuir evento, código e período válidos.' });
    }
    if (!Number.isSafeInteger(params.usedUses) || params.usedUses < 0
      || (params.maxUses !== null && (!Number.isSafeInteger(params.maxUses) || params.maxUses <= 0))) {
      return new ValidationError({ code: 'COUPON_USAGE_INVALID', message: 'A quantidade de utilizações do cupom é inválida.' });
    }
    if (params.type === 'PERCENTUAL' && (!Number.isFinite(params.value) || params.value <= 0 || params.value > 100)) {
      return new ValidationError({ code: 'COUPON_PERCENTAGE_INVALID', message: 'O percentual do cupom deve ser maior que zero e menor ou igual a 100.' });
    }
    if (params.type === 'VALOR_FIXO' && (!Number.isSafeInteger(params.value) || params.value <= 0)) {
      return new ValidationError({ code: 'COUPON_AMOUNT_INVALID', message: 'O valor fixo do cupom deve ser positivo e expresso em centavos.' });
    }
    if (params.type === 'CORTESIA' && params.value !== 0) {
      return new ValidationError({ code: 'COUPON_COURTESY_VALUE_INVALID', message: 'Cupons de cortesia não recebem um valor numérico.' });
    }
    return null;
  }
}
