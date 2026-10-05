import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type CouponTypeValue = 'PERCENTUAL' | 'VALOR_FIXO' | 'CORTESIA';
export type CouponTypeProps = { value: CouponTypeValue };

export const COUPON_TYPES: readonly CouponTypeValue[] = ['PERCENTUAL', 'VALOR_FIXO', 'CORTESIA'];

export const COUPON_TYPE_LABELS: Record<CouponTypeValue, string> = {
  PERCENTUAL: 'Percentual',
  VALOR_FIXO: 'Valor fixo',
  CORTESIA: 'Cortesia',
};

export class CouponType extends ValueObject<CouponTypeProps> {
  private constructor(props: CouponTypeProps) { super(props); }

  get value(): CouponTypeValue { return this.props.value; }
  get label(): string { return COUPON_TYPE_LABELS[this.props.value]; }

  public static create(value: string): Result<CouponType> {
    if (!COUPON_TYPES.includes(value as CouponTypeValue)) {
      return Result.fail(new Error('Tipo de cupom inválido'));
    }
    return Result.ok(new CouponType({ value: value as CouponTypeValue }));
  }

  public static reconstitute(value: CouponTypeValue): CouponType {
    return new CouponType({ value });
  }

  public isPercentage(): boolean { return this.props.value === 'PERCENTUAL'; }
  public isFixedValue(): boolean { return this.props.value === 'VALOR_FIXO'; }
  public isCourtesy(): boolean { return this.props.value === 'CORTESIA'; }
}
