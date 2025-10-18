import fs from 'node:fs';
import path from 'node:path';

const src = path.resolve('apps/web/dist');
const dest = path.resolve('apps/api/dist/public');

fs.mkdirSync(dest, { recursive: true });

if (fs.cpSync) {
  fs.cpSync(src, dest, { recursive: true });
} else {
  const copy = (s, d) => {
    const st = fs.statSync(s);
    if (st.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      for (const e of fs.readdirSync(s)) copy(path.join(s, e), path.join(d, e));
    } else {
      fs.copyFileSync(s, d);
    }
  };
  copy(src, dest);
}

console.log('✅ Copied Vite dist → apps/api/dist/public');
