import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext, RequestActor } from '@server/api/http-request.types';
import type { CreateEventInputDto } from '../../../application/use-cases/create-event/create-event.input.dto';
import type { CreateEventOutputDto } from '../../../application/use-cases/create-event/create-event.output.dto';
import type { UpdateEventInputDto } from '../../../application/use-cases/update-event/update-event.input.dto';
import type { UpdateEventOutputDto } from '../../../application/use-cases/update-event/update-event.output.dto';
import type { ChangeEventStatusInputDto } from '../../../application/use-cases/change-event-status/change-event-status.input.dto';
import type { ChangeEventStatusOutputDto } from '../../../application/use-cases/change-event-status/change-event-status.output.dto';
import type { ListEventsInputDto } from '../../../application/use-cases/list-events/list-events.input.dto';
import type { ListEventsOutputDto } from '../../../application/use-cases/list-events/list-events.output.dto';
import type { GetAdminEventInputDto } from '../../../application/use-cases/get-admin-event/get-admin-event.input.dto';
import type { GetAdminEventOutputDto } from '../../../application/use-cases/get-admin-event/get-admin-event.output.dto';
import type { SaveEventFormInputDto } from '../../../application/use-cases/save-event-form/save-event-form.input.dto';
import type { SaveEventFormOutputDto } from '../../../application/use-cases/save-event-form/save-event-form.output.dto';
import type { ManageEventLoteInputDto } from '../../../application/use-cases/manage-event-lote/manage-event-lote.input.dto';
import type { ManageEventLoteOutputDto } from '../../../application/use-cases/manage-event-lote/manage-event-lote.output.dto';
import type { ManageEventProgramInputDto } from '../../../application/use-cases/manage-event-program/manage-event-program.input.dto';
import type { ManageEventProgramOutputDto } from '../../../application/use-cases/manage-event-program/manage-event-program.output.dto';
import type { EventAdminRequest } from '../dtos/event.request.types';

export type EventAdminControllerDependencies = {
  listEventsUseCase: IUseCase<ListEventsInputDto, ListEventsOutputDto>;
  getAdminEventUseCase: IUseCase<GetAdminEventInputDto, GetAdminEventOutputDto>;
  createEventUseCase: IUseCase<CreateEventInputDto, CreateEventOutputDto>;
  updateEventUseCase: IUseCase<UpdateEventInputDto, UpdateEventOutputDto>;
  changeEventStatusUseCase: IUseCase<ChangeEventStatusInputDto, ChangeEventStatusOutputDto>;
  saveEventFormUseCase: IUseCase<SaveEventFormInputDto, SaveEventFormOutputDto>;
  manageEventLoteUseCase: IUseCase<ManageEventLoteInputDto, ManageEventLoteOutputDto>;
  manageEventProgramUseCase: IUseCase<ManageEventProgramInputDto, ManageEventProgramOutputDto>;
};

export class EventAdminController extends Controller<HttpRequestContext<EventAdminRequest>, HttpResponse> {
  private readonly dependencies: EventAdminControllerDependencies;

