import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '../public/images/logo-big.png');
const out = path.join(__dirname, '../public/images');

await sharp(src).resize(192, 192).toFile(path.join(out, 'icon-192.png'));
await sharp(src).resize(512, 512).toFile(path.join(out, 'icon-512.png'));

console.log('PWA icons generated.');
