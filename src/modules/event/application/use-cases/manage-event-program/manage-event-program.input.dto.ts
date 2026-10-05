export type ManageEventProgramAction = 'ADD_SPEAKER' | 'ADD_ACTIVITY' | 'REMOVE_ACTIVITY';

export type ManageEventProgramInputDto = {
  eventId: string;
  action: ManageEventProgramAction;
  activityId?: string;
  speakerId?: string | null;
  name?: string;
  bio?: string | null;
  photoUrl?: string | null;
  institution?: string | null;
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string;
  room?: string | null;
  actorUserId: string;
  actorName: string;
  ip?: string | null;
};
