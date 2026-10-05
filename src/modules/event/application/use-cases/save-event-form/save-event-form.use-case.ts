import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { toSlug } from '@core/domain/text.util';
import { EventFormField } from '../../../domain/entities/event-form-field.entity';
import { EventNotFoundError } from '../../../domain/errors/event-not-found.error';
import { EVENT_FORM_REPOSITORY } from '../../../domain/repositories/event-form-repository.interface';
import type { IEventFormRepository } from '../../../domain/repositories/event-form-repository.interface';
import { EVENT_REPOSITORY } from '../../../domain/repositories/event-repository.interface';
import type { IEventRepository } from '../../../domain/repositories/event-repository.interface';
import { EventMapper } from '../../mappers/event.mapper';
import type { SaveEventFormInputDto } from './save-event-form.input.dto';
import type { SaveEventFormOutputDto } from './save-event-form.output.dto';

export type SaveEventFormDependencies = {
  eventRepository: IEventRepository;
  formRepository: IEventFormRepository;
  auditRecorder: IAuditRecorder;
  mapper: EventMapper;
};

/**
 * Salva o formulário do evento. Campos removidos são inativados — nunca
 * apagados — preservando as respostas já enviadas (§9).
 */
export class SaveEventFormUseCase extends UseCase<SaveEventFormInputDto, SaveEventFormOutputDto> {
  private readonly dependencies: SaveEventFormDependencies;

  constructor(dependencies: SaveEventFormDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: SaveEventFormInputDto): Promise<Result<SaveEventFormOutputDto>> {
    const { eventRepository, formRepository, auditRecorder, mapper } = this.dependencies;

    const event = await eventRepository.findById(input.eventId);
    if (!event) return Result.fail(new EventNotFoundError({ eventId: input.eventId }));

    const eventId = event.id.toString();
    const existing = await formRepository.listByEvent({ eventId, includeInactive: true });
    const existingByKey = new Map(existing.map((field) => [field.fieldKey, field]));
    const submittedKeys = new Set<string>();

    for (const [index, item] of input.fields.entries()) {
      const fieldKey = (item.fieldKey ? item.fieldKey : toSlug(item.label).replace(/-/g, '_')).slice(0, 60);
      const current = existingByKey.get(fieldKey);

      if (current) {
        const updateResult = current.update({
          label: item.label,
          description: item.description ?? null,
          fieldType: item.fieldType,
          isRequired: item.isRequired ?? current.isRequired,
          orderIndex: item.orderIndex ?? index,
          options: item.options ?? current.options,
          placeholder: item.placeholder ?? null,
          isActive: item.isActive ?? true,
        });
        if (updateResult.isFailure) return Result.fail(updateResult.error);
        await formRepository.update(current);
        submittedKeys.add(fieldKey);
        continue;
      }

      const createResult = EventFormField.create({
        eventId,
        fieldKey,
        label: item.label,
        description: item.description ?? null,
        fieldType: item.fieldType,
        isRequired: item.isRequired ?? false,
        orderIndex: item.orderIndex ?? index,
        options: item.options ?? [],
        placeholder: item.placeholder ?? null,
        isActive: item.isActive ?? true,
      });
      if (createResult.isFailure) return Result.fail(createResult.error);
      await formRepository.save(createResult.value);
      submittedKeys.add(fieldKey);
    }

    // Campos que saíram do formulário são inativados (histórico preservado).
    for (const field of existing) {
      if (submittedKeys.has(field.fieldKey) || !field.isActive) continue;
      field.deactivate();
      await formRepository.update(field);
    }

    event.bumpFormVersion();
    await eventRepository.update(event);

    await auditRecorder.record({
      actorUserId: input.actorUserId,
      actorName: input.actorName,
      action: 'EVENT_FORM_UPDATED',
      entity: 'event',
      entityId: eventId,
      description: `Formulário do evento "${event.title.value}" atualizado para a versão ${event.formVersion}`,
      after: { formVersion: event.formVersion, fields: input.fields.map((field) => field.label) },
      ip: input.ip ?? null,
    });

    const fields = await formRepository.listByEvent({ eventId, includeInactive: true });
    return Result.ok({
      formVersion: event.formVersion,
      fields: fields.map((field) => mapper.mapFormField({ field })),
    });
  }
}
