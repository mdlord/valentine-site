import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1472664075178606592/uXIfGzguo9as_Qs0jpRdQdOQSi_nnNQFoG2G8r1SSUmub38iycNjlMpHzTrWry_gjAcR";
const DEFAULT_DISCORD_USERNAME = "trade-alerts";

function getClientIpFromReq(req) {
  const raw =
    req.headers["x-nf-client-connection-ip"] ||
    req.headers["x-forwarded-for"] ||
    req.headers["client-ip"] ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "";

  return String(raw).split(",")[0].trim() || "unknown";
}

function discordNotifyDevPlugin(env) {
  return {
    name: "discord-notify-dev-endpoint",
    configureServer(server) {
      server.middlewares.use("/api/notify-site-open", (req, res, next) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method Not Allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });

        req.on("end", async () => {
          const webhookUrl =
            env.DISCORD_WEBHOOK_URL ||
            process.env.DISCORD_WEBHOOK_URL ||
            DEFAULT_DISCORD_WEBHOOK_URL;
          const username =
            env.DISCORD_USERNAME ||
            process.env.DISCORD_USERNAME ||
            DEFAULT_DISCORD_USERNAME;

          if (!webhookUrl) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "DISCORD_WEBHOOK_URL is not configured" }));
            return;
          }

          let payload = {};
          try {
            payload = body ? JSON.parse(body) : {};
          } catch {
            payload = {};
          }

          const siteUrl = payload.siteUrl || "unknown-url";
          const path = payload.path || "/";
          const openedAt = payload.openedAt || new Date().toISOString();
          const clientIp = getClientIpFromReq(req);
          const content = `Site opened: ${siteUrl}${path} at ${openedAt} (IP: ${clientIp})`;

          try {
            const resp = await fetch(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                username,
                content,
                allowed_mentions: { parse: [] },
              }),
            });

            if (!resp.ok) {
              const details = await resp.text();
              res.statusCode = 502;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error: "Discord webhook request failed",
                  status: resp.status,
                  details,
                })
              );
              return;
            }

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
          } catch (err) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                error: "Failed to send Discord notification",
                details: err?.message || String(err),
              })
            );
          }
        });

        req.on("error", () => {
          next();
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), discordNotifyDevPlugin(env)],
  };
});
