import { Result } from '@core/domain/result';
import { normalizeSpaces } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';
import { City } from '@core/domain/value-objects/city.vo';
import { State } from '@core/domain/value-objects/state.vo';

export type EventLocationProps = {
  isOnline: boolean;
  onlineUrl: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
};

export type CreateEventLocationParams = {
  isOnline: boolean;
  onlineUrl?: string | null;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
};

/** Local do evento: presencial (com endereço) ou online (com link) (§2). */
export class EventLocation extends ValueObject<EventLocationProps> {
  private constructor(props: EventLocationProps) {
    super(props);
  }

  get isOnline(): boolean { return this.props.isOnline; }
  get onlineUrl(): string | null { return this.props.onlineUrl; }
  get venueName(): string | null { return this.props.venueName; }
  get address(): string | null { return this.props.address; }
  get city(): string | null { return this.props.city; }
  get state(): string | null { return this.props.state; }

  public static create(params: CreateEventLocationParams): Result<EventLocation> {
    const onlineUrl = params.onlineUrl ? normalizeSpaces(params.onlineUrl) : null;

    if (params.isOnline) {
      if (!onlineUrl || !/^https?:\/\/[^\s]+$/i.test(onlineUrl)) {
        return Result.fail(new Error('Evento online deve informar um link válido'));
      }
      return Result.ok(new EventLocation({
        isOnline: true,
        onlineUrl,
        venueName: null,
        address: null,
        city: params.city ? normalizeSpaces(params.city) : null,
        state: params.state ? normalizeSpaces(params.state).toUpperCase() : null,
      }));
    }

    const venueName = normalizeSpaces(params.venueName ?? '');
    const address = normalizeSpaces(params.address ?? '');
    if (venueName.length < 3) return Result.fail(new Error('Local do evento é obrigatório'));
    if (address.length < 5) return Result.fail(new Error('Endereço do evento é obrigatório'));

    const cityResult = City.create(params.city ?? '');
    if (cityResult.isFailure) return Result.fail(cityResult.error);

    const stateResult = State.create(params.state ?? '');
    if (stateResult.isFailure) return Result.fail(stateResult.error);

    return Result.ok(new EventLocation({
      isOnline: false,
      onlineUrl: null,
      venueName: venueName.slice(0, 150),
      address: address.slice(0, 200),
      city: cityResult.value.value,
      state: stateResult.value.value,
    }));
  }

  public static reconstitute(props: EventLocationProps): EventLocation {
    return new EventLocation(props);
  }

  public get displayName(): string {
    if (this.props.isOnline) return 'Evento online';
    return [this.props.venueName, this.props.city, this.props.state].filter(Boolean).join(' — ');
  }
}
