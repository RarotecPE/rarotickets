export type DomainErrorParams = {
  code: string;
  message: string;
};

export abstract class DomainError extends Error {
  readonly code: string;

  protected constructor(params: DomainErrorParams) {
    super(params.message);
    this.name = new.target.name;
    this.code = params.code;
  }
}
