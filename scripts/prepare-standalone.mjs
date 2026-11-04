
import { cp, mkdir, access } from "node:fs/promises";
import path from "node:path";

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

console.log("Standalone assets prepared successfully.");
