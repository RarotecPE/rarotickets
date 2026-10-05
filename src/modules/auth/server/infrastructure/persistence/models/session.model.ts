export type SessionModel = {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  user_agent: string | null;
  ip: string | null;
  created_at: Date;
};

export type SessionModelData = SessionModel;
