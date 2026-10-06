import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Result } from '../../../../../../@core/domain/result';
import { Participant } from '../../../../domain/entities/participant.entity';
import { ParticipantAlreadyRegisteredError } from '../../../../domain/errors/participant-already-registered.error';
import { ParticipantRepository } from '../../../../domain/repositories/participant-repository.base';
import type {
  FindParticipantByCpfParams,
  FindParticipantByEmailParams,
  FindParticipantByIdParams,
  SaveParticipantParams,
} from '../../../../domain/repositories/participant-repository.interface';
import { ParticipantCpf } from '../../../../domain/value-objects/participant-cpf.vo';
import { ParticipantEmail } from '../../../../domain/value-objects/participant-email.vo';
import { ParticipantName } from '../../../../domain/value-objects/participant-name.vo';
import { ParticipantPersistenceMapper } from '../mappers/participant-persistence.mapper';
import type { ParticipantModel } from '../models/participant.model';

export type JsonParticipantRepositoryDependencies = { filePath: string; mapper: ParticipantPersistenceMapper };

type QueuedParticipantOperation = () => Promise<void>;

export class JsonParticipantRepositoryImpl extends ParticipantRepository {
  private readonly filePath: string;
  private readonly mapper: ParticipantPersistenceMapper;
  private readonly participants = new Map<string, Participant>();
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(dependencies: JsonParticipantRepositoryDependencies) {
    super();
    this.filePath = dependencies.filePath;
    this.mapper = dependencies.mapper;
  }

  async initialize(): Promise<void> {
    let fileContent: string;
    try {
      fileContent = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if (this.isMissingFile(error)) return;
      throw error;
    }
    const records = this.parseRecords(JSON.parse(fileContent) as unknown);
    records.forEach((record) => {
      const participant = this.mapper.toDomain({ record });
      if (this.hasDuplicate(participant)) throw new Error('O arquivo de participantes contém registros duplicados.');
      this.participants.set(participant.id.toString(), participant);
    });
  }

  async findById(params: FindParticipantByIdParams): Promise<Participant | null> {
    return this.participants.get(params.participantId) ?? null;
  }

  async findByEmail(params: FindParticipantByEmailParams): Promise<Participant | null> {
    return this.findByIdentityValue({ identityValue: params.email.value, identityField: 'email' });
  }

  async findByCpf(params: FindParticipantByCpfParams): Promise<Participant | null> {
    return this.findByIdentityValue({ identityValue: params.cpf.value, identityField: 'cpf' });
  }

  async save(params: SaveParticipantParams): Promise<Result<void>> {
    let saveResult: Result<void> = Result.ok();
    const operation: QueuedParticipantOperation = async () => {
      if (this.hasDuplicate(params.participant)) {
        saveResult = Result.fail<void>(new ParticipantAlreadyRegisteredError());
        return;
      }
      const participantId = params.participant.id.toString();
      this.participants.set(participantId, params.participant);
      try {
        await this.persistRecords();
      } catch (error) {
        this.participants.delete(participantId);
        throw error;
      }
    };
    const queuedOperation = this.writeQueue.then(operation);
    this.writeQueue = queuedOperation.catch(() => undefined);
    await queuedOperation;
    return saveResult;
  }

  private async findByIdentityValue(params: FindParticipantByIdentityValueParams): Promise<Participant | null> {
    for (const participant of this.participants.values()) {
      const value = params.identityField === 'email' ? participant.email.value : participant.cpf.value;
      if (value === params.identityValue) return participant;
    }
    return null;
  }

  private hasDuplicate(candidate: Participant): boolean {
    return [...this.participants.values()].some((participant) => (
      participant.email.value === candidate.email.value
      || participant.cpf.value === candidate.cpf.value
      || participant.id.equals(candidate.id)
    ));
  }

  private async persistRecords(): Promise<void> {
    const records = [...this.participants.values()].map((participant) => this.mapper.toPersistence({ entity: participant }));
    await mkdir(dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(records, null, 2), 'utf8');
    await rename(temporaryPath, this.filePath);
  }

  private parseRecords(value: unknown): ParticipantModel[] {
    if (!Array.isArray(value) || !value.every((record) => this.isParticipantModel(record))) {
      throw new Error('O arquivo de participantes possui formato inválido.');
    }
    return value;
  }

  private isParticipantModel(value: unknown): value is ParticipantModel {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Partial<ParticipantModel>;
    const validName = typeof record.name === 'string' && ParticipantName.create(record.name).isSuccess;
    const validEmail = typeof record.email === 'string' && ParticipantEmail.create(record.email).isSuccess;
    const validCpf = typeof record.cpf === 'string' && ParticipantCpf.create(record.cpf).isSuccess;
    return Boolean(
      typeof record.id === 'string'
      && validName
      && validEmail
      && validCpf
      && typeof record.passwordHash === 'string'
      && record.passwordHash.startsWith('scrypt$')
      && typeof record.createdAt === 'string'
      && Number.isFinite(new Date(record.createdAt).getTime())
      && typeof record.updatedAt === 'string'
      && Number.isFinite(new Date(record.updatedAt).getTime()),
    );
  }

  private isMissingFile(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
  }
}

type ParticipantIdentityField = 'email' | 'cpf';
type FindParticipantByIdentityValueParams = { identityValue: string; identityField: ParticipantIdentityField };
