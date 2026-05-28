#!/usr/bin/env node
// Validates that every variable declared in backend/src/config.ts
// has a corresponding entry in .env.example.
// Exits with code 1 if any variable is missing.

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "backend", "src", "config.ts");
const examplePath = path.join(root, ".env.example");

const configSrc = fs.readFileSync(configPath, "utf8");
const exampleSrc = fs.readFileSync(examplePath, "utf8");

// Extract variable names from z.object({ KEY: ... }) in config.ts
const keyRegex = /^\s{2}(\w+):/gm;
const configKeys = [];
let m;
while ((m = keyRegex.exec(configSrc)) !== null) {
  configKeys.push(m[1]);
}

// Extract keys present in .env.example (lines starting with KEY= or #KEY=)
const exampleKeys = new Set(
  exampleSrc
    .split("\n")
    .map((l) => l.replace(/^#\s*/, "").match(/^([A-Z_][A-Z0-9_]*)=/))
    .filter(Boolean)
    .map((m) => m[1])
);

const missing = configKeys.filter((k) => !exampleKeys.has(k));

if (missing.length > 0) {
  console.error("❌ .env.example is missing variables defined in config.ts:");
  missing.forEach((k) => console.error(`  - ${k}`));
  process.exit(1);
}

console.log(`✅ .env.example covers all ${configKeys.length} config variables.`);
