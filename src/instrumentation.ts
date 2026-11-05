/**
 * Keeps a free Render instance awake: pings its own public /health URL every
 * 8 minutes. Render only spins a free service down after ~15 minutes with no
 * inbound traffic, so this self-request prevents the sleep.
 * Only runs on Render (RENDER=true) in the Node runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.RENDER !== "true") return;
  if (process.env.KEEPALIVE === "false") return;
  const base = process.env.RENDER_EXTERNAL_URL;
  if (!base) return;

  const g = globalThis as unknown as { __shopngoKeepAlive?: boolean };
  if (g.__shopngoKeepAlive) return;
  g.__shopngoKeepAlive = true;

  const ping = async () => {
    try {
      await fetch(`${base.replace(/\/$/, "")}/health`, {
        cache: "no-store",
        signal: AbortSignal.timeout(20_000),
        headers: { "user-agent": "shopngo-keepalive" },
      });
    } catch {
      // ignore; next tick retries
    }
  };
  const timer = setInterval(ping, 8 * 60 * 1000);
  timer.unref?.();
}
