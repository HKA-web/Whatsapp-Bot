import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import bodyParser from "body-parser";
import { handleConnect, handleQRPage, handleQRView } from "./app/controller.js";
import { connectToWhatsApp } from "./app/service.js";

const app = express();
const upload = multer();
const sessionRoot = path.resolve("./src/sessions");

// ✅ Gunakan satu versi path Swagger yang konsisten
const swaggerFilePath = path.join(process.cwd(), "openapi.json");

// 🔄 Auto reconnect dari semua sesi yang tersimpan
async function autoReconnectFromDisk() {
  if (!fs.existsSync(sessionRoot)) {
    console.log("📂 Folder sessions belum ada, skip auto reconnect.");
    return;
  }

  const dirs = fs.readdirSync(sessionRoot);
  if (dirs.length === 0) {
    console.log("⚠️ Tidak ada sesi tersimpan. Pair akun baru di /wa-connect?phone=62xxxxxx");
    return;
  }

  for (const dir of dirs) {
    const phone = dir; // nama folder nomor
    console.log(`🔄 Auto reconnect WhatsApp untuk ${phone}...`);
    try {
      await connectToWhatsApp(phone);
      await new Promise(res => setTimeout(res, 1000)); // jeda agar tidak flood
    } catch (err) {
      console.error(`❌ Gagal reconnect untuk ${phone}:`, err.message);
    }
  }
}

// 🔁 Jalankan reconnect otomatis saat server start
autoReconnectFromDisk();

// 🧩 Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(upload.none());

// 🌐 Swagger setup
app.get("/", (req, res) => res.redirect("/docs"));

if (fs.existsSync(swaggerFilePath)) {
  const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, "utf-8"));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} else {
  console.warn("⚠️ openapi.json not found!");
}

// ⚙️ Endpoint WhatsApp
app.get("/wa/connect", handleConnect);
app.get("/wa/qr/page", handleQRPage);
app.get("/wa/qr/view", handleQRView);

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Server running at http://localhost:${PORT}`)
);
