const fs = require('fs');
const path = require('path');
function fixDir(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) fixDir(p);
    else if (p.endsWith('.ts')) {
      let c = fs.readFileSync(p, 'utf8');
      c = c.replace(/['"]\.\.\/lib\/([^'"]+)['"]/g, "'../services/$1'");
      c = c.replace(/['"]@\/lib\/fatwa['"]/g, "'@/services/fatwa'");
      fs.writeFileSync(p, c);
    }
  }
}
fixDir('content');
fixDir('prisma');
