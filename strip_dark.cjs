const fs = require('fs');
const path = require('path');

function stripDarkClasses(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      stripDarkClasses(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Regex to match "dark:..." followed by optional spaces
      // It handles letters, numbers, hyphens, slashes, square brackets, and hashes
      const regex = /dark:[a-zA-Z0-9\-\/\[\]\#]+\s?/g;
      
      const newContent = content.replace(regex, '');
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${file}`);
      }
    }
  });
}

stripDarkClasses('src/pages/pharmacist');
console.log('Done.');
