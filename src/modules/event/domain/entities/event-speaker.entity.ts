import { Entity } from '@core/domain/entity.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';

export type EventSpeakerProps = {
  eventId: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  institution: string | null;
  orderIndex: number;
};
export type EventSpeakerConstructorParams = EntityConstructorParams<EventSpeakerProps>;
export type ReconstituteEventSpeakerParams = EventSpeakerConstructorParams & {
  id: NonNullable<EventSpeakerConstructorParams['id']>;
};
export type CreateEventSpeakerParams = {
  eventId: string;
  name: string;
  bio?: string | null;
  photoUrl?: string | null;
  institution?: string | null;
  orderIndex?: number;
};

export class EventSpeaker extends Entity<EventSpeakerProps> {
  private constructor(params: EventSpeakerConstructorParams) {
    super(params);
  }

  get eventId(): string { return this.props.eventId; }
  get name(): string { return this.props.name; }
  get bio(): string | null { return this.props.bio; }
  get photoUrl(): string | null { return this.props.photoUrl; }
  get institution(): string | null { return this.props.institution; }
  get orderIndex(): number { return this.props.orderIndex; }

  public static create(params: CreateEventSpeakerParams): Result<EventSpeaker> {
    const name = (params.name ?? '').trim();
    if (name.length < 3) return Result.fail(new Error('Nome do palestrante deve ter ao menos 3 caracteres'));
    if (name.length > 150) return Result.fail(new Error('Nome do palestrante deve ter no máximo 150 caracteres'));

    if (params.photoUrl && !/^https?:\/\/[^\s]+$/i.test(params.photoUrl)) {
      return Result.fail(new Error('URL da foto do palestrante inválida'));
    }
    if (params.bio && params.bio.length > 2000) {
      return Result.fail(new Error('Minibiografia do palestrante deve ter no máximo 2000 caracteres'));
    }

    return Result.ok(new EventSpeaker({
      props: {
        eventId: params.eventId,
        name,
        bio: params.bio?.trim() || null,
        photoUrl: params.photoUrl?.trim() || null,
        institution: params.institution?.trim() || null,
        orderIndex: params.orderIndex ?? 0,
      },
    }));
  }

  public static reconstitute(params: ReconstituteEventSpeakerParams): EventSpeaker {
    return new EventSpeaker(params);
  }
}
