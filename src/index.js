import express from "express";
import fs from "fs";
import path from "path";
import multer from "multer";
import swaggerUi from "swagger-ui-express";
import bodyParser from "body-parser";
import { handleConnect, handleQRPage, handleQRView } from "./controllers/app.js";
import { connectToWhatsApp } from "./whatsapp.js";
import route from "./apis/routes.js";

const app = express();
const upload = multer();
const sessionRoot = path.resolve("./src/sessions");

// Swagger
const swaggerFilePath = path.join(process.cwd(), "openapi.json");
if (fs.existsSync(swaggerFilePath)) {
  const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, "utf-8"));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(upload.none());

// WA endpoints
app.get("/wa/connect", handleConnect);
app.get("/wa/qr/page", handleQRPage);
app.get("/wa/qr/view", handleQRView);

app.use("/api", route);

// Auto reconnect
async function autoReconnectFromDisk() {
  if (!fs.existsSync(sessionRoot)) return;

  const dirs = fs.readdirSync(sessionRoot);
  for (const dir of dirs) {
    const phone = dir;
    console.log(`Auto reconnect WhatsApp untuk ${phone}...`);
    try {
      await connectToWhatsApp(phone);
      await new Promise(res => setTimeout(res, 1000));
    } catch (err) {
      console.error(`Gagal reconnect untuk ${phone}:`, err.message);
    }
  }
}
autoReconnectFromDisk();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running at http://localhost:${PORT}`)
);
