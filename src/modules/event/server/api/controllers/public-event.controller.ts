import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { ListEventsInputDto } from '../../../application/use-cases/list-events/list-events.input.dto';
import type { ListEventsOutputDto } from '../../../application/use-cases/list-events/list-events.output.dto';
import type { GetPublicEventInputDto } from '../../../application/use-cases/get-public-event/get-public-event.input.dto';
import type { GetPublicEventOutputDto } from '../../../application/use-cases/get-public-event/get-public-event.output.dto';
import type { ListEventsQuery, PublicEventRequest } from '../dtos/event.request.types';

export type PublicEventControllerDependencies = {
  listEventsUseCase: IUseCase<ListEventsInputDto, ListEventsOutputDto>;
  getPublicEventUseCase: IUseCase<GetPublicEventInputDto, GetPublicEventOutputDto>;
};

export class PublicEventController extends Controller<
  HttpRequestContext<PublicEventRequest>,
  HttpResponse
> {
  private readonly dependencies: PublicEventControllerDependencies;

  constructor(dependencies: PublicEventControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<PublicEventRequest>): Promise<HttpResponse> {
    switch (request.body.action) {
      case 'list':
        return this.list(request.body.query);
      case 'detail':
        return this.detail(request.body.slug);
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }

  private async list(query: ListEventsQuery): Promise<HttpResponse> {
    const result = await this.dependencies.listEventsUseCase.execute({
      search: query.search ?? null,
      status: query.status ?? null,
      type: query.type ?? null,
      city: query.city ?? null,
      state: query.state ?? null,
      startDateFrom: query.startDateFrom ?? null,
      startDateTo: query.startDateTo ?? null,
      onlyPublic: true,
      onlyUpcoming: false,
      page: query.page ? Number(query.page) : 1,
      perPage: query.perPage ? Number(query.perPage) : 12,
    });
    if (result.isFailure) return HttpResponse.serverError(result.error.message);
    return HttpResponse.ok(result.value.events, { ...result.value.meta });
  }

  private async detail(slug: string): Promise<HttpResponse> {
    const result = await this.dependencies.getPublicEventUseCase.execute({ slug });
    if (result.isFailure) return HttpResponse.notFound(result.error.message, 'EVENT_NOT_FOUND');
    return HttpResponse.ok(result.value);
  }
}
