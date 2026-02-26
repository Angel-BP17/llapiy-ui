const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/usuarios/index.astro',
  'src/components/users/UsersModule.tsx',
  'src/pages/roles/index.astro',
  'src/components/roles/RolesModule.tsx'
];

console.log('--- BUSCANDO CONFLICTO DE ENCABEZADOS ---');

files.forEach(f => {
  const p = path.join(process.cwd(), f);
  if (fs.existsSync(p)) {
    const c = fs.readFileSync(p, 'utf8');
    const hasH = c.includes('<header');
    console.log('FILE: ' + f + ' | HAS_HEADER: ' + (hasH ? 'SI' : 'NO'));
  }
});
