export type CampoType = {
  id: number;
  name: string;
  data_type: "string" | "text" | "char" | "int" | "float" | "double" | "boolean" | "enum";
  is_nullable?: boolean;
  enum_values?: string[];
};

export type DocumentTypeRecord = {
  id: number;
  name: string;
  campoTypeIds: number[];
  groupIds: number[];
  subgroupIds: number[];
  documentsCount: number;
};

export type DocRecord = {
  id: number;
  n_documento: string;
  asunto: string;
  folios: string;
  fecha: string;
  document_type_id: number;
  document_type_name: string;
  root_url: string;
  campos: { campo_type_id: number; name: string; dato: string }[];
  area_id: number | null;
  group_id: number | null;
  subgroup_id: number | null;
  role_id: number | null;
};

export type BlockRecord = {
  id: number;
  n_bloque: string;
  asunto: string;
  folios: string;
  rango_inicial: number;
  rango_final: number;
  fecha: string;
  root_url: string;
  user: { name: string; last_name: string } | null;
  area: string;
  group: string;
  subgroup: string;
  box: { section: string; andamio: string; box: string } | null;
  area_id: number | null;
  role_id: number | null;
};
