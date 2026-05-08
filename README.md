<div align="center">

# gramsnap

Export Telegram chat history to JSON by date range.  
Self-hosted, sessions stay in the browser, no database.

[![Bun](https://img.shields.io/badge/Bun-1.x-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Telegram](https://img.shields.io/badge/Telegram-MTProto-26A5E4?style=flat-square&logo=telegram&logoColor=white)](https://core.telegram.org/mtproto)
[![License](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](./LICENSE)

[English](./README.md) · [Русский](./README.ru.md)

</div>

---

## Table of Contents

- [What is this](#what-is-this)
- [What it does](#what-it-does)
- [Output formats](#output-formats)
- [Install and run](#install-and-run)
- [Production](#production)
- [Configuration](#configuration)
- [What the app touches](#what-the-app-touches)
- [How it works](#how-it-works)
- [Module map](#module-map)
- [Notes and limitations](#notes-and-limitations)
- [License](#license)

---

## What is this

`gramsnap` is a self-hosted web app for exporting Telegram chat history to JSON. It works like Telegram Desktop's built-in "Export chat history", but with a web UI, multi-user support, and date-range filtering.

No third-party servers, no database, no files written to disk. Everything runs in a single process: auth, message fetching, and download — all of it happens in the browser and disappears immediately after.

---

## What it does

1. Sign in with your phone number → code from Telegram → 2FA password (if enabled)
2. Pick chats from the sidebar
3. Set a date range
4. Click Export
5. The file downloads to your browser — a single JSON or a ZIP of multiple JSONL files

**Nothing is left on the server** after the download.

Three differences from Telegram Desktop's built-in export:
- Cherry-pick chats and exact date ranges from a web UI
- No `my.telegram.org` registration needed
- One instance serves multiple users simultaneously — each user's session is fully isolated

---

## Output formats

### JSONL — one file per chat

One JSON object per line. Multiple chats are bundled into a ZIP.

```jsonl
{"id":12345,"date":"2026-05-07T18:24:11.000Z","fromId":"987654321","fromName":"Alice","text":"hello","replyToMsgId":null,"forwardedFrom":null,"mediaType":null,"mediaFileName":null,"mediaSize":null}
{"id":12346,"date":"2026-05-07T18:25:00.000Z","fromId":"111222333","fromName":"Bob","text":"hey","replyToMsgId":12345,"forwardedFrom":null,"mediaType":null,"mediaFileName":null,"mediaSize":null}
```

### JSON — one combined file

All chats and messages in a single JSON object. Convenient for scripting and further processing.

> **Media files are not downloaded.** Only metadata is saved: MIME type, filename, and size.

Message record fields:

| Field | Type | Description |
|---|---|---|
| `id` | number | Telegram message ID |
| `date` | string (ISO 8601) | Send time (UTC) |
| `fromId` | string | Numeric sender ID |
| `fromName` | string | Sender's display name at the time of the message |
| `text` | string \| null | Message text |
| `replyToMsgId` | number \| null | ID of the message this is a reply to |
| `forwardedFrom` | string \| null | Original source if forwarded |
| `mediaType` | string \| null | Media MIME type |
| `mediaFileName` | string \| null | Original filename |
| `mediaSize` | number \| null | File size in bytes |

---

## Install and run

```sh
bun install
bun run dev
```

Open [http://localhost:5173](http://localhost:5173).

In dev mode, Vite runs on port `5173` and proxies `/api/*` to Hono on port `3001`.

**Requirements:** [Bun](https://bun.sh) 1.x. Node.js is not required.

---

## Production

```sh
bun run build   # client → dist/client, server → dist/server/index.js
bun run start   # single process, default port 3001
```

Open [http://localhost:3001](http://localhost:3001). In production, Hono serves the built frontend itself — no separate Vite process needed.

### Running behind an HTTP proxy

gramjs supports SOCKS but not HTTP CONNECT. The server starts a small internal SOCKS5 ↔ HTTP CONNECT bridge, so you only need to point it at your HTTP proxy:

```sh
# PowerShell
$env:TELEGRAM_HTTP_PROXY="http://127.0.0.1:10809"; bun run start

# bash
TELEGRAM_HTTP_PROXY=http://127.0.0.1:10809 bun run start
```

---

## Configuration

Two environment variables, nothing else. No API keys, no secrets file.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | HTTP server port |
| `TELEGRAM_HTTP_PROXY` | — | HTTP CONNECT proxy URL. The server bridges it to SOCKS5 internally for gramjs. |

---

## What the app touches

> [!IMPORTANT]
>
> | | |
> |---|---|
> | Talks to | Telegram MTProto, like any other Telegram client |
> | Server disk | Nothing. No database. No `data/` or `exports/` directory is created. |
> | Server RAM | Per-session: dialog list, avatar thumbnails, finished export buffers. Idle sessions evict after 15 min, export buffers after 30 min. |
> | Browser localStorage | One key `gramsnap.session.v1` — the gramjs session string |
> | Outbound network | Telegram MTProto only, optionally tunneled through `TELEGRAM_HTTP_PROXY` |

The public Telegram Desktop `api_id` is hardcoded, so no `my.telegram.org` registration is required.

This is **not** end-to-end encrypted — the server reads your chat data the same way Telegram Desktop does.

To revoke access:
- Sign out via the UI button
- Clear site data in the browser
- Kill the session from Telegram → Settings → Devices

---

## How it works

After sign-in, the gramjs `StringSession` is returned to the client and stored in `localStorage`. Every subsequent request sends it back via `X-Gramsnap-Session`. The server keeps a connected `TelegramClient` in memory keyed by that string and proxies MTProto on the user's behalf.

Multiple users can share a single process — they're isolated by their session string. Restarting the server doesn't log anyone out: clients reconnect transparently from what's stored in their browser.

---

## Module map

<details>
<summary>Expand module map</summary>

### Server (`src/server/`)

| Module | Description |
|---|---|
| `routes/auth.ts` | `auth.SendCode → SignIn → CheckPassword` flow with a per-attempt `authId` |
| `routes/dialogs.ts` | Dialog list + lazy avatar endpoint with per-session cache |
| `routes/export.ts` | `POST /start` + SSE `/progress/:id` + `GET /download/:id` |
| `telegram/client.ts` | TelegramClient pool, pending-auth holding, idle eviction |
| `telegram/exporter.ts` | Message iteration, both output formats |
| `telegram/proxyBridge.ts` | SOCKS5 listener tunneling through an upstream HTTP CONNECT proxy |
| `telegram/zip.ts` | Minimal store-method ZIP encoder, ~100 lines, no deps |

### Client (`src/client/`)

| Module | Description |
|---|---|
| `api.ts` | Fetch wrapper that injects the session header, owns localStorage read/write |
| `hooks/useAuth.ts` | Validates stored session via `/auth/me` |
| `hooks/useExport.ts` | POST start, SSE progress, auto-trigger browser download |
| `hooks/useDialogs.ts` | Debounced search |
| `hooks/usePersistedSettings.ts` | Date range, format, include-options |
| `components/Avatar.tsx` | IntersectionObserver-gated lazy fetch with concurrency cap of 4 |
| `i18n/` | RU/EN, browser-detected locale, switchable from the header |

</details>

---

## Notes and limitations

**Telegram Desktop sessions can't be reused.** They use TDLib's `tdata` format, which is incompatible with gramjs's MTProto sessions. Sign in once via the web UI. Telegram can keep running in parallel — they're independent sessions and won't conflict.

**The session string in localStorage is a credential.** Anyone who reads it can sign in as you. Treat it the way you'd treat any Telegram client installed on a shared machine.

**Stack:** Bun, Hono, gramjs, React 18, Vite, Tailwind v3. No database, no ORM, no state-management library, no UI component library.

---

## License

This project is released under the **MIT License**.

In plain terms: you can use it in personal or commercial projects, modify it, distribute it, and include it in other products — with no restrictions. The only requirement is that you preserve the original copyright notice and license text when redistributing.

The MIT License comes with no warranties of any kind. The authors are not liable for any damages arising from the use of this software.

Full license text: [LICENSE](./LICENSE)