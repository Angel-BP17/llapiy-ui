export type Section = { id: number; n_section: number; descripcion: string };
export type Andamio = { id: number; section_id: number; n_andamio: number; descripcion: string };
export type Box = { id: number; andamio_id: number; n_box: number; descripcion: string };
export type Archivo = {
  id: number;
  box_id: number | null;
  n_bloque: string;
  asunto: string;
  folios: string;
  periodo: string;
};

export const sectionsSeed: Section[] = [];
export const andamiosSeed: Andamio[] = [];
export const boxesSeed: Box[] = [];
export const archivosSeed: Archivo[] = [];
