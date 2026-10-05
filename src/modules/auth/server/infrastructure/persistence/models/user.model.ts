export type UserModel = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  last_login_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

export type UserModelData = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  permissions: string[];
  is_active: boolean;
  last_login_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};
