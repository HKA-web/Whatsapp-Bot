import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from "@whiskeysockets/baileys";
import pino from "pino";
import fs from "fs";
import path from "path";
import { appConfig, deleteSessionFolder } from "./utils/config.js";

const sessions = new Map();
const config = appConfig();

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
      console.log(`[${phoneNumber}] QR baru diterima`);
    }

    if (connection === "open") {
      console.log(`[${phoneNumber}] Bot terhubung`);
      session.latestQR = null; // bersihkan QR setelah connect
    }

    if (connection === "close") {
	  const statusCode = lastDisconnect?.error?.output?.statusCode;

	  if (statusCode === 401) {
		console.log(`[${phoneNumber}] Session expired. Harus scan ulang.`);
		deleteSessionFolder(phoneNumber); // hapus folder sesi lama
	  } else {
		console.log(`[${phoneNumber}] Reconnecting...`);
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
		msg.message?.extendedTextMessage?.text ||
		msg.message?.conversation ||
		msg.message?.imageMessage?.caption ||
		msg.message?.videoMessage?.caption ||
		msg.message?.buttonsResponseMessage?.selectedButtonId ||
		msg.message?.templateButtonReplyMessage?.selectedId ||
		msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
		msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
		"";

	  console.log(`[${phoneNumber}] Pesan dari ${sender}: ${text}`);

	  const messageType = Object.keys(msg.message)[0];

	  if (text.trim().toLowerCase() === "ping") {
		await sock.sendMessage(sender, { text: "pong 🏓" });
		return;
	  }
	  
	  
	try {
		  const session = getSession(phoneNumber);
		  const payload = {
			bot_device: {
			  phone: phoneNumber,
			  user: session?.user || null,
			  platform: "whatsapp",
			  connected: !!session,
			  last_connection: new Date().toISOString(),
			},
			message_id: msg.key.id,
			sender: msg.key.remoteJid,
			push_name: msg.pushName,
			timestamp: msg.messageTimestamp,
			message_type: messageType,
			text:
			  msg.message.extendedTextMessage?.text ||
			  msg.message.conversation ||
			  "",
			raw: msg
		  };
		  const payloadSize = Buffer.byteLength(JSON.stringify(payload), "utf8");
		  
		  await sock.sendMessage(sender, { text: "Tunggu sebentar..." });
		  
	} catch (err) {
		  console.error(`error: ${err?.message || err}`);
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
