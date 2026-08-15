/**
 * Railway/process entry: web runs Next, realtime runs Socket.IO.
 * Set SERVICE_ROLE=realtime on the realtime Railway service.
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const role = (process.env.SERVICE_ROLE || "web").toLowerCase();
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const child =
  role === "realtime"
    ? spawn(process.execPath, [join(root, "server/realtime.mjs")], {
        stdio: "inherit",
        env: process.env,
      })
    : spawn("npx", ["next", "start", "-H", "0.0.0.0", "-p", process.env.PORT || "3000"], {
        stdio: "inherit",
        env: process.env,
        cwd: root,
        shell: true,
      });

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
