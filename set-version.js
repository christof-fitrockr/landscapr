const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, 'src/environments/version.ts');

const now = new Date();
const dateString = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');

const content = `export const version = {
  date: '${dateString}'
};
`;

fs.writeFileSync(versionFilePath, content);
console.log(`Wrote version ${dateString} to ${versionFilePath}`);
