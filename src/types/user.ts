import type { RoleOption } from "./role";

export type UserRecord = {
  id: number;
  name: string;
  last_name: string;
  user_name: string;
  email: string;
  dni: string;
  foto: string;
  roles: string[];
  areaId: number | null;
  groupTypeId: number | null;
  groupId: number | null;
  subgroupId: number | null;
};

export type UserForm = {
  name: string;
  last_name: string;
  user_name: string;
  email: string;
  dni: string;
  password: string;
  password_confirmation: string;
  roles: string[];
  areaId: string;
  groupTypeId: string;
  groupId: string;
  subgroupId: string;
  foto: string;
};
