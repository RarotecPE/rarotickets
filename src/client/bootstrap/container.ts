import { FetchHttpClient } from '../services/api-service.base';
import { AuthApiService } from '../../modules/auth/client/services/auth-api.service';
import { EventsApiService } from '../../modules/events/client/services/events-api.service';
import { ParticipantAuthApiService } from '../../modules/participants/client/services/participant-auth-api.service';

const httpClient = new FetchHttpClient();

export const authApiService = new AuthApiService({ httpClient });
export const eventsApiService = new EventsApiService({ httpClient });
export const participantAuthApiService = new ParticipantAuthApiService({ httpClient });
