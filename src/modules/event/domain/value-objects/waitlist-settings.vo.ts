import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type WaitlistSettingsProps = { enabled: boolean; autoPromote: boolean };

/** Lista de espera (§26) — promoção inicialmente manual, preparada para automatizar. */
export class WaitlistSettings extends ValueObject<WaitlistSettingsProps> {
  private constructor(props: WaitlistSettingsProps) {
    super(props);
  }

  get enabled(): boolean { return this.props.enabled; }
  get autoPromote(): boolean { return this.props.autoPromote; }

  public static create(params: { enabled: boolean; autoPromote?: boolean }): Result<WaitlistSettings> {
    if (params.autoPromote && !params.enabled) {
      return Result.fail(new Error('Promoção automática exige a lista de espera habilitada'));
    }
    return Result.ok(new WaitlistSettings({ enabled: params.enabled, autoPromote: params.autoPromote ?? false }));
  }

  public static reconstitute(props: WaitlistSettingsProps): WaitlistSettings {
    return new WaitlistSettings(props);
  }

  public static disabled(): WaitlistSettings {
    return new WaitlistSettings({ enabled: false, autoPromote: false });
  }
}
