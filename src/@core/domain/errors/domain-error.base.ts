export type DomainErrorConstructorParams = {
  code: string;
  message: string;
};

export abstract class DomainError extends Error {
  readonly code: string;

  protected constructor(params: DomainErrorConstructorParams) {
    super(params.message);
    this.name = new.target.name;
    this.code = params.code;
  }
}
