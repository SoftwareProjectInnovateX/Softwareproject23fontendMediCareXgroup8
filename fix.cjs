const fs = require('fs');

function fixFile(file) {
  let t = fs.readFileSync(file, 'utf8');
  
  // Remove font inline styles
  t = t.replace(/fontFamily:\s*FONT\.body/g, "fontFamily: 'inherit'");
  t = t.replace(/fontFamily:\s*FONT\.display/g, "fontFamily: 'inherit'");
  t = t.replace(/fontFamily:\s*mono\s*\?\s*"monospace"\s*:\s*FONT\.body/g, "fontFamily: mono ? 'monospace' : 'inherit'");
  
  // Fix main wrapper padding to use tailwind max-w-7xl classes
  // In PharmacistDispensing.jsx it's 
  // <div style={{ fontFamily: FONT.body, minHeight: "100vh", background: C.bg }}>
  // ...
  // <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 24px" }}>
  t = t.replace(/<div\s+style=\{\{\s*fontFamily:\s*'inherit',\s*minHeight:\s*"100vh",\s*background:\s*C\.bg\s*\}\}>/g, '<div className="space-y-6 max-w-7xl mx-auto pb-10">');
  t = t.replace(/<div\s+style=\{\{\s*maxWidth:\s*1160,\s*margin:\s*"0 auto",\s*padding:\s*"28px 24px"\s*\}\}>/g, '');
  
  // Now since I removed one <div>, I need to remove one closing </div> at the end.
  // We'll just replace the double </div> at the end with a single </div>.
  t = t.replace(/<\/div>\s*<\/div>\s*\{\/\* ── Toast ── \*\/\}/g, '</div>\n\n      {/* ── Toast ── */}');
  
  fs.writeFileSync(file, t);
}

fixFile('src/pages/pharmacist/PharmacistDispensing.jsx');
