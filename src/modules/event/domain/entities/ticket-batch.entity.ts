import { Entity } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type TicketBatchProps = {
  eventId: string;
  name: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  maxQuantity: number | null;
  priceInMinorUnits: number;
  isActive: boolean;
};
export type CreateTicketBatchParams = TicketBatchProps & { id?: string; now?: Date };
export type BatchAvailabilityParams = { now: Date; committedQuantity: number };
export type ChangeBatchPriceParams = { priceInMinorUnits: number; now: Date };
export type SetBatchActiveParams = { isActive: boolean; now: Date };

export class TicketBatch extends Entity<TicketBatchProps> {
  private constructor(params: EntityConstructorParams<TicketBatchProps>) {
    super(params);
  }

  public static create(params: CreateTicketBatchParams): Result<TicketBatch, ValidationError> {
    const invalid = !params.eventId.trim() || !params.name.trim()
      || params.startsAt.getTime() >= params.endsAt.getTime()
      || !Number.isSafeInteger(params.priceInMinorUnits) || params.priceInMinorUnits < 0
      || (params.maxQuantity !== null && (!Number.isSafeInteger(params.maxQuantity) || params.maxQuantity <= 0));
    if (invalid) {
      return Result.fail(new ValidationError({ code: 'TICKET_BATCH_INVALID', message: 'Os dados, o período, a quantidade ou o preço do lote são inválidos.' }));
    }
    const entityParams: EntityConstructorParams<TicketBatchProps> = {
      props: {
        eventId: params.eventId,
        name: params.name.trim(),
        description: params.description?.trim() || null,
        startsAt: new Date(params.startsAt.getTime()),
        endsAt: new Date(params.endsAt.getTime()),
        maxQuantity: params.maxQuantity,
        priceInMinorUnits: params.priceInMinorUnits,
        isActive: params.isActive,
      },
      ...(params.now ? { createdAt: params.now, updatedAt: params.now } : {}),
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new TicketBatch(entityParams));
  }

  public get eventId(): string { return this.props.eventId; }
  public get name(): string { return this.props.name; }
  public get description(): string | null { return this.props.description; }
  public get startsAt(): Date { return new Date(this.props.startsAt.getTime()); }
  public get endsAt(): Date { return new Date(this.props.endsAt.getTime()); }
  public get maxQuantity(): number | null { return this.props.maxQuantity; }
  public get priceInMinorUnits(): number { return this.props.priceInMinorUnits; }
  public get isActive(): boolean { return this.props.isActive; }

  public isEligible(params: BatchAvailabilityParams): boolean {
    const startsInTime = params.now.getTime() >= this.props.startsAt.getTime();
    const endsInTime = params.now.getTime() <= this.props.endsAt.getTime();
    const hasQuantity = this.props.maxQuantity === null || params.committedQuantity < this.props.maxQuantity;
    return this.props.isActive && startsInTime && endsInTime && hasQuantity;
  }

  public changePrice(params: ChangeBatchPriceParams): Result<void, ValidationError> {
    if (!Number.isSafeInteger(params.priceInMinorUnits) || params.priceInMinorUnits < 0) {
      return Result.fail(new ValidationError({ code: 'TICKET_BATCH_PRICE_INVALID', message: 'O preço do lote deve ser um valor não negativo em centavos.' }));
    }
    this.props.priceInMinorUnits = params.priceInMinorUnits;
    this.touch({ at: params.now });
    return Result.ok();
  }

  public setActive(params: SetBatchActiveParams): void {
    this.props.isActive = params.isActive;
    this.touch({ at: params.now });
  }
}
