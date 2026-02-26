export type NavItem = {
  label: string;
  href?: string;
  match?: string[];
  icon: string;
  permission?: string;
  children?: NavChild[];
  open?: boolean;
  active?: boolean;
};

export type NavChild = {
  label: string;
  href: string;
  match: string[];
  permission?: string;
  active?: boolean;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const defaultSections: NavSection[] = [
  {
    title: "NAVEGACION",
    items: [
      {
        label: "Home",
        href: "/",
        icon: '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M12 4 3 11h2v9h6v-6h2v6h6v-9h2Z"/></svg>',
      },
      {
        label: "Gestionar documentos",
        match: ["/documentos", "/bloques"],
        permission: "documents.view",
        icon: '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v2H8v-2Zm0 4h8v2H8v-2Z"/></svg>',
        children: [
          {
            label: "Documentos",
            href: "/documentos",
            match: ["/documentos"],
            permission: "documents.view",
          },
          {
            label: "Bloques",
            href: "/bloques",
            match: ["/bloques"],
            permission: "blocks.view",
          },
        ],
      },
    ],
  },
  {
    title: "BANDEJA",
    items: [
      {
        label: "Bandeja de entrada",
        href: "/bandeja",
        match: ["/bandeja"],
        permission: "inbox.view",
        icon: '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M4 4h16v8h-4l-2 4h-4l-2-4H4V4Zm0 10h4l2 4h4l2-4h4v6H4v-6Z"/></svg>',
      },
      {
        label: "Almacenamiento",
        href: "/sections",
        match: ["/sections", "/almacenamiento"],
        permission: "sections.view",
        icon: '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M4 6h16v4H4V6Zm0 6h16v6H4v-6Zm2 2v2h12v-2H6Z"/></svg>',
      },
    ],
  },
  {
    title: "ADMINISTRACION",
    items: [
      {
        label: "Usuarios",
        href: "/usuarios",
        match: ["/usuarios"],
        permission: "users.view",
        icon: '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2-8 4.5V20h16v-1.5c0-2.5-3.58-4.5-8-4.5Z"/></svg>',
      },
      {
        label: "Roles",
        href: "/roles",
        match: ["/roles", "/permissions", "/permisos"],
        permission: "roles.view",
        icon: '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="m4 10 8-6 8 6v8a2 2 0 0 1-2 2h-4v-6H10v6H6a2 2 0 0 1-2-2v-8Z"/></svg>',
      },
      {
        label: "Inf. adicional de documentos",
        match: ["/tipos-documentos", "/campos"],
        permission: "document-types.view",
        icon: '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 1.5V8h3.5L14 4.5ZM9 12h6v2H9v-2Zm0 4h6v2H9v-2Z"/></svg>',
        children: [
          {
            label: "Tipos de documentos",
            href: "/tipos-documentos",
            match: ["/tipos-documentos", "/document-types"],
            permission: "document-types.view",
          },
          {
            label: "Campos",
            href: "/campos",
            match: ["/campos"],
            permission: "campos.view",
          },
        ],
      },
      {
        label: "Areas",
        match: ["/areas", "/tipos-grupos"],
        permission: "areas.view",
        icon: '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M3 7h18v4H3V7Zm0 6h18v4H3v-4Z"/></svg>',
        children: [
          {
            label: "Gestionar Areas",
            href: "/areas",
            match: ["/areas"],
            permission: "areas.view",
          },
          {
            label: "Tipos de Grupos",
            href: "/tipos-grupos",
            match: ["/tipos-grupos", "/group-types"],
            permission: "group-types.view",
          },
        ],
      },
      {
        label: "Registro de actividades",
        href: "/actividades",
        match: ["/actividades", "/activity-logs"],
        permission: "activity-logs.view",
        icon: '<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"><path fill="currentColor" d="M7 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm2 4h6v2H9V8Zm0 4h6v2H9v-2Zm0 4h4v2H9v-2Z"/></svg>',
      },
    ],
  },
];
