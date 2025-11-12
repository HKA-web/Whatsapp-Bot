import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// untuk dapatkan __dirname di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const output = {
  openapi: "3.0.0",
  info: { title: "WA BOT", version: "1.0.2" },
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

// path ke folder app
const appsPath = path.join(__dirname, "app");

if (!fs.existsSync(appsPath)) {
  console.warn(`⚠️ Apps folder not found at ${appsPath}`);
} else {
  // baca app/openapi.json
  const rootFile = path.join(appsPath, "openapi.json");
  if (fs.existsSync(rootFile)) {
    try {
      const content = JSON.parse(fs.readFileSync(rootFile, "utf-8"));

      // merge paths
      if (content.paths && typeof content.paths === "object") {
        Object.entries(content.paths).forEach(([p, def]) => {
          if (output.paths[p]) {
            console.warn(`⚠️ Duplicate path "${p}" found in app/openapi.json, overwriting`);
          }
          output.paths[p] = def;
        });
      }

      // merge tags unik
      if (Array.isArray(content.tags)) {
        content.tags.forEach(tag => {
          if (!output.tags.some(t => t.name === tag.name)) {
            output.tags.push(tag);
          }
        });
      }

      console.log(`✅ Loaded OpenAPI from app/openapi.json`);
    } catch (err) {
      console.error(`❌ Failed to parse app/openapi.json:`, err.message);
    }
  }
}

const outputPath = path.join(__dirname, "..", "openapi.json");

try {
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`📄 openapi.json generated at ${outputPath}`);
} catch (err) {
  console.error(`❌ Failed to write openapi.json:`, err.message);
}
