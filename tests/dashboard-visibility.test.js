function normalizePermission(value) {
  return value.trim().toLowerCase().replaceAll("_", "-").replaceAll(".", "-");
}

function can(session, permission) {
  if (!session || !permission) return false;
  if (!session.permissions || !session.permissions.length) return false;
  const normalizedReq = normalizePermission(permission);
  const permissionSet = new Set(session.permissions.map(normalizePermission));
  return permissionSet.has(normalizedReq);
}

const dashboardCounters = [
  { label: "Usuarios registrados", permission: "users.view" },
  { label: "Archivos registrados", permission: "documents.view" },
  { label: "Bloques no almacenados", permission: "inbox.view" },
  { label: "Tipos de documentos", permission: "document-types.view" }
];

const scenarios = [
  {
    name: "ADMINISTRADOR (Guiones bajos)",
    permissions: ["users_view", "documents_view", "inbox_view", "document_types_view"]
  },
  {
    name: "OPERADOR LIMITADO (Puntos)",
    permissions: ["documents.view", "inbox.view"]
  },
  {
    name: "USUARIO NUEVO (Vacio)",
    permissions: []
  }
];

console.log("--- INICIO DE TEST ---");

scenarios.forEach(scenario => {
    console.log("ESCENARIO: " + scenario.name);
    const session = { permissions: scenario.permissions };
    let visibleCount = 0;

    dashboardCounters.forEach(counter => {
        const isVisible = can(session, counter.permission);
        if (isVisible) {
            console.log("  [OK] " + counter.label);
            visibleCount++;
        } else {
            console.log("  [OFF] " + counter.label);
        }
    });
    console.log("TOTAL: " + visibleCount + " visibles\n");
});
