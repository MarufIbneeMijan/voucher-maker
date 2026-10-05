const fs = require('fs');

let html = fs.readFileSync('e:/TravelLedger/client/index.html', 'utf8');
if (!html.includes('Plus Jakarta Sans')) {
  const fontLinks = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
  `;
  html = html.replace('</head>', fontLinks + '</head>');
  fs.writeFileSync('e:/TravelLedger/client/index.html', html, 'utf8');
}

let css = fs.readFileSync('e:/TravelLedger/client/src/index.css', 'utf8');
css = css.replace(/font-family: 'Inter', 'Hind Siliguri', sans-serif;/g, "font-family: 'Plus Jakarta Sans', 'Hind Siliguri', sans-serif;");
fs.writeFileSync('e:/TravelLedger/client/src/index.css', css, 'utf8');
console.log('Fonts updated.');
