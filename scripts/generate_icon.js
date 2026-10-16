import { app, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 256,
    height: 256,
    show: false,
    useContentSize: true,
    transparent: true,
    frame: false,
    webPreferences: {
      offscreen: true
    }
  });

  const svgPath = path.join(projectRoot, 'assets', 'logo.svg');
  await win.loadFile(svgPath);

  // Chờ render ổn định 300ms
  await new Promise((r) => setTimeout(r, 300));

  const image = await win.capturePage({ x: 0, y: 0, width: 256, height: 256 });
  const pngBuffer = image.toPNG();
  fs.writeFileSync(path.join(projectRoot, 'assets', 'icon.png'), pngBuffer);
  fs.writeFileSync(path.join(projectRoot, 'assets', 'logo.png'), pngBuffer);
  console.log('Successfully created icon.png and logo.png');
  app.quit();
});
