export type SimpleOption = {
  id: number;
  descripcion: string;
};

export type GroupTypeOption = {
  id: number;
  descripcion: string;
};

export type GroupOption = {
  id: number;
  descripcion: string;
  subgroups: SimpleOption[];
};

export type AreaGroupType = {
  id: number;
  group_type: GroupTypeOption;
  groups: GroupOption[];
};

export type AreaOption = {
  id: number;
  descripcion: string;
  area_group_types: AreaGroupType[];
};

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

export type RoleOption = {
  name: string;
  label: string;
};

export const defaultAvatar = "/default-avatar.png";

export const emptyForm: UserForm = {
  name: "",
  last_name: "",
  user_name: "",
  email: "",
  dni: "",
  password: "",
  password_confirmation: "",
  roles: [],
  areaId: "",
  groupTypeId: "",
  groupId: "",
  subgroupId: "",
  foto: defaultAvatar,
};
