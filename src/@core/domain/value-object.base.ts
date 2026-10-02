export type ValueObjectEqualsParams<Props> = { vo?: ValueObject<Props> };

export abstract class ValueObject<Props> {
  protected readonly props: Props;

  protected constructor(props: Props) {
    this.props = Object.freeze(props);
  }

  public equals(params: ValueObjectEqualsParams<Props>): boolean {
    if (!params.vo) return false;
    return JSON.stringify(this.props) === JSON.stringify(params.vo.props);
  }
}
