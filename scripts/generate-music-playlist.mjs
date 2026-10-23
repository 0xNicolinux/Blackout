import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const musicDir = path.resolve("musica");
const supported = new Set([".mp3", ".ogg", ".wav", ".m4a", ".aac", ".webm"]);

async function collect(dir, prefix = "") {
  const entries = await readdir(dir, { withFileTypes: true });
  const tracks = [];
  for (const entry of entries) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) tracks.push(...await collect(path.join(dir, entry.name), relative));
    else if (supported.has(path.extname(entry.name).toLowerCase())) tracks.push(relative);
  }
  return tracks;
}

const tracks = (await collect(musicDir)).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" }));
await writeFile(path.join(musicDir, "playlist.json"), `${JSON.stringify({ tracks }, null, 2)}\n`, "utf8");
console.log(`Índice de músicas atualizado: ${tracks.length} faixa(s).`);
