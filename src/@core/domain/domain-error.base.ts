export type DomainErrorParams = { code: string; message: string };

export class DomainError extends Error {
  public readonly code: string;

  constructor(params: DomainErrorParams) {
    super(params.message);
    this.name = 'DomainError';
    this.code = params.code;
  }
}