  constructor(dependencies: EventAdminControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<EventAdminRequest>): Promise<HttpResponse> {
    const actor = request.actor;
    if (!actor) return HttpResponse.unauthorized();
    const ip = request.ip;

    switch (request.body.action) {
      case 'list':
        return this.list(request.body.query);
      case 'detail':
        return this.detail(request.body.eventId);
      case 'create':
        return this.create(request.body.body, actor, ip);
      case 'update':
        return this.update(request.body.eventId, request.body.body, actor, ip);
      case 'changeStatus':
        return this.changeStatus(request.body.eventId, request.body.body, actor, ip);
      case 'saveForm':
        return this.saveForm(request.body.eventId, request.body.body.fields, actor, ip);
      case 'manageLote':
        return this.manageLote(request.body.eventId, request.body.body, actor, ip);
      case 'manageProgram':
        return this.manageProgram(request.body.eventId, request.body.body, actor, ip);
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }

  private async list(query: EventAdminRequest extends never ? never : Extract<EventAdminRequest, { action: 'list' }>['query']): Promise<HttpResponse> {
    const result = await this.dependencies.listEventsUseCase.execute({
      search: query.search ?? null,
      status: query.status ?? null,
      type: query.type ?? null,
      city: query.city ?? null,
      state: query.state ?? null,
      startDateFrom: query.startDateFrom ?? null,
      startDateTo: query.startDateTo ?? null,
      onlyPublic: false,
      onlyUpcoming: false,
      page: query.page ? Number(query.page) : 1,
      perPage: query.perPage ? Number(query.perPage) : 20,
    });
    if (result.isFailure) return HttpResponse.serverError(result.error.message);
    return HttpResponse.ok(result.value.events, { ...result.value.meta });
  }

  private async detail(eventId: string): Promise<HttpResponse> {
    const result = await this.dependencies.getAdminEventUseCase.execute({ eventId });
    if (result.isFailure) return HttpResponse.notFound(result.error.message, 'EVENT_NOT_FOUND');
    return HttpResponse.ok(result.value);
  }

  private async create(
    body: Record<string, unknown>,
    actor: RequestActor,
    ip: string | null,
  ): Promise<HttpResponse> {
    const payload = { ...body, actorUserId: actor.userId, actorName: actor.name, ip };
    const result = await this.dependencies.createEventUseCase.execute(
      payload as unknown as CreateEventInputDto,
    );
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'EVENT_CREATE_FAILED');
    return HttpResponse.created(result.value);
  }

  private async update(
    eventId: string,
    body: Record<string, unknown>,
    actor: RequestActor,
    ip: string | null,
  ): Promise<HttpResponse> {
    const result = await this.dependencies.updateEventUseCase.execute({
      ...(body as unknown as UpdateEventInputDto),
      eventId,
      actorUserId: actor.userId,
      actorName: actor.name,
      ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'EVENT_UPDATE_FAILED');
    return HttpResponse.ok(result.value);
  }

  private async changeStatus(
    eventId: string,
    body: { nextStatus: string; reason?: string | null },
    actor: RequestActor,
    ip: string | null,
  ): Promise<HttpResponse> {
    const result = await this.dependencies.changeEventStatusUseCase.execute({
      eventId,
      nextStatus: body.nextStatus,
      reason: body.reason ?? null,
      actorUserId: actor.userId,
      actorName: actor.name,
      ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'EVENT_STATUS_CHANGE_FAILED');
    return HttpResponse.ok(result.value);
  }

  private async saveForm(
    eventId: string,
    fields: Array<Record<string, unknown>>,
    actor: RequestActor,
    ip: string | null,
  ): Promise<HttpResponse> {
    const result = await this.dependencies.saveEventFormUseCase.execute({
      eventId,
      fields: fields as unknown as SaveEventFormInputDto['fields'],
      actorUserId: actor.userId,
      actorName: actor.name,
      ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'EVENT_FORM_SAVE_FAILED');
    return HttpResponse.ok(result.value);
  }

  private async manageLote(
    eventId: string,
    body: Record<string, unknown>,
    actor: RequestActor,
    ip: string | null,
  ): Promise<HttpResponse> {
    const result = await this.dependencies.manageEventLoteUseCase.execute({
      ...(body as unknown as ManageEventLoteInputDto),
      eventId,
      actorUserId: actor.userId,
      actorName: actor.name,
      ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'EVENT_LOTE_FAILED');
    return HttpResponse.ok(result.value);
  }

  private async manageProgram(
    eventId: string,
    body: Record<string, unknown>,
    actor: RequestActor,
    ip: string | null,
  ): Promise<HttpResponse> {
    const result = await this.dependencies.manageEventProgramUseCase.execute({
      ...(body as unknown as ManageEventProgramInputDto),
      eventId,
      actorUserId: actor.userId,
      actorName: actor.name,
      ip,
    });
    if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'EVENT_PROGRAM_FAILED');
    return HttpResponse.ok(result.value);
  }
}
