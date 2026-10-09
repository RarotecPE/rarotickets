export type ValueObjectEqualsParams<Props> = {
  other?: ValueObject<Props>;
};

export abstract class ValueObject<Props> {
  protected readonly props: Readonly<Props>;

  protected constructor(props: Props) {
    this.props = Object.freeze({ ...props });
  }

  equals(params: ValueObjectEqualsParams<Props>): boolean {
    if (!params.other) return false;
    return JSON.stringify(this.props) === JSON.stringify(params.other.props);
  }
}
