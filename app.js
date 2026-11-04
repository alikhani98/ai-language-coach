
"use strict";

process.env.NODE_ENV = "production";
process.env.HOSTNAME = "127.0.0.1";

import("./.next/standalone/server.js").catch((error) => {
  console.error("Failed to start Next.js server:", error);
  process.exit(1);
});
