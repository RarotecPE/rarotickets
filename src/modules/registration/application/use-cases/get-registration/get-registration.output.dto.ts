import type { RegistrationDto } from '../../mappers/registration.mapper';

export type RegistrationCredentialDto = { code: string; token: string; credentialUrl: string };

export type GetRegistrationOutputDto = {
  registration: RegistrationDto;
  participant: { id: string; name: string; email: string; cpf: string | null } | null;
  event: { id: string; title: string; slug: string; type: string; status: string } | null;
  credential: RegistrationCredentialDto | null;
};
