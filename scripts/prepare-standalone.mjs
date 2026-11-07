
import { cp, mkdir, access, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

const root = process.cwd();

const standalone = path.join(
  root,
  ".next",
  "standalone"
);

const staticSource = path.join(
  root,
  ".next",
  "static"
);

const staticTarget = path.join(
  standalone,
  ".next",
  "static"
);

// Ensure standalone build exists.
await access(path.join(standalone, "server.js"));

// Copy Next.js static assets.
await mkdir(path.dirname(staticTarget), {
  recursive: true,
});

await cp(staticSource, staticTarget, {
  recursive: true,
  force: true,
});

// Copy public assets if the project has a public folder.
const publicSource = path.join(root, "public");

// Only mutate generated output. Never touch the source tree or an existing
// deployment/rollback directory from this packaging step.
await rm(path.join(standalone, ".next", "cache"), { recursive: true, force: true });
await rm(path.join(standalone, "public"), { recursive: true, force: true });

try {
  await access(publicSource);

  await cp(
    publicSource,
    path.join(standalone, "public"),
    {
      recursive: true,
      force: true,
    }
  );
} catch (error) {
  if (error.code !== "ENOENT") {
    throw error;
  }
}

const requiredRuntimePackages = ["mysql2", "better-auth", "drizzle-orm", "zod", "next", "react", "react-dom"];
// TypeScript is a build-time dependency that Next can trace through tooling;
// Passenger never needs it to serve the compiled server.
await rm(path.join(standalone, "node_modules", "typescript"), { recursive: true, force: true });
const tracedRuntimePackages = [
  "mysql2", "safer-buffer", "better-auth", "@better-auth", "@better-fetch", "@noble",
  "@standard-schema", "better-call", "defu", "jose", "kysely", "nanostores", "rou3",
  "set-cookie-parser", "drizzle-orm", "zod", "sharp", "@img/colour",
  "@img/sharp-linux-x64", "@img/sharp-libvips-linux-x64",
];
for (const packageName of tracedRuntimePackages) {
  const source = path.join(root, "node_modules", packageName);
  const target = path.join(standalone, "node_modules", packageName);
  try { await access(source); } catch { continue; }
  // Next tracing can leave a package directory present but incomplete (for
  // example mysql2's nested iconv-lite -> safer-buffer dependency). Merge the
  // explicitly allow-listed runtime package instead of trusting directory
  // existence as proof that all files were traced.
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, force: true });
}
const missing = requiredRuntimePackages.filter((name) => {
  try { require.resolve(name, { paths: [standalone] }); return false; } catch { return true; }
});
if (missing.length) throw new Error(`Standalone runtime is incomplete; missing: ${missing.join(", ")}`);

const files = [];
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(fullPath);
    else files.push({ path: path.relative(standalone, fullPath).replaceAll(path.sep, "/"), bytes: (await stat(fullPath)).size });
  }
}
await collect(standalone);
const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);
await writeFile(path.join(standalone, "release-manifest.json"), JSON.stringify({ generatedAt: new Date().toISOString(), totalBytes, requiredRuntimePackages, files }, null, 2));

console.log("Standalone assets prepared successfully.");
console.log(`Standalone runtime size: ${(totalBytes / 1024 / 1024).toFixed(2)} MiB`);
