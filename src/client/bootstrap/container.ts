import { FetchHttpClient } from '../services/api-service.base';
import { AuthApiService } from '../../modules/auth/client/services/auth-api.service';
import { EventsApiService } from '../../modules/events/client/services/events-api.service';

const httpClient = new FetchHttpClient();

export const authApiService = new AuthApiService({ httpClient });
export const eventsApiService = new EventsApiService({ httpClient });
