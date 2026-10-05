import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type CertificateSettingsProps = {
  enabled: boolean;
  text: string | null;
  template: string | null;
  requiresAttendance: boolean;
  minAttendancePct: number;
};

export type CreateCertificateSettingsParams = {
  enabled: boolean;
  text?: string | null;
  template?: string | null;
  requiresAttendance?: boolean;
  minAttendancePct?: number;
};

/** Configuração de emissão de certificados (§30). */
export class CertificateSettings extends ValueObject<CertificateSettingsProps> {
  private constructor(props: CertificateSettingsProps) {
    super(props);
  }

  get enabled(): boolean { return this.props.enabled; }
  get text(): string | null { return this.props.text; }
  get template(): string | null { return this.props.template; }
  get requiresAttendance(): boolean { return this.props.requiresAttendance; }
  get minAttendancePct(): number { return this.props.minAttendancePct; }

  public static create(params: CreateCertificateSettingsParams): Result<CertificateSettings> {
    const minAttendancePct = params.minAttendancePct ?? 100;
    if (minAttendancePct < 0 || minAttendancePct > 100) {
      return Result.fail(new Error('Percentual mínimo de presença deve estar entre 0 e 100'));
    }
    if (params.enabled && params.template && params.template.length > 60) {
      return Result.fail(new Error('Modelo de certificado inválido'));
    }
    return Result.ok(new CertificateSettings({
      enabled: params.enabled,
      text: params.text?.trim() || null,
      template: params.template?.trim() || 'PADRAO',
      requiresAttendance: params.requiresAttendance ?? true,
      minAttendancePct,
    }));
  }

  public static reconstitute(props: CertificateSettingsProps): CertificateSettings {
    return new CertificateSettings(props);
  }

  public static disabled(): CertificateSettings {
    return new CertificateSettings({
      enabled: false,
      text: null,
      template: null,
      requiresAttendance: true,
      minAttendancePct: 100,
    });
  }
}
