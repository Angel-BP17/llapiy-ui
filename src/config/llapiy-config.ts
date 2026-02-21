const apiUrl = import.meta.env.PUBLIC_LLAPIY_API_URL;
const webUrl = import.meta.env.PUBLIC_LLAPIY_WEB_URL;

export const config = {
  apiUrl,
  webUrl,
  environment: import.meta.env.MODE ?? "development",
  endpoints: {
    auth: {
      login: "/auth/login",
      logout: "/auth/logout",
      me: "/user"
    },
    dashboard: {
      index: "/dashboard"
    },
    users: {
      list: "/users",
      create: "/users",
      update: "/users/:id",
      delete: "/users/:id",
      pdf: "/users/pdf"
    },
    documents: {
      list: "/documents",
      create: "/documents",
      update: "/documents/:id",
      upload: "/documents/:id/upload",
      delete: "/documents/:id",
      pdf: "/documents/pdf"
    },
    blocks: {
      list: "/blocks",
      create: "/blocks",
      update: "/blocks/:id",
      upload: "/blocks/:id/upload",
      delete: "/blocks/:id",
      pdf: "/blocks/pdf"
    },
    documentTypes: {
      list: "/document_types",
      create: "/document_types",
      update: "/document_types/:id",
      delete: "/document_types/:id"
    },
    campos: {
      list: "/campos",
      create: "/campos",
      update: "/campos/:id",
      delete: "/campos/:id"
    },
    roles: {
      list: "/roles",
      create: "/roles",
      update: "/roles/:id",
      delete: "/roles/:id",
      permissions: "/roles/:id/permissions"
    },
    permissions: {
      list: "/permissions"
    },
    activityLogs: {
      list: "/activity-logs",
      pdf: "/activity-logs/pdf"
    },
    inbox: {
      list: "/inbox",
      updateStorage: "/inbox/update-storage/:id"
    },
    areas: {
      list: "/areas",
      create: "/areas",
      update: "/areas/:id",
      delete: "/areas/:id"
    },
    groupTypes: {
      list: "/group_types",
      create: "/group_types",
      update: "/group_types/:id",
      delete: "/group_types/:id"
    },
    storage: {
      sections: "/sections",
      andamios: "/sections/:section/andamios",
      andamioById: "/sections/:section/andamios/:andamio",
      boxes: "/sections/:section/andamios/:andamio/boxes",
      boxById: "/sections/:section/andamios/:andamio/boxes/:box",
      archivos: "/sections/:section/andamios/:andamio/boxes/:box/archivos",
      moveArchivo: "/sections/:section/andamios/:andamio/boxes/:box/archivos/:block/move"
    }
  }
} as const;

export function withId(path: string, id: number | string) {
  return path.replace(":id", String(id));
}

export function withParams(path: string, params: Record<string, number | string>) {
  return Object.entries(params).reduce((acc, [key, value]) => acc.replace(`:${key}`, String(value)), path);
}
