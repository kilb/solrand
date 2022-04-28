const fs = require('fs');
const idl = require('./target/idl/solrand.json');

fs.writeFileSync('./app/src/idl.json', JSON.stringify(idl));