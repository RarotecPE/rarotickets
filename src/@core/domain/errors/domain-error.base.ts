export type DomainErrorParams = { message: string; code: string };

/** Erro de domínio: sempre carregado para fora via Result, nunca lançado. */
export abstract class DomainError extends Error {
  public readonly code: string;

  protected constructor(params: DomainErrorParams) {
    super(params.message);
    this.code = params.code;
    this.name = new.target.name;
  }
}
