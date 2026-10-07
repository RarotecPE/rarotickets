import "server-only";
import { randomUUID } from "node:crypto";
import type { IIdGenerator } from "@/@core/domain/id-generator.interface";

export class UuidIdGenerator implements IIdGenerator {
  next(): string {
    return randomUUID();
  }
}
