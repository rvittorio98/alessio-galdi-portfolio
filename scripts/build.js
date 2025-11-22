const fs = require('fs-extra');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');

console.log('🔨 Building project...\n');

// Pulisci la cartella dist
if (fs.existsSync(distDir)) {
  fs.removeSync(distDir);
  console.log('✓ Cartella dist pulita');
}

// Copia solo i file statici necessari
// NON copiamo project-template.html perché viene usato dinamicamente dal server

// 1. Copia index.html
fs.copySync(
  path.join(srcDir, 'index.html'),
  path.join(distDir, 'index.html')
);
console.log('✓ index.html copiato');

// 1b. Copia about.html
if (fs.existsSync(path.join(srcDir, 'about.html'))) {
  fs.copySync(
    path.join(srcDir, 'about.html'),
    path.join(distDir, 'about.html')
  );
  console.log('✓ about.html copiato');
}

// 2. Copia CSS
if (fs.existsSync(path.join(srcDir, 'css'))) {
  fs.copySync(
    path.join(srcDir, 'css'),
    path.join(distDir, 'css')
  );
  console.log('✓ CSS copiato');
}

// 3. Copia JS
if (fs.existsSync(path.join(srcDir, 'js'))) {
  fs.copySync(
    path.join(srcDir, 'js'),
    path.join(distDir, 'js')
  );
  console.log('✓ JS copiato');
}

// 4. Copia immagini (se esistono)
if (fs.existsSync(path.join(srcDir, 'images'))) {
  fs.copySync(
    path.join(srcDir, 'images'),
    path.join(distDir, 'images')
  );
  console.log('✓ Immagini copiate');
}

console.log('\n✅ Build completato! File statici in dist/');
console.log('📝 Le pagine dei progetti vengono servite dinamicamente dal server\n');