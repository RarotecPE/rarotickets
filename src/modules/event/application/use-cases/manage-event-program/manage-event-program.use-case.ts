import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { EventActivity } from '../../../domain/entities/event-activity.entity';
import { EventSpeaker } from '../../../domain/entities/event-speaker.entity';
import { EventNotFoundError } from '../../../domain/errors/event-not-found.error';
import { EVENT_PROGRAM_REPOSITORY } from '../../../domain/repositories/event-program-repository.interface';
import type { IEventProgramRepository } from '../../../domain/repositories/event-program-repository.interface';
import { EVENT_REPOSITORY } from '../../../domain/repositories/event-repository.interface';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { EventMapper } from '../../mappers/event.mapper';
import type { ManageEventProgramInputDto } from './manage-event-program.input.dto';
import type { ManageEventProgramOutputDto } from './manage-event-program.output.dto';

export type ManageEventProgramDependencies = {
  eventRepository: IEventRepository;
  programRepository: IEventProgramRepository;
  auditRecorder: IAuditRecorder;
  mapper: EventMapper;
};

/** Palestrantes e programação do evento (§31). */
export class ManageEventProgramUseCase extends UseCase<ManageEventProgramInputDto, ManageEventProgramOutputDto> {
  private readonly dependencies: ManageEventProgramDependencies;

  constructor(dependencies: ManageEventProgramDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ManageEventProgramInputDto): Promise<Result<ManageEventProgramOutputDto>> {
    const { eventRepository, programRepository, auditRecorder, mapper } = this.dependencies;

    const event = await eventRepository.findById(input.eventId);
    if (!event) return Result.fail(new EventNotFoundError({ eventId: input.eventId }));
    if (event.status.isCancelled()) return Result.fail(new Error('Evento cancelado não aceita alteração de programação'));

    if (input.action === 'ADD_SPEAKER') {
      const speakerResult = EventSpeaker.create({
        eventId: input.eventId,
        name: input.name ?? '',
        bio: input.bio ?? null,
        photoUrl: input.photoUrl ?? null,
        institution: input.institution ?? null,
      });
      if (speakerResult.isFailure) return Result.fail(speakerResult.error);

      await programRepository.saveSpeaker(speakerResult.value);
      await auditRecorder.record({
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        action: 'EVENT_SPEAKER_ADDED',
        entity: 'event_speaker',
        entityId: speakerResult.value.id.toString(),
        description: `Palestrante "${speakerResult.value.name}" adicionado ao evento ${event.title.value}`,
        ip: input.ip ?? null,
      });

      return Result.ok({ speaker: mapper.mapSpeaker({ speaker: speakerResult.value }) });
    }

    if (input.action === 'ADD_ACTIVITY') {
      const activityResult = EventActivity.create({
        eventId: input.eventId,
        speakerId: input.speakerId ?? null,
        title: input.title ?? '',
        description: input.description ?? null,
        startAt: input.startAt ?? '',
        endAt: input.endAt ?? '',
        room: input.room ?? null,
      });
      if (activityResult.isFailure) return Result.fail(activityResult.error);

      await programRepository.saveActivity(activityResult.value);
      await auditRecorder.record({
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        action: 'EVENT_ACTIVITY_ADDED',
        entity: 'event_activity',
        entityId: activityResult.value.id.toString(),
        description: `Atividade "${activityResult.value.title}" adicionada ao evento ${event.title.value}`,
        ip: input.ip ?? null,
      });

      return Result.ok({ activity: mapper.mapActivity({ activity: activityResult.value }) });
    }

    if (input.action === 'REMOVE_ACTIVITY') {
      if (!input.activityId) return Result.fail(new Error('Atividade não informada'));
      await programRepository.deleteActivity(input.activityId);
      await auditRecorder.record({
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        action: 'EVENT_ACTIVITY_REMOVED',
        entity: 'event_activity',
        entityId: input.activityId,
        description: `Atividade removida do evento ${event.title.value}`,
        ip: input.ip ?? null,
      });
      return Result.ok({ removedActivityId: input.activityId });
    }

    return Result.fail(new Error('Ação de programação não suportada'));
  }
}
