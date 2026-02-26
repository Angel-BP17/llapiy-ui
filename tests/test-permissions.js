function normalizePermission(value) {
  return value.trim().toLowerCase().replaceAll("_", "-").replaceAll(".", "-");
}

const requiredPermissions = ["users.view", "documents.view", "inbox.view", "document-types.view"];
const serverPermissions = ["users_view", "documents_view", "inbox_view", "document_types_view"];

console.log("--- TEST DE NORMALIZACION (CORREGIDO) ---");
const permissionSet = new Set(serverPermissions.map(normalizePermission));

requiredPermissions.forEach(req => {
    const reqNormalized = normalizePermission(req);
    const hasMatch = permissionSet.has(reqNormalized);
    console.log(`Dashboard: ${req} (Norm: ${reqNormalized}) | Coincide: ${hasMatch ? "SI" : "NO"}`);
});
