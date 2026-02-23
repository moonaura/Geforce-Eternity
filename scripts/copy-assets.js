const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

const srcDir = path.join(__dirname, '../src');
const distDir = path.join(__dirname, '../dist');

// Copy assets
const assetsSrc = path.join(srcDir, 'assets');
const assetsDist = path.join(distDir, 'assets');
if (fs.existsSync(assetsSrc)) {
    console.log('Copying assets...');
    copyDir(assetsSrc, assetsDist);
}

// Copy renderer contents (includes sidebar)
const rendererSrc = path.join(srcDir, 'renderer');
const rendererDist = path.join(distDir, 'renderer');
if (fs.existsSync(rendererSrc)) {
    console.log('Copying renderer assets...');
    copyDir(rendererSrc, rendererDist);
}

console.log('Assets copied successfully.');
