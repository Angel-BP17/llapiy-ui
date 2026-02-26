export type SimpleOption = {
  id: number;
  descripcion: string;
};

export type GroupOption = SimpleOption & {
  subgroups: SimpleOption[];
};

export type AreaGroupType = {
  id: number;
  group_type: SimpleOption;
  groups: GroupOption[];
};

export type AreaOption = SimpleOption & {
  area_group_types: AreaGroupType[];
};

export type AreaRecord = SimpleOption & {
  abreviacion: string;
};

export type GroupRecord = SimpleOption & {
  area_id: number;
  group_type_id: number;
  abreviacion: string;
};

export type SubgroupRecord = SimpleOption & {
  group_id: number;
  abreviacion: string;
  parent_subgroup_id: number | null;
};
