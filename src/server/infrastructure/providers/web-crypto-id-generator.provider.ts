import { IdGenerator } from './id-generator.base.ts';
import type { GenerateIdParams } from '../../../@core/application/id-generator.interface.ts';

/** Server-only source of collision-resistant internal IDs and human-facing codes. */
export class WebCryptoIdGenerator extends IdGenerator {
  public generate(params: GenerateIdParams): string {
    const purpose = params.purpose.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-');
    return `${purpose}-${globalThis.crypto.randomUUID()}`;
  }
}
