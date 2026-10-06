import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { EventRepository } from '../../../../domain/repositories/event-repository.base';
import type { EventId } from '../../../../domain/repositories/event-repository.interface';
import { isEventStatus } from '../../../../domain/value-objects/event-status.vo';
import { Event } from '../../../../domain/entities/event.entity';
import { EventPersistenceMapper } from '../mappers/event-persistence.mapper';
import type { EventModel } from '../models/event.model';

export type JsonEventRepositoryDependencies = {
  filePath: string;
  mapper: EventPersistenceMapper;
  initialRecords: EventModel[];
};

export class JsonEventRepositoryImpl extends EventRepository {
  private readonly filePath: string;
  private readonly mapper: EventPersistenceMapper;
  private readonly initialRecords: EventModel[];
  private readonly events = new Map<string, Event>();
  private persistenceQueue: Promise<void> = Promise.resolve();

  constructor(dependencies: JsonEventRepositoryDependencies) {
    super();
    this.filePath = dependencies.filePath;
    this.mapper = dependencies.mapper;
    this.initialRecords = dependencies.initialRecords;
  }

  async initialize(): Promise<void> {
    try {
      const fileContent = await readFile(this.filePath, 'utf8');
      const records = this.parseRecords(JSON.parse(fileContent) as unknown);
      records.forEach((record) => this.events.set(record.id, this.mapper.toDomain({ record })));
      return;
    } catch (error) {
      if (!this.isMissingFile(error)) throw error;
    }
    this.initialRecords.forEach((record) => this.events.set(record.id, this.mapper.toDomain({ record })));
    await this.persistRecords();
  }

  async findAll(): Promise<Event[]> {
    return [...this.events.values()].sort((first, second) => first.startAt.localeCompare(second.startAt));
  }

  async findById(id: EventId): Promise<Event | null> {
    return this.events.get(id) ?? null;
  }

  async save(event: Event): Promise<void> {
    const eventId = event.id.toString();
    if (this.events.has(eventId)) throw new Error('Não foi possível salvar o evento.');
    this.events.set(eventId, event);
    await this.persistRecords();
  }

  async update(event: Event): Promise<void> {
    const eventId = event.id.toString();
    if (!this.events.has(eventId)) throw new Error('Não foi possível atualizar o evento.');
    this.events.set(eventId, event);
    await this.persistRecords();
  }

  private async persistRecords(): Promise<void> {
    const records = [...this.events.values()].map((event) => this.mapper.toPersistence({ entity: event }));
    const nextWrite = this.persistenceQueue.then(async () => {
      await mkdir(dirname(this.filePath), { recursive: true });
      const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, JSON.stringify(records, null, 2), 'utf8');
      await rename(temporaryPath, this.filePath);
    });
    this.persistenceQueue = nextWrite.catch(() => undefined);
    await nextWrite;
  }

  private parseRecords(value: unknown): EventModel[] {
    if (!Array.isArray(value) || !value.every((record) => this.isEventModel(record))) {
      throw new Error('O arquivo de eventos possui formato inválido.');
    }
    return value;
  }

  private isEventModel(value: unknown): value is EventModel {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Partial<EventModel>;
    const validEventType = record.eventType === 'GRATUITO' || record.eventType === 'PAGO';
    const validModality = record.modality === 'PRESENCIAL' || record.modality === 'ONLINE';
    const validCapacity = record.capacity === null || (Number.isInteger(record.capacity) && Number(record.capacity) > 0);
    return Boolean(
      typeof record.id === 'string'
      && typeof record.title === 'string'
      && typeof record.shortDescription === 'string'
      && typeof record.description === 'string'
      && validEventType
      && Number.isInteger(record.priceCents)
      && typeof record.startAt === 'string'
      && typeof record.endAt === 'string'
      && validCapacity
      && typeof record.status === 'string'
      && isEventStatus(record.status)
      && validModality
      && typeof record.location === 'string'
      && Number.isInteger(record.registrationsCount)
      && Number.isInteger(record.confirmedRegistrationsCount)
      && Number.isInteger(record.revenueCents)
      && typeof record.createdById === 'string'
      && typeof record.createdAt === 'string'
      && (record.updatedAt === undefined || typeof record.updatedAt === 'string'),
    );
  }

  private isMissingFile(error: unknown): boolean {
    return Boolean(
      error
      && typeof error === 'object'
      && 'code' in error
      && error.code === 'ENOENT',
    );
  }
}
