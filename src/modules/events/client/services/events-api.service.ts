import { ApiService } from '../../../../client/services/api-service.base';
import type { ApiServiceDependencies } from '../../../../client/services/api-service.base';
import type { CreateEventPayload, CreateEventResponse, EventListResponse, UpdateEventStatusResponse } from '../types/event.types';

export type EventsApiServiceDependencies = ApiServiceDependencies;
export type UpdateEventStatusParams = { eventId: string; status: string };

export class EventsApiService extends ApiService {
  constructor(dependencies: EventsApiServiceDependencies) {
    super(dependencies);
  }

  list(): Promise<EventListResponse> {
    return this.httpClient.request({ path: '/api/events' });
  }

  create(payload: CreateEventPayload): Promise<CreateEventResponse> {
    return this.httpClient.request({ path: '/api/events', method: 'POST', body: payload });
  }

  updateStatus(params: UpdateEventStatusParams): Promise<UpdateEventStatusResponse> {
    return this.httpClient.request({
      path: `/api/events/${encodeURIComponent(params.eventId)}/status`,
      method: 'PATCH',
      body: { status: params.status },
    });
  }
}
