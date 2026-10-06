export type UpdateEventStatusRequestDto = { status: string };
export type UpdateEventStatusControllerRequest = {
  eventId: string;
  body: UpdateEventStatusRequestDto;
};
