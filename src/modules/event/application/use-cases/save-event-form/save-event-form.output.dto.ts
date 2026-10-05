import type { EventFormFieldDto } from '../../mappers/event.mapper';

export type SaveEventFormOutputDto = { formVersion: number; fields: EventFormFieldDto[] };
