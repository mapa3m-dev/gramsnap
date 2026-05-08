import { Api, type TelegramClient } from 'telegram'
import type { ExportConfig, ExportedMessage, ProgressEvent } from '../types.js'

const PROGRESS_INTERVAL = 50

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  )
}

function safeSlug(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 40) || 'chat'
}

function bigIntStr(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  if (typeof v === 'object' && 'toString' in (v as object)) {
    return (v as { toString(): string }).toString()
  }
  return null
}

function peerToId(peer: Api.TypePeer | undefined): string | null {
  if (!peer) return null
  if (peer instanceof Api.PeerUser) return bigIntStr(peer.userId)
  if (peer instanceof Api.PeerChat) return bigIntStr(peer.chatId)
  if (peer instanceof Api.PeerChannel) return bigIntStr(peer.channelId)
  return null
}

function describeMedia(media: Api.TypeMessageMedia | undefined): {
  mediaType: string | null
  mediaFileName: string | null
  mediaSize: number | null
} {
  if (!media) return { mediaType: null, mediaFileName: null, mediaSize: null }
  if (media instanceof Api.MessageMediaPhoto) {
    return { mediaType: 'photo', mediaFileName: null, mediaSize: null }
  }
  if (media instanceof Api.MessageMediaDocument && media.document instanceof Api.Document) {
    const doc = media.document
    let fileName: string | null = null
    let isVoice = false
    let isVideo = false
    let isAudio = false
    for (const attr of doc.attributes ?? []) {
      if (attr instanceof Api.DocumentAttributeFilename) fileName = attr.fileName
      if (attr instanceof Api.DocumentAttributeAudio) {
        isAudio = true
        if (attr.voice) isVoice = true
      }
      if (attr instanceof Api.DocumentAttributeVideo) isVideo = true
    }
    const size =
      typeof doc.size === 'number' ? doc.size : Number(doc.size?.toString() ?? '0') || null
    let mediaType = 'document'
    if (isVoice) mediaType = 'voice'
    else if (isVideo) mediaType = 'video'
    else if (isAudio) mediaType = 'audio'
    return { mediaType, mediaFileName: fileName, mediaSize: size }
  }
  if (media instanceof Api.MessageMediaWebPage) {
    return { mediaType: 'webpage', mediaFileName: null, mediaSize: null }
  }
  if (media instanceof Api.MessageMediaContact) {
    return { mediaType: 'contact', mediaFileName: null, mediaSize: null }
  }
  if (media instanceof Api.MessageMediaGeo) {
    return { mediaType: 'geo', mediaFileName: null, mediaSize: null }
  }
  return { mediaType: 'unknown', mediaFileName: null, mediaSize: null }
}

function forwardedFromName(fwd: Api.TypeMessageFwdHeader | undefined): string | null {
  if (!fwd || !(fwd instanceof Api.MessageFwdHeader)) return null
  return fwd.fromName ?? null
}

interface DialogResolved {
  id: string
  name: string
  entity: Api.TypeInputPeer
}

async function resolveDialog(
  client: TelegramClient,
  dialogId: string,
): Promise<DialogResolved> {
  const all = await client.getDialogs({ limit: 500 })
  const match = all.find((d) => (d.id ? d.id.toString() : '') === dialogId)
  if (!match) throw new Error(`dialog ${dialogId} not found`)
  return {
    id: dialogId,
    name: match.name ?? match.title ?? dialogId,
    entity: match.inputEntity,
  }
}

function dayBounds(dateFrom: string, dateTo: string): { fromTs: number; toTs: number } {
  const from = new Date(`${dateFrom}T00:00:00Z`)
  const to = new Date(`${dateTo}T23:59:59Z`)
  return { fromTs: Math.floor(from.getTime() / 1000), toTs: Math.floor(to.getTime() / 1000) }
}

