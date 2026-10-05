import { Entity } from '@core/domain/entity.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { MoneyVO } from '@core/domain/value-objects/money.vo';

export type EventLoteProps = {
  eventId: string;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  maxQuantity: number;
  price: MoneyVO;
  isActive: boolean;
  orderIndex: number;
  /** Quantidade já utilizada — derivada das inscrições, nunca editada aqui. */
  soldQuantity: number;
};
export type EventLoteConstructorParams = EntityConstructorParams<EventLoteProps>;
export type ReconstituteEventLoteParams = EventLoteConstructorParams & {
  id: NonNullable<EventLoteConstructorParams['id']>;
};
export type CreateEventLoteParams = {
  eventId: string;
  name: string;
  description?: string | null;
  startDate: Date;
  endDate: Date;
  maxQuantity: number;
  priceCents: number;
  isActive?: boolean;
  orderIndex?: number;
};
export type UpdateEventLoteParams = {
  name?: string;
  description?: string | null;
  startDate?: Date;
  endDate?: Date;
  maxQuantity?: number;
  priceCents?: number;
  isActive?: boolean;
  orderIndex?: number;
};

/** Lote de inscrição de evento pago (§5). */
export class EventLote extends Entity<EventLoteProps> {
  private constructor(params: EventLoteConstructorParams) {
    super(params);
  }

  get eventId(): string { return this.props.eventId; }
  get name(): string { return this.props.name; }
  get description(): string | null { return this.props.description; }
  get startDate(): Date { return this.props.startDate; }
  get endDate(): Date { return this.props.endDate; }
  get maxQuantity(): number { return this.props.maxQuantity; }
  get price(): MoneyVO { return this.props.price; }
  get isActive(): boolean { return this.props.isActive; }
  get orderIndex(): number { return this.props.orderIndex; }
  get soldQuantity(): number { return this.props.soldQuantity; }

  public static create(params: CreateEventLoteParams): Result<EventLote> {
    if (!params.eventId) return Result.fail(new Error('Lote deve pertencer a um evento'));

    const name = (params.name ?? '').trim();
    if (name.length < 3) return Result.fail(new Error('Nome do lote deve ter ao menos 3 caracteres'));
    if (name.length > 80) return Result.fail(new Error('Nome do lote deve ter no máximo 80 caracteres'));

    if (!Number.isInteger(params.maxQuantity) || params.maxQuantity <= 0) {
      return Result.fail(new Error('Quantidade máxima do lote deve ser maior que zero'));
    }
    if (Number.isNaN(params.startDate?.getTime?.()) || Number.isNaN(params.endDate?.getTime?.())) {
      return Result.fail(new Error('Período do lote inválido'));
    }
    if (params.endDate.getTime() <= params.startDate.getTime()) {
      return Result.fail(new Error('Fim do lote deve ser posterior ao início'));
    }

    const priceResult = MoneyVO.create({ cents: params.priceCents });
    if (priceResult.isFailure) return Result.fail(priceResult.error);

    return Result.ok(new EventLote({
      props: {
        eventId: params.eventId,
        name,
        description: params.description?.trim() || null,
        startDate: params.startDate,
        endDate: params.endDate,
        maxQuantity: params.maxQuantity,
        price: priceResult.value,
        isActive: params.isActive ?? true,
        orderIndex: params.orderIndex ?? 0,
        soldQuantity: 0,
      },
    }));
  }

  public static reconstitute(params: ReconstituteEventLoteParams): EventLote {
    return new EventLote(params);
  }

  public update(params: UpdateEventLoteParams): Result<void> {
    if (params.name !== undefined) {
      const name = params.name.trim();
      if (name.length < 3) return Result.fail(new Error('Nome do lote deve ter ao menos 3 caracteres'));
      this.props.name = name;
    }
    if (params.description !== undefined) this.props.description = params.description?.trim() || null;

    const startDate = params.startDate ?? this.props.startDate;
    const endDate = params.endDate ?? this.props.endDate;
    if (endDate.getTime() <= startDate.getTime()) {
      return Result.fail(new Error('Fim do lote deve ser posterior ao início'));
    }
    this.props.startDate = startDate;
    this.props.endDate = endDate;

    if (params.maxQuantity !== undefined) {
      if (!Number.isInteger(params.maxQuantity) || params.maxQuantity <= 0) {
        return Result.fail(new Error('Quantidade máxima do lote deve ser maior que zero'));
      }
      if (params.maxQuantity < this.props.soldQuantity) {
        return Result.fail(new Error('Quantidade máxima não pode ser menor que a quantidade já utilizada'));
      }
      this.props.maxQuantity = params.maxQuantity;
    }

    if (params.priceCents !== undefined) {
      const priceResult = MoneyVO.create({ cents: params.priceCents });
      if (priceResult.isFailure) return Result.fail(priceResult.error);
      this.props.price = priceResult.value;
    }

    if (params.isActive !== undefined) this.props.isActive = params.isActive;
    if (params.orderIndex !== undefined) this.props.orderIndex = params.orderIndex;

    this.touch();
    return Result.ok();
  }

  public activate(): void {
    this.props.isActive = true;
    this.touch();
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.touch();
  }

  public availableQuantity(): number {
    return Math.max(this.props.maxQuantity - this.props.soldQuantity, 0);
  }

  public isWithinPeriod(at: Date): boolean {
    return at.getTime() >= this.props.startDate.getTime() && at.getTime() <= this.props.endDate.getTime();
  }

  /** Lote vigente: ativo, dentro do período e com quantidade disponível. */
  public isElegibleAt(at: Date): boolean {
    return this.props.isActive && this.isWithinPeriod(at) && this.availableQuantity() > 0;
  }

  public isExhausted(): boolean {
    return this.availableQuantity() === 0;
  }
}
