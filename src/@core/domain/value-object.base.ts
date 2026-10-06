export type ValueObjectEqualsParams<Props extends object> = { valueObject?: ValueObject<Props> };

export abstract class ValueObject<Props extends object> {
  protected readonly props: Readonly<Props>;

  protected constructor(props: Props) {
    this.props = Object.freeze({ ...props });
  }

  equals(params: ValueObjectEqualsParams<Props>): boolean {
    if (!params.valueObject) return false;
    return JSON.stringify(this.props) === JSON.stringify(params.valueObject.props);
  }
}
