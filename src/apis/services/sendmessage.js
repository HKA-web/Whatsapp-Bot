import { getAllSessions, getSession } from "../../whatsapp.js";
import { sendChunk, sleep } from "../../utils/config.js";

export async function sendMessage(req, res) {
  const allSessions = getAllSessions();
  if (!allSessions || allSessions.length === 0) {
    return res.status(500).json({ error: "Tidak ada device WA aktif" });
  }

  const deviceId = req.body._botDevice;

  const session = deviceId
    ? getSession(deviceId)
    : getSession(allSessions[0]);

  if (!session) return res.status(400).json({ error: "Device tidak ditemukan" });
  if (!session.sock) return res.status(500).json({ error: "Socket WA belum siap" });

  const sock = session.sock;

  // ==== PERBAIKAN: dukung key messages ====
  let waUsers = [];

  if (Array.isArray(req.body)) {
    // body langsung array [{jid, message}, ...]
    waUsers = req.body.map(m => ({ jid: m.jid, message: m.message }));
  } else if (req.body.messages && Array.isArray(req.body.messages)) {
    // body { _botDevice, messages: [...] }
    waUsers = req.body.messages.map(m => ({ jid: m.jid, message: m.message }));
  } else {
    // body { jid, message }
    waUsers = [{ jid: req.body.jid, message: req.body.message }];
  }

  const results = [];

  for (const user of waUsers) {
    if (!user || !user.message) {
      results.push({ jid: user?.jid ?? "unknown", status: "error", error: "Field 'message' wajib" });
      continue;
    }

    try {
      await sendChunk(
        String(user.message).replace(/\\n/g, "\n"),
        async (batchText) => {
          await sock.sendMessage(user.jid, { text: batchText });
        }
      );
      results.push({ jid: user.jid, status: "success" });
      await sleep();
    } catch (err) {
      results.push({ jid: user.jid, status: "error", error: err?.message || String(err) });
    }
  }

  res.json({ results });
}
