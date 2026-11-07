import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

const standalone = process.env.STANDALONE_TEST_DIR
  ? path.resolve(process.env.STANDALONE_TEST_DIR)
  : path.join(process.cwd(), ".next", "standalone");
const server = path.join(standalone, "server.js");
await access(server);
const isolatedRequire = createRequire(path.join(standalone, "package.json"));
const required = ["mysql2", "better-auth", "drizzle-orm", "zod", "next", "react", "react-dom"];
for (const name of required) {
  try { require.resolve(name, { paths: [standalone] }); }
  catch { throw new Error(`Isolated standalone cannot resolve ${name}.`); }
}
try {
  const mysql = isolatedRequire("mysql2/promise");
  if (typeof mysql.createPool !== "function") throw new Error("mysql2/promise has no createPool export");
  isolatedRequire("safer-buffer");
  isolatedRequire("drizzle-orm/mysql2");
  await import(pathToFileURL(isolatedRequire.resolve("better-auth")).href);
  isolatedRequire("sharp");
  console.log("Isolated runtime imports passed: mysql2/promise, safer-buffer, Better Auth, Drizzle MySQL, Sharp.");
} catch (error) {
  throw new Error(`Isolated runtime import failed: ${error instanceof Error ? error.message : String(error)}`);
}
const manifest = JSON.parse(await readFile(path.join(standalone, "release-manifest.json"), "utf8"));
const leaked = manifest.files.filter(({ path: file }) => /(^|\/)(\.env(?:\.|$)|.*\.(?:pem|key)|.*credentials?\.(?:json|ya?ml|txt))$/i.test(file));
if (leaked.length) throw new Error(`Potential secret files in artifact: ${leaked.map(({ path: file }) => file).join(", ")}`);

const port = 3187;
const child = spawn(process.execPath, [server], {
  cwd: standalone,
  env: {
    NODE_ENV: "production",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    NODE_PATH: "",
    APP_URL: `http://127.0.0.1:${port}`,
    NEXT_PUBLIC_SUPABASE_URL: "https://standalone-test.invalid",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "standalone-test-anon-key-not-a-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk.toString(); });
child.stderr.on("data", (chunk) => { output += chunk.toString(); });
try {
  const deadline = Date.now() + 15000;
  let response;
  while (!response && Date.now() < deadline) {
    try { response = await fetch(`http://127.0.0.1:${port}/login`); }
    catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  if (!response) throw new Error(`Standalone server did not become ready. ${output.slice(-1000)}`);
  if (response.status >= 500) throw new Error(`Standalone /login returned ${response.status}. ${output.slice(-1000)}`);
  console.log(`Isolated standalone runtime passed: /login returned ${response.status}.`);
} finally {
  child.kill("SIGTERM");
}
