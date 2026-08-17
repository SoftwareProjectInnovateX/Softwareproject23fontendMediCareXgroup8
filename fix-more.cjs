const fs = require('fs');

function fixBlogApproval() {
  let f = 'src/pages/pharmacist/PharmacistBlogApproval.jsx';
  if (fs.existsSync(f)) {
    let t = fs.readFileSync(f, 'utf8');
    t = t.replace(/<div className="flex flex-col h-full bg-\[\#f8fafc\] -m-6 relative overflow-hidden">/g, '<div className="space-y-6 max-w-7xl mx-auto pb-10 relative overflow-hidden">');
    t = t.replace(/<div className="flex-1 overflow-y-auto px-6 lg:px-8 py-8 h-full">/g, '<div className="w-full">');
    t = t.replace(/<div className="max-w-\[1000px\] mx-auto">/g, '<div className="w-full">');
    fs.writeFileSync(f, t);
    console.log("Fixed BlogApproval");
  }
}

function fixMyProducts() {
  let f = 'src/pages/pharmacist/MyProducts.jsx';
  if (fs.existsSync(f)) {
    let t = fs.readFileSync(f, 'utf8');
    // Remove inline font families
    t = t.replace(/font-family:\s*'Plus Jakarta Sans',\s*sans-serif;/g, "font-family: inherit;");
    // Change padding and wrapper to standard
    t = t.replace(/padding:\s*36px 40px 90px;/g, "");
    
    // We want .pmp-shell to not have this padding, and instead we use Tailwind classes on the wrapper.
    // Let's replace <div className="pmp-root"> with <div className="pmp-root space-y-6 max-w-7xl mx-auto pb-10">
    t = t.replace(/<div className="pmp-root">/g, '<div className="pmp-root space-y-6 max-w-7xl mx-auto pb-10">');
    // Wait, let's check what the wrapper actually is
    
    fs.writeFileSync(f, t);
    console.log("Fixed MyProducts");
  }
}

function fixBrands() {
  let f = 'src/pages/pharmacist/BrandsManagementPage.jsx';
  if (fs.existsSync(f)) {
    let t = fs.readFileSync(f, 'utf8');
    t = t.replace(/<div className="">/g, '<div className="space-y-6 max-w-7xl mx-auto pb-10">');
    fs.writeFileSync(f, t);
    console.log("Fixed Brands");
  }
}

fixBlogApproval();
fixMyProducts();
fixBrands();
