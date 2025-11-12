import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
import path from "path";
import { redisClient } from "../utils/config.js";

const sessions = new Map(); // Menyimpan semua instance socket aktif

export async function connectToWhatsApp(phoneNumber) {
  const sessionDir = path.resolve(`./src/sessions/${phoneNumber}`);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    auth: state,
    version,
    getMessage: async () => ({}),
  });

  sessions.set(phoneNumber, { sock, state, latestQR: null });

  // Simpan credentials secara otomatis
  sock.ev.on("creds.update", saveCreds);

  // Event koneksi dan QR
  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    const session = sessions.get(phoneNumber);
    if (!session) return;

    if (qr) {
      session.latestQR = qr;
      console.log(`📲 [${phoneNumber}] QR baru diterima`);
    }

    if (connection === "open") {
      console.log(`✅ [${phoneNumber}] Bot terhubung`);
      session.latestQR = null; // bersihkan QR setelah connect
    }

    if (connection === "close") {
	  const statusCode = lastDisconnect?.error?.output?.statusCode;

	  if (statusCode === 401) {
		console.log(`⚠️ [${phoneNumber}] Session expired. Harus scan ulang.`);
		deleteSessionFolder(phoneNumber); // hapus folder sesi lama
	  } else {
		console.log(`🔄 [${phoneNumber}] Reconnecting...`);
		setTimeout(() => connectToWhatsApp(phoneNumber), 5000);
	  }
	}
  });

  // Handler pesan masuk
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
  if (type !== "notify") return;

  const msg = messages[0];
  if (!msg.message) return;
  if (msg.key.fromMe) return;

  const sender = msg.key.remoteJid;
  const text =
    msg.message.extendedTextMessage?.text ||
    msg.message.conversation ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    msg.message.buttonsResponseMessage?.selectedButtonId ||
    msg.message.templateButtonReplyMessage?.selectedId ||
    msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    msg.message.locationMessage?.name ||
    "";

  console.log(`💬 [${phoneNumber}] Pesan dari ${sender}: ${text}`);

  // Contoh auto-reply sederhana
  if (text.trim().toLowerCase() === "ping") {
    await sock.sendMessage(sender, { text: "pong 🏓" });
  }

  // --- Redis push section ---
  if (redisClient) {
		try {
		  // ambil session bot (dari helper getSession)
		  const session = getSession(phoneNumber);

		  // siapkan payload ke Redis
		  const payload = {
			bot_device: {
			  phone: phoneNumber,
			  user: session?.user || null,
			  platform: "whatsapp",
			  connected: !!session,
			  last_connection: new Date().toISOString(),
			},
			...msg,
		  };

		  await redisClient.publish("whatsapp:inbox", JSON.stringify(payload, null, 2));
		  console.log("📤 Pesan dikirim ke Redis whatsapp:inbox");
		} catch (err) {
		  console.error(`Redis push error: ${err?.message || err}`);
		}
	  }
  });


  return sessions.get(phoneNumber);
}

export function getSession(phoneNumber) {
  return sessions.get(phoneNumber);
}

export function getAllSessions() {
  return [...sessions.keys()];
}
