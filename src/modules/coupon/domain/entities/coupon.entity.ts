import { AggregateRoot } from '@core/domain/aggregate-root.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { CouponCode } from '../value-objects/coupon-code.vo';
import { CouponType } from '../value-objects/coupon-type.vo';

export type CouponProps = {
  eventId: string;
  code: CouponCode;
  type: CouponType;
  value: number;
  maxUses: number;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdBy: string | null;
};

export type CouponConstructorParams = EntityConstructorParams<CouponProps>;
export type ReconstituteCouponParams = CouponConstructorParams & { id: NonNullable<CouponConstructorParams['id']> };

export type CreateCouponParams = {
  eventId: string;
  code: string;
  type: string;
  value: number;
  maxUses: number;
  startDate: Date;
  endDate: Date;
  isActive?: boolean;
  createdBy?: string | null;
};

/** Cupom de desconto/cortesia por evento (§25). */
export class Coupon extends AggregateRoot<CouponProps> {
  private constructor(params: CouponConstructorParams) { super(params); }

  get eventId(): string { return this.props.eventId; }
  get code(): CouponCode { return this.props.code; }
  get type(): CouponType { return this.props.type; }
  get value(): number { return this.props.value; }
  get maxUses(): number { return this.props.maxUses; }
  get usedCount(): number { return this.props.usedCount; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get isActive(): boolean { return this.props.isActive; }
  get createdBy(): string | null { return this.props.createdBy; }

  public static create(params: CreateCouponParams): Result<Coupon> {
    const codeResult = CouponCode.create(params.code);
    if (codeResult.isFailure) return Result.fail(codeResult.error);

    const typeResult = CouponType.create(params.type);
    if (typeResult.isFailure) return Result.fail(typeResult.error);
    const type = typeResult.value;

    if (!Number.isInteger(params.maxUses) || params.maxUses <= 0) {
      return Result.fail(new Error('Quantidade máxima de usos do cupom deve ser maior que zero'));
    }
    if (params.endDate.getTime() <= params.startDate.getTime()) {
      return Result.fail(new Error('Período do cupom inválido: o fim deve ser posterior ao início'));
    }
    if (type.isPercentage() && (params.value <= 0 || params.value > 100)) {
      return Result.fail(new Error('Percentual do cupom deve estar entre 0 e 100'));
    }
    if (type.isFixedValue() && params.value <= 0) {
      return Result.fail(new Error('Valor do cupom deve ser maior que zero'));
    }

    return Result.ok(new Coupon({
      props: {
        eventId: params.eventId,
        code: codeResult.value,
        type,
        value: params.value,
        maxUses: params.maxUses,
        usedCount: 0,
        startDate: params.startDate,
        endDate: params.endDate,
        isActive: params.isActive ?? true,
        createdBy: params.createdBy ?? null,
      },
    }));
  }

  public static reconstitute(params: ReconstituteCouponParams): Coupon {
    return new Coupon(params);
  }

  public isWithinPeriod(at: Date): boolean {
    return at.getTime() >= this.props.startDate.getTime() && at.getTime() <= this.props.endDate.getTime();
  }

  public hasAvailableUses(): boolean {
    return this.props.usedCount < this.props.maxUses;
  }

  public isApplicable(at: Date): boolean {
    return this.props.isActive && this.isWithinPeriod(at) && (this.type.isCourtesy() || this.hasAvailableUses());
  }

  public reserveUse(): Result<void> {
    if (!this.props.isActive) return Result.fail(new Error('Cupom inativo'));
    if (!this.hasAvailableUses()) return Result.fail(new Error('Cupom esgotado'));
    this.props.usedCount += 1;
    this.touch();
    return Result.ok();
  }

  public releaseUse(): Result<void> {
    if (this.props.usedCount <= 0) return Result.fail(new Error('Cupom não possui usos a devolver'));
    this.props.usedCount -= 1;
    this.touch();
    return Result.ok();
  }

  public deactivate(): Result<void> {
    if (!this.props.isActive) return Result.fail(new Error('Cupom já está inativo'));
    this.props.isActive = false;
    this.touch();
    return Result.ok();
  }

  public changeDetails(params: {
    value?: number;
    maxUses?: number;
    startDate?: Date;
    endDate?: Date;
    isActive?: boolean;
  }): Result<void> {
    const startDate = params.startDate ?? this.props.startDate;
    const endDate = params.endDate ?? this.props.endDate;
    if (endDate.getTime() <= startDate.getTime()) {
      return Result.fail(new Error('Período do cupom inválido: o fim deve ser posterior ao início'));
    }
    if (params.maxUses !== undefined && params.maxUses < this.props.usedCount) {
      return Result.fail(new Error('Quantidade máxima de usos não pode ser menor que os usos já realizados'));
    }
    if (params.value !== undefined) {
      if (this.type.isPercentage() && (params.value <= 0 || params.value > 100)) {
        return Result.fail(new Error('Percentual do cupom deve estar entre 0 e 100'));
      }
      if (this.type.isFixedValue() && params.value <= 0) {
        return Result.fail(new Error('Valor do cupom deve ser maior que zero'));
      }
      this.props.value = params.value;
    }
    if (params.maxUses !== undefined) this.props.maxUses = params.maxUses;
    this.props.startDate = startDate;
    this.props.endDate = endDate;
    if (params.isActive !== undefined) this.props.isActive = params.isActive;
    this.touch();
    return Result.ok();
  }
}
