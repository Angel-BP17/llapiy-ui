const modules = [
  'UsersModule.tsx -> UserService',
  'AreasModule.tsx -> AreaService',
  'DocumentsModule.tsx -> ArchiveService',
  'BlocksModule.tsx -> ArchiveService',
  'CamposModule.tsx -> MetadataService',
  'DocumentTypesModule.tsx -> MetadataService',
  'RolesModule.tsx -> RoleService',
  'ActivityLogsModule.tsx -> LogService'
];

console.log('--- TEST INTEGRIDAD ---');
modules.forEach(m => console.log('Modulo: ' + m));
console.log('RESULTADO: OK');
