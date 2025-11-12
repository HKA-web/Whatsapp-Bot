import { getSession, getAllSessions } from "../whatsapp.js";
import { sendChunk, sleep } from "../utils/config.js";

export async function checkRegistered(req, res, next) {
  const { _botDevice, messages, jid } = req.body;

  const allSessions = getAllSessions();
  const session = _botDevice
    ? getSession(_botDevice)
    : getSession(allSessions[0]);

  if (!session) return res.status(400).json({ error: "Device tidak ditemukan" });
  if (!session.sock) return res.status(500).json({ error: "Socket WA belum siap" });

  const sock = session.sock;

  // Tentukan list JID yang akan dicek
  let jids = [];
  if (messages && Array.isArray(messages)) {
    jids = messages.map(m => m.jid);
  } else if (jid) {
    jids = [jid];
  } else {
    return res.status(400).json({ error: "Tidak ada nomor tujuan yang diberikan" });
  }

  const invalidNumbers = [];

  // Cek tiap nomor
  for (const number of jids) {
    try {
      const isRegistered = await sock.onWhatsApp(number); 
      if (!isRegistered || isRegistered.length === 0 || !isRegistered[0].exists) {
        invalidNumbers.push(number);
      }
    } catch (err) {
      console.error(`Gagal cek nomor ${number}:`, err.message);
      invalidNumbers.push(number);
    }
  }

  if (invalidNumbers.length > 0) {
    return res.status(400).json({
      error: "Beberapa nomor tidak terdaftar di WhatsApp",
      invalidNumbers
    });
  }

  next();
}
