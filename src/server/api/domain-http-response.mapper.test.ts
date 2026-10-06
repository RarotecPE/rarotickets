import { describe, expect, it } from 'vitest';
import { InvalidParticipantCredentialsError } from '../../modules/participants/domain/errors/invalid-participant-credentials.error';
import { ParticipantAlreadyRegisteredError } from '../../modules/participants/domain/errors/participant-already-registered.error';
import { mapDomainErrorToHttpResponse } from './domain-http-response.mapper';

describe('mapDomainErrorToHttpResponse', () => {
  it('returns an authentication status for invalid participant credentials', () => {
    const response = mapDomainErrorToHttpResponse({ error: new InvalidParticipantCredentialsError() });

    expect(response.statusCode).toBe(401);
  });

  it('returns a conflict status for duplicate participant accounts', () => {
    const response = mapDomainErrorToHttpResponse({ error: new ParticipantAlreadyRegisteredError() });

    expect(response.statusCode).toBe(409);
  });
});
