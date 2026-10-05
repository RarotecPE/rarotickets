import type { CreateEventInputDto } from '../create-event/create-event.input.dto';

export type UpdateEventInputDto = {
  eventId: string;
  fields: Partial<Omit<CreateEventInputDto, 'actorUserId' | 'actorName' | 'ip' | 'formFields'>>;
  actorUserId: string;
  actorName: string;
  ip?: string | null;
};
