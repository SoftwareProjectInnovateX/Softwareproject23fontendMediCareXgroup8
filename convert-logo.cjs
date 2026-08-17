const fs = require('fs');
const logoBuffer = fs.readFileSync('./public/logo.png');
const base64Logo = logoBuffer.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <clipPath id="circleView">
      <circle cx="512" cy="512" r="512" />
    </clipPath>
  </defs>
  <rect width="1024" height="1024" fill="white" clip-path="url(#circleView)" />
  <image width="1024" height="1024" href="data:image/png;base64,${base64Logo}" clip-path="url(#circleView)" preserveAspectRatio="xMidYMid slice" transform="scale(1.1) translate(-45, -45)" />
</svg>`;
fs.writeFileSync('./public/favicon.svg', svg);
console.log('SVG created');