async function senderName(message: Api.Message): Promise<string | null> {
  try {
    const sender = await message.getSender()
    if (!sender) return null
    if (sender instanceof Api.User) {
      const parts = [sender.firstName, sender.lastName].filter(Boolean) as string[]
      if (parts.length > 0) return parts.join(' ')
      return sender.username ?? null
    }
    if (sender instanceof Api.Chat || sender instanceof Api.Channel) {
      return sender.title ?? null
    }
  } catch {
    return null
  }
  return null
}

async function buildRecord(message: Api.Message): Promise<ExportedMessage> {
  const media = describeMedia(message.media)
  return {
    id: message.id,
    date: new Date(message.date * 1000).toISOString(),
    fromId: peerToId(message.fromId),
    fromName: await senderName(message),
    text: message.message ?? null,
    replyToMsgId:
      message.replyTo && message.replyTo instanceof Api.MessageReplyHeader
        ? (message.replyTo.replyToMsgId ?? null)
        : null,
    forwardedFrom: forwardedFromName(message.fwdFrom),
    mediaType: media.mediaType,
    mediaFileName: media.mediaFileName,
    mediaSize: media.mediaSize,
  }
}

interface CollectedDialog {
  id: string
  name: string
  messages: ExportedMessage[]
}

export interface ExportFile {
  name: string
  size: number
  content: Buffer
}

export interface ExportResult {
  files: ExportFile[]
  totalMessages: number
}

export async function runExport(
  client: TelegramClient,
  config: ExportConfig,
  emit: (e: ProgressEvent) => void,
): Promise<ExportResult> {
  const { fromTs, toTs } = dayBounds(config.dateFrom, config.dateTo)
  const ts = timestamp()
  const files: ExportFile[] = []
  const collected: CollectedDialog[] = []
  let totalMessages = 0

  for (const dialogId of config.dialogIds) {
    let resolved: DialogResolved
    try {
      resolved = await resolveDialog(client, dialogId)
    } catch (err) {
      emit({ type: 'error', message: err instanceof Error ? err.message : 'resolve_failed' })
      continue
    }

    const messages: ExportedMessage[] = []
    try {
      const iter = client.iterMessages(resolved.entity, {
        limit: undefined,
        offsetDate: toTs,
        reverse: false,
      })
      for await (const message of iter) {
        if (!(message instanceof Api.Message)) continue
        if (message.date < fromTs) break
        if (message.date > toTs) continue
        if (!config.includeForwarded && message.fwdFrom) continue
        if (!config.includeReplies && message.replyTo) continue

        messages.push(await buildRecord(message))
        if (messages.length % PROGRESS_INTERVAL === 0) {
          emit({ type: 'progress', dialog: resolved.name, current: messages.length, total: 0 })
        }
      }
    } catch (err) {
      emit({ type: 'error', message: err instanceof Error ? err.message : 'export_failed' })
    }

    if (config.format === 'jsonl-per-dialog') {
      const lines = messages.map((m) => JSON.stringify(m)).join('\n')
      const buf = Buffer.from(lines + (messages.length > 0 ? '\n' : ''), 'utf8')
      files.push({
        name: `${ts}_${safeSlug(resolved.name)}_${dialogId}.jsonl`,
        size: buf.length,
        content: buf,
      })
    } else {
      collected.push({ id: resolved.id, name: resolved.name, messages })
    }

    totalMessages += messages.length
    emit({ type: 'progress', dialog: resolved.name, current: messages.length, total: messages.length })
  }

  if (config.format === 'json-combined' && collected.length > 0) {
    const payload = {
      exportedAt: new Date().toISOString(),
      dateFrom: config.dateFrom,
      dateTo: config.dateTo,
      totalMessages,
      dialogs: collected,
    }
    const buf = Buffer.from(JSON.stringify(payload, null, 2), 'utf8')
    files.push({ name: `${ts}_combined.json`, size: buf.length, content: buf })
  }

  emit({ type: 'done', files: files.map((f) => f.name), totalMessages })
  return { files, totalMessages }
}
