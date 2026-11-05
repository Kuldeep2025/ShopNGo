// Minimal stand-in for the Firebase auth emulator, used only for local end-to-end testing.
// It answers the user lookup the admin SDK makes in emulator mode, so unsigned test tokens verify.
import http from "node:http";

http
  .createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let ids = [];
      try { ids = JSON.parse(raw).localId ?? []; } catch { /* ignore */ }
      const users = ids.map((localId) => ({ localId, email: `${localId}@example.test`, disabled: false, validSince: "0" }));
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ users }));
    });
  })
  .listen(9099, "127.0.0.1");
