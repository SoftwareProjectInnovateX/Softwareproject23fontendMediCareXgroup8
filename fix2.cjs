const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules')) results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}
const files = walk('./src');
let changedCount = 0;
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  const replaceStr = "(import.meta.env.VITE_API_URL_RAILWAY && import.meta.env.VITE_API_URL_RAILWAY !== 'undefined' ? import.meta.env.VITE_API_URL_RAILWAY : 'http://localhost:5000')";
  
  const regex = /import\.meta\.env\.VITE_API_URL_RAILWAY\s*\|\|\s*'http:\/\/localhost:5000'/g;
  if (regex.test(content)) {
    content = content.replace(regex, replaceStr);
    fs.writeFileSync(f, content);
    changedCount++;
  }
});
console.log('Files changed: ' + changedCount);
