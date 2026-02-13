import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { z } from "zod";

const filePath = path.resolve("config.yaml");

let _config = {};
export function appConfig() {
  if (_config && Object.keys(_config).length > 0) return _config; // cache

  let config = {};
  try {
    if (fs.existsSync(filePath)) {
      const file = fs.readFileSync(filePath, "utf8");
      const parsed = yaml.load(file);
      const ConfigSchema = z.record(z.string(), z.any());
      config = ConfigSchema.parse(parsed);
    } else {
      console.warn("File config.yaml tidak ditemukan!");
    }
  } catch (err) {
    console.error("Gagal memuat konfigurasi:", err);
  }

  _config = config;
  return _config;
}

const globalConfig = appConfig();

// Sleep
export function sleep(ms = globalConfig.server?.delay ?? 500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Send chunk
export async function sendChunk(
  text,
  sendFunc,
  maxCharsPerBatch = Math.min(globalConfig.server?.max_char ?? 4000, 4000),
  delayMs = globalConfig.server?.delay ?? 500,
  mode = globalConfig.server?.send_chunk_mode || "auto"
) {
  let chunks = [];

  if (mode === "auto") {
    mode = text.includes("\n") ? "char" : "word";
  }

  if (mode === "word") {
    const words = text.split(/\s+/);
    let buffer = "";
    for (const word of words) {
      if ((buffer + " " + word).trim().length > maxCharsPerBatch) {
        chunks.push(buffer.trim());
        buffer = word;
      } else {
        buffer += " " + word;
      }
    }
    if (buffer.trim().length > 0) chunks.push(buffer.trim());
  } else {
    for (let i = 0; i < text.length; i += maxCharsPerBatch) {
      chunks.push(text.slice(i, i + maxCharsPerBatch));
    }
  }

  for (const chunk of chunks) {
    await sendFunc(chunk);
    if (delayMs > 0) await sleep(delayMs);
  }
}

export function trimStrings(obj) {
  if (Array.isArray(obj)) return obj.map(trimStrings);
  if (obj && typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      if (typeof obj[key] === "string") newObj[key] = obj[key].trim();
      else if (Array.isArray(obj[key]) || typeof obj[key] === "object") newObj[key] = trimStrings(obj[key]);
      else newObj[key] = obj[key];
    }
    return newObj;
  }
  return obj;
}

export function generateSchemaFromRow(row) {
  const schema = [];
  for (const key in row) {
    const value = row[key];
    let type = "any";

    if (value === null || value === undefined) type = "any";
    else if (typeof value === "string") type = "string";
    else if (typeof value === "number") type = "number";
    else if (value instanceof Date) type = "date";
    else if (typeof value === "boolean") type = "boolean";

    schema.push({ name: key, type });
  }
  return schema;
}

export function mapRowsWithSchema(rows) {
  if (!rows || rows.length === 0) return { schema: [], data: [] };

  const schema = generateSchemaFromRow(rows[0]);
  const data = rows.map(row => {
    const obj = {};
    for (const col of schema) {
      let value = row[col.name];
      if (col.type === "string" && typeof value === "string") value = value.trim();
      if (col.type === "date" && value) value = new Date(value);
      obj[col.name] = value;
    }
    return obj;
  });

  return { schema, data };
}

export function mapRowsDynamic(rows) {
  if (!rows || rows.length === 0) return [];
  const schema = generateSchemaFromRow(rows[0]);
  return rows.map(row => {
    const obj = {};
    for (const col of schema) {
      let value = row[col.name];
      if (col.type === "string" && typeof value === "string") value = value.trim();
      if (col.type === "date" && value) value = new Date(value);
      obj[col.name] = value;
    }
    return obj;
  });
}

export function deleteSessionFolder(phoneNumber) {
  try {
    const sessionDir = path.resolve(`./src/sessions/${phoneNumber}`);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[${phoneNumber}] Folder session dihapus.`);
    }
  } catch (err) {
    console.error(`[${phoneNumber}] Gagal menghapus session:`, err.message);
  }
}
