import { connectToWhatsApp, getSession } from "../whatsapp.js";
import QRCode from "qrcode";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATE_PATH = path.join(__dirname, "../src/views/");

export async function handleConnect(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({
        statusCode: 400,
        message: "Parameter ?phone=62xxx wajib.",
      });
    }

    await connectToWhatsApp(phone);

    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const qrPage = `${baseUrl}/wa/qr/page?phone=${phone}`;

    return res.status(200).json({
      statusCode: 200,
      message: `Sesi WhatsApp untuk ${phone} siap. Buka QR di ${qrPage}`,
      qr_url: qrPage,
    });
  } catch (err) {
    console.error("handleConnect error:", err);
    return res.status(500).json({
      statusCode: 500,
      message: `Gagal membuat sesi WhatsApp: ${err.message}`,
    });
  }
}

export async function handleQRPage(req, res) {
  const filePath = path.join(TEMPLATE_PATH, "qr.html");
  res.sendFile(filePath);
}

export async function handleQRView(req, res) {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).send("Parameter ?phone=62xxx wajib.");
    }

    const session = getSession(phone);
    if (!session) {
      return res.status(404).send("Sesi belum dibuat.");
    }

    const { latestQR } = session;
    if (!latestQR) {
      return res.status(202).send("QR belum tersedia atau sudah kadaluarsa.");
    }

    const qrImage = await QRCode.toDataURL(latestQR);
    const img = Buffer.from(qrImage.split(",")[1], "base64");

    res.writeHead(200, {
      "Content-Type": "image/png",
      "Content-Length": img.length,
    });
    res.end(img);
  } catch (err) {
    console.error("handleQRView error:", err);
    res.status(500).send("Gagal memuat QR.");
  }
}
