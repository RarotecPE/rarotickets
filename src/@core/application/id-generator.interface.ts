export type GenerateIdParams = { purpose: string };

export interface IIdGenerator {
  generate(params: GenerateIdParams): string;
}
