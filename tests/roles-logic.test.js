const permissionActionLabels = {
  index: "Ver",
  view: "Ver",
  list: "Ver",
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  upload: "Subir"
};

function toTitleLabel(value) {
  return value
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getPermissionLabel(key) {
  const parts = key.split(".");
  const module = parts[0];
  const actionParts = parts.slice(1);
  
  if (!module || !actionParts.length) return toTitleLabel(key);

  const actionKey = actionParts.join("_").toLowerCase();
  const actionLabel = permissionActionLabels[actionKey] || toTitleLabel(actionParts.join(" "));
  return actionLabel + " " + toTitleLabel(module);
}

function buildPermissionGroups(permissionKeys) {
  const grouped = new Map();
  permissionKeys.forEach((key) => {
    const module = key.split(".")[0];
    if (!module) return;
    if (!grouped.has(module)) grouped.set(module, []);
    grouped.get(module).push(key);
  });
  return Array.from(grouped.keys());
}

console.log("--- TEST ROLES ---");
try {
    const label = getPermissionLabel("users.index");
    console.log("Label: " + label);
    const groups = buildPermissionGroups(["users.index", "docs.create"]);
    console.log("Groups: " + groups.length);
    
    if (label === "Ver Users" && groups.length === 2) {
        console.log("RESULTADO: OK");
    } else {
        console.log("RESULTADO: FALLO");
    }
} catch (e) {
    console.log("ERROR: " + e.message);
}
