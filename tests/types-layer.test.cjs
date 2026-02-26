const fs = require('fs');
const path = require('path');

const typesDir = path.join(__dirname, '../src/types');
const files = ['api.ts', 'auth.ts', 'organization.ts', 'user.ts', 'role.ts', 'archive.ts'];

console.log('--- TEST TIPOS ---');
let ok = true;
files.forEach(f => {
    if (fs.existsSync(path.join(typesDir, f))) {
        console.log('FILE: ' + f + ' OK');
    } else {
        console.log('FILE: ' + f + ' MISSING');
        ok = false;
    }
});
console.log(ok ? 'RESULTADO: OK' : 'RESULTADO: FALLO');
if (!ok) process.exit(1);
