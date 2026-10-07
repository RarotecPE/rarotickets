export type DomainErrorParams = { message: string; code: string };

export abstract class DomainError extends Error {
  public readonly code: string;

  protected constructor(params: DomainErrorParams) {
    super(params.message);
    this.code = params.code;
    this.name = this.constructor.name;
  }
}
