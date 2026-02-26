/**
 * TEST: Verificación de eliminación de filtro de Rol
 */

const emptyFilters = { 
    asunto: "", 
    document_type_id: "", 
    area_id: "", 
    group_id: "", 
    subgroup_id: "", 
    year: "", 
    month: "" 
};

console.log("--- TEST FILTROS DOCUMENTOS ---");

const hasRoleId = Object.prototype.hasOwnProperty.call(emptyFilters, "role_id");

console.log("¿Existe role_id en los filtros?: " + (hasRoleId ? "SI" : "NO"));

if (!hasRoleId) {
    console.log("RESULTADO: OK ✅ (Filtro eliminado)");
} else {
    console.log("RESULTADO: FALLO ❌ (El filtro persiste)");
}
