// File: scripts/generate-openapi.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output struktur dasar OpenAPI
const output = {
  openapi: "3.0.0",
  info: {
    title: "WA BOT",
    version: "1.0.2",
    description: "API untuk mengelola WhatsApp Bot.",
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    }
  },
  paths: {},
  tags: []
};

// Path ke folder sumber file OpenAPI
const viewsPath = path.join(__dirname, "apis/views");

if (!fs.existsSync(viewsPath)) {
  console.warn(`⚠️ Folder tidak ditemukan: ${viewsPath}`);
} else {
  const files = fs.readdirSync(viewsPath)
    .filter(f => f.endsWith(".json") && f !== "openapi.json");

  for (const file of files) {
    const filePath = path.join(viewsPath, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      // Gabung paths
      if (content.paths) {
        Object.entries(content.paths).forEach(([route, def]) => {
          if (output.paths[route]) {
            console.warn(`⚠️ Duplicate path "${route}" dari ${file}, menimpa definisi lama`);
          }
          output.paths[route] = def;
        });
      }

      // Gabung tags unik
      if (Array.isArray(content.tags)) {
        for (const tag of content.tags) {
          if (!output.tags.some(t => t.name === tag.name)) {
            output.tags.push(tag);
          }
        }
      }

      // Gabung components (securitySchemes, parameters, dll)
      if (content.components) {
        output.components = {
          ...output.components,
          ...content.components,
          securitySchemes: {
            ...(output.components.securitySchemes || {}),
            ...(content.components.securitySchemes || {})
          },
          parameters: {
            ...(output.components.parameters || {}),
            ...(content.components.parameters || {})
          }
        };
      }
    } catch (err) {
      console.error(`❌ Gagal membaca ${file}: ${err.message}`);
    }
  }
}

// Simpan hasil gabungan ke file openapi.json di root
const outputPath = path.join(__dirname, "..", "openapi.json");

try {
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`✅ openapi.json berhasil dibuat di ${outputPath}`);
} catch (err) {
  console.error(`❌ Gagal menulis openapi.json: ${err.message}`);
}
