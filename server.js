const express = require("express");
const archiver = require("archiver");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");
const crypto = require("crypto");
const { execFile } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = __dirname;
const STORAGE_DIR = path.join(ROOT_DIR, "storage");
const OUTPUT_DIR = path.join(STORAGE_DIR, "output");
const LOCALAPPDATA = process.env.LOCALAPPDATA || "";
const WINGET_PACKAGES_DIR = path.join(
  LOCALAPPDATA,
  "Microsoft",
  "WinGet",
  "Packages"
);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(ROOT_DIR, "public")));

function randomId() {
  return crypto.randomBytes(10).toString("hex");
}

function sanitizeName(value, fallback = "media") {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return (cleaned || fallback).slice(0, 120);
}

function parseUrls(rawValue) {
  return String(rawValue || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function findExecutable(commandName, extraCandidates = []) {
  const pathEntries = String(process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean);

  const candidates = [...extraCandidates, ...pathEntries.map((entry) => path.join(entry, commandName))];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return commandName;
}

function getYtDlpPath() {
  const candidates = [
    path.join(WINGET_PACKAGES_DIR, "yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe", "yt-dlp.exe"),
  ];

  return findExecutable("yt-dlp.exe", candidates);
}

function getFfmpegPath() {
  const candidates = [
    path.join(
      WINGET_PACKAGES_DIR,
      "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "ffmpeg-8.1-full_build",
      "bin",
      "ffmpeg.exe"
    ),
    path.join(
      WINGET_PACKAGES_DIR,
      "yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "ffmpeg-N-123778-g3b55818764-win64-gpl",
      "bin",
      "ffmpeg.exe"
    ),
  ];

  return findExecutable("ffmpeg.exe", candidates);
}

function runYtDlp(args) {
  return new Promise((resolve, reject) => {
    execFile(getYtDlpPath(), args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        const detail = (stderr || stdout || error.message).trim();
        reject(new Error(detail || "yt-dlp komutu basarisiz oldu."));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

async function ensureFfmpeg() {
  try {
    await runYtDlp(["--version"]);
  } catch (error) {
    throw new Error(
      "yt-dlp bulunamadi. Once `yt-dlp` kurup PATH icine eklemelisin."
    );
  }

  try {
    await new Promise((resolve, reject) => {
      execFile(getFfmpegPath(), ["-version"], { windowsHide: true }, (error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  } catch {
    throw new Error(
      "ffmpeg bulunamadi. MP3 donusumu ve bazi MP4 birlestirmeleri icin gerekli."
    );
  }
}

async function fetchMetadata(url) {
  const { stdout } = await runYtDlp(["--print", "%(title)s", url]);
  return sanitizeName(stdout.split(/\r?\n/)[0], "media");
}

async function downloadMedia(url, format) {
  const id = randomId();
  const baseOutput = path.join(OUTPUT_DIR, `${id}.%(ext)s`);
  const title = await fetchMetadata(url);

  const args = [
    "--no-playlist",
    "--no-warnings",
    "--output",
    baseOutput,
  ];

  if (format === "mp3") {
    args.push(
      "--format",
      "bestaudio/best",
      "--extract-audio",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "--ffmpeg-location",
      path.dirname(getFfmpegPath())
    );
  } else {
    args.push(
      "--format",
      "bv*+ba/b",
      "--merge-output-format",
      "mp4",
      "--ffmpeg-location",
      path.dirname(getFfmpegPath())
    );
  }

  args.push(url);
  await runYtDlp(args);

  const finalPath = path.join(OUTPUT_DIR, `${id}.${format}`);
  const exists = fs.existsSync(finalPath);

  if (!exists) {
    throw new Error("Indirilen dosya bulunamadi.");
  }

  return {
    path: finalPath,
    fileName: `${title}.${format}`,
  };
}

async function createZipBundle(items) {
  const zipName = `media-downloads-${randomId()}.zip`;
  const zipPath = path.join(OUTPUT_DIR, zipName);

  await new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);

    for (const item of items) {
      archive.file(item.path, { name: item.fileName });
    }

    archive.finalize();
  });

  return {
    path: zipPath,
    fileName: "media-downloads.zip",
  };
}

async function cleanupFile(filePath) {
  try {
    await fsp.unlink(filePath);
  } catch {
    return;
  }
}

app.post("/api/download", async (req, res) => {
  const urls = parseUrls(req.body.urls);
  const format = String(req.body.format || "mp4").toLowerCase();

  if (!urls.length) {
    res.status(400).json({ error: "En az bir link girmelisin." });
    return;
  }

  if (!["mp3", "mp4"].includes(format)) {
    res.status(400).json({ error: "Format sadece mp3 veya mp4 olabilir." });
    return;
  }

  try {
    await ensureFfmpeg();
    const downloads = [];

    for (const url of urls) {
      downloads.push(await downloadMedia(url, format));
    }

    const result =
      downloads.length === 1 ? downloads[0] : await createZipBundle(downloads);

    res.download(result.path, result.fileName, async (error) => {
      await cleanupFile(result.path);

      for (const item of downloads) {
        await cleanupFile(item.path);
      }

      if (error && !res.headersSent) {
        res.status(500).json({ error: "Dosya gonderilirken hata olustu." });
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Beklenmeyen bir hata olustu.",
    });
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(ROOT_DIR, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server http://127.0.0.1:${PORT} adresinde calisiyor`);
});
