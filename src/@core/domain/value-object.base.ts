export type ValueObjectEqualsParams<Props> = { vo?: ValueObject<Props> };

/** Value Objects são imutáveis e definidos por seus atributos (sem identidade). */
export abstract class ValueObject<Props> {
  protected readonly props: Props;

  protected constructor(props: Props) {
    this.props = Object.freeze(props);
  }

  public equals({ vo }: ValueObjectEqualsParams<Props>): boolean {
    if (!vo) return false;
    return JSON.stringify(this.props) === JSON.stringify(vo.props);
  }
}
