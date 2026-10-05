import { Entity } from '@core/domain/entity.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';

export type EventActivityProps = {
  eventId: string;
  speakerId: string | null;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  room: string | null;
  orderIndex: number;
};
export type EventActivityConstructorParams = EntityConstructorParams<EventActivityProps>;
export type ReconstituteEventActivityParams = EventActivityConstructorParams & {
  id: NonNullable<EventActivityConstructorParams['id']>;
};
export type CreateEventActivityParams = {
  eventId: string;
  speakerId?: string | null;
  title: string;
  description?: string | null;
  startAt: Date | string;
  endAt: Date | string;
  room?: string | null;
  orderIndex?: number;
};

/** Atividade da programação do evento (§31). */
export class EventActivity extends Entity<EventActivityProps> {
  private constructor(params: EventActivityConstructorParams) {
    super(params);
  }

  get eventId(): string { return this.props.eventId; }
  get speakerId(): string | null { return this.props.speakerId; }
  get title(): string { return this.props.title; }
  get description(): string | null { return this.props.description; }
  get startAt(): Date { return this.props.startAt; }
  get endAt(): Date { return this.props.endAt; }
  get room(): string | null { return this.props.room; }
  get orderIndex(): number { return this.props.orderIndex; }

  public static create(params: CreateEventActivityParams): Result<EventActivity> {
    const title = (params.title ?? '').trim();
    if (title.length < 3) return Result.fail(new Error('Título da atividade deve ter ao menos 3 caracteres'));
    if (title.length > 150) return Result.fail(new Error('Título da atividade deve ter no máximo 150 caracteres'));

    const startAt = params.startAt instanceof Date ? params.startAt : new Date(params.startAt);
    const endAt = params.endAt instanceof Date ? params.endAt : new Date(params.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return Result.fail(new Error('Horário da atividade inválido'));
    }
    if (endAt.getTime() < startAt.getTime()) {
      return Result.fail(new Error('Término da atividade não pode ser anterior ao início'));
    }

    return Result.ok(new EventActivity({
      props: {
        eventId: params.eventId,
        speakerId: params.speakerId ?? null,
        title,
        description: params.description?.trim() || null,
        startAt,
        endAt,
        room: params.room?.trim() || null,
        orderIndex: params.orderIndex ?? 0,
      },
    }));
  }

  public static reconstitute(params: ReconstituteEventActivityParams): EventActivity {
    return new EventActivity(params);
  }
}
