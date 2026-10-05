export type SaveEventFormFieldInput = {
  fieldKey?: string;
  label: string;
  description?: string | null;
  fieldType: string;
  isRequired?: boolean;
  orderIndex?: number;
  options?: string[];
  placeholder?: string | null;
  isActive?: boolean;
};

export type SaveEventFormInputDto = {
  eventId: string;
  fields: SaveEventFormFieldInput[];
  actorUserId: string;
  actorName: string;
  ip?: string | null;
};
