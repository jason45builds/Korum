import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const appDir = path.join(repoRoot, "apps", "web");
const protectedKeys = new Set(Object.keys(process.env));
const validEnvKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

const decodeEnvValue = (value) => {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\n/g, "\n");
  }

  return trimmed.replace(/\\n/g, "\n");
};

const loadEnvFile = (relativePath, { override = false } = {}) => {
  const absolutePath = path.join(repoRoot, relativePath);

  if (!existsSync(absolutePath)) {
    return;
  }

  const content = readFileSync(absolutePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const normalisedLine = line.startsWith("export ") ? line.slice(7) : line;
    const separatorIndex = normalisedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = normalisedLine.slice(0, separatorIndex).trim().replace(/^\uFEFF/, "");

    if (!key || !validEnvKeyPattern.test(key) || protectedKeys.has(key)) {
      continue;
    }

    if (!override && Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }

    process.env[key] = decodeEnvValue(normalisedLine.slice(separatorIndex + 1));
  }
};

loadEnvFile(".env");
loadEnvFile(".env.local", { override: true });

const scriptName = process.argv[2];

if (!scriptName) {
  console.error("Missing app script name.");
  process.exit(1);
}

const forwardedArgs = process.argv.slice(3);
const quoteArg = (value) =>
  /[\s"]/g.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;

const npmCommand = [
  process.platform === "win32" ? "npm.cmd" : "npm",
  "run",
  scriptName,
  ...(forwardedArgs.length > 0 ? ["--", ...forwardedArgs] : []),
].map(quoteArg).join(" ");

const child = spawn(npmCommand, {
  cwd: appDir,
  env: process.env,
  stdio: "inherit",
  shell: true,
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
