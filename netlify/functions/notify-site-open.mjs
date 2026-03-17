const DEFAULT_DISCORD_WEBHOOK_URL =
  "https://discord.com/api/webhooks/1472664075178606592/uXIfGzguo9as_Qs0jpRdQdOQSi_nnNQFoG2G8r1SSUmub38iycNjlMpHzTrWry_gjAcR";
const DEFAULT_DISCORD_USERNAME = "trade-alerts";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL || DEFAULT_DISCORD_WEBHOOK_URL;
  const username = process.env.DISCORD_USERNAME || DEFAULT_DISCORD_USERNAME;

  if (!webhookUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "DISCORD_WEBHOOK_URL is not configured" }),
    };
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    payload = {};
  }

  const siteUrl = payload.siteUrl || "unknown-url";
  const path = payload.path || "/";
  const openedAt = payload.openedAt || new Date().toISOString();

  const content = `Site opened: ${siteUrl}${path} at ${openedAt}`;

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
    const errorText = await resp.text();
    return {
      statusCode: 502,
      body: JSON.stringify({
        error: "Discord webhook request failed",
        status: resp.status,
        details: errorText,
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
}
