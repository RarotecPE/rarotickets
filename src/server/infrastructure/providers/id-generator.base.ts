import type { IIdGenerator, GenerateIdParams } from '../../../@core/application/id-generator.interface.ts';

export abstract class IdGenerator implements IIdGenerator {
  abstract generate(params: GenerateIdParams): string;
}
