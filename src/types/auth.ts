export type UserProfile = {
  id: number;
  name: string;
  last_name: string;
  user_name: string;
  email: string;
  dni: string;
  foto_perfil: string | null;
  area: string;
  group: string;
  subgroup: string;
  roles: string[];
  permissions: string[];
};

export type AuthSession = {
  user: UserProfile | null;
  roles: string[];
  permissions: string[];
  permissionSet: Set<string>;
};

export type LoginResponse = {
  token?: string;
  access_token?: string;
  token_type?: string;
  user?: UserProfile;
};
