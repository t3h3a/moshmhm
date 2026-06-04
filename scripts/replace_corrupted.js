const fs = require('fs');
const path = require('path');

const mockAppPath = path.resolve(__dirname, '..', 'artifacts', 'api-server', 'src', 'mock-app.ts');
let content = fs.readFileSync(mockAppPath, 'utf8');

// Replace the corrupted bracket line
content = content.replace(/\}§[^\n]*\n\s*\}/g, '}');

// Replace double brackets in topics if any
content = content.replace(/const topics = \[\s*\{\s*\{/g, 'const topics = [\n    {');

fs.writeFileSync(mockAppPath, content, 'utf8');
console.log('Successfully repaired mock-app.ts syntax errors!');
