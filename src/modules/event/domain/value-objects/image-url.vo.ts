import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type ImageUrlProps = { value: string | null };

export class ImageUrl extends ValueObject<ImageUrlProps> {
  private constructor(props: ImageUrlProps) {
    super(props);
  }

  get value(): string | null {
    return this.props.value;
  }

  public static create(value?: string | null): Result<ImageUrl> {
    const normalized = (value ?? '').trim();
    if (!normalized) return Result.ok(new ImageUrl({ value: null }));
    if (normalized.length > 500) return Result.fail(new Error('URL da imagem muito longa'));
    if (!/^(https?:\/\/|\/)[^\s]+$/i.test(normalized)) {
      return Result.fail(new Error('URL da imagem de divulgação inválida'));
    }
    return Result.ok(new ImageUrl({ value: normalized }));
  }

  public static reconstitute(value: string | null): ImageUrl {
    return new ImageUrl({ value });
  }
}
