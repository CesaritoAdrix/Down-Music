import express from "express";
import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { fileURLToPath } from "url";
import ffmpegPath from "ffmpeg-static";

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta para descargas temporales
const downloadDir = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir);

// Variable para guardar el proceso de descarga actual
let currentDownload = null;

// Servir archivos estáticos (HTML, CSS, JS)
app.use(express.static(__dirname));

// Página principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Endpoint para descargar audio
app.get("/api/download", (req, res) => {
  const videoUrl = req.query.url;
  let folder = req.query.folder; // carpeta enviada por el usuario

  if (!videoUrl) return res.status(400).send("Falta la URL");

  // Si no envía carpeta, usar carpeta por defecto
  if (!folder) folder = path.join(__dirname, "downloads");

  // Crear carpeta si no existe
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  const cleanUrl = videoUrl.split("&")[0];
 const outputTemplate = path.join(folder, "%(title)s.%(ext)s");
currentDownload = execFile(
  path.join(__dirname, "yt-dlp.exe"),
  [
    "-x",
    "--audio-format", "mp3",
    "--ffmpeg-location", ffmpegPath,
    "--restrict-filenames",       // evita caracteres extraños
    "--no-post-overwrites",       // evita sobrescribir
    "-o", outputTemplate,
    cleanUrl
  ],
  (error, stdout) => {
    currentDownload = null;
    if (error) {
      console.error("Error yt-dlp:", error);
      return res.status(500).send("Error al procesar el audio.");
    }

    // Buscar archivo .mp3 recién creado
    const files = fs.readdirSync(folder).filter(f => f.endsWith(".mp3"));
    if (files.length === 0) return res.status(500).send("No se generó el archivo mp3.");

    const fileName = files[0];
    const filePath = path.join(folder, fileName);

    res.download(filePath, fileName, () => {
      fs.unlinkSync(filePath); // ahora sí borrará el mp3 final
    });
  }
);


});

// Endpoint para detener descarga en curso
app.get("/api/stop", (req, res) => {
  if (currentDownload) {
    currentDownload.kill();
    currentDownload = null;
    return res.send("✅ Descarga detenida.");
  }
  res.send("⚠️ No hay descarga en curso.");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en: http://localhost:${PORT}`);
});
