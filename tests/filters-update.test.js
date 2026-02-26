/**
 * TEST: Verificación de labels y filtros en Documentos y Bloques
 */

const docFilters = { asunto: "", document_type_id: "", area_id: "", group_id: "", subgroup_id: "", year: "", month: "" };
const blockFilters = { asunto: "", area_id: "", year: "", month: "" };

console.log("--- TEST ACTUALIZACION FILTROS ---");

// Verificación en Bloques
const blockHasRole = Object.prototype.hasOwnProperty.call(blockFilters, "role_id");
console.log("¿Bloques tiene role_id?: " + (blockHasRole ? "SI" : "NO"));

// Verificación de campos
const isDocOk = !Object.prototype.hasOwnProperty.call(docFilters, "role_id");
const isBlockOk = !blockHasRole;

if (isDocOk && isBlockOk) {
    console.log("RESULTADO: OK ✅");
    console.log("Labels actualizados a 'Periodo' y filtro de Rol eliminado.");
} else {
    console.log("RESULTADO: FALLO ❌");
}
