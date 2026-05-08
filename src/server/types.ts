export interface AuthUser {
  id: string
  firstName: string | null
  lastName: string | null
  username: string | null
  phone: string | null
}

export type DialogType = 'user' | 'group' | 'channel'

export interface Dialog {
  id: string
  type: DialogType
  name: string
  username: string | null
  unreadCount: number
  lastMessage: string | null
  lastDate: string | null
  hasPhoto: boolean
  photo: null
}

export type ExportFormat = 'jsonl-per-dialog' | 'json-combined'

export interface ExportConfig {
  dialogIds: string[]
  dateFrom: string
  dateTo: string
  includeForwarded: boolean
  includeReplies: boolean
  format: ExportFormat
}

export interface ExportedMessage {
  id: number
  date: string
  fromId: string | null
  fromName: string | null
  text: string | null
  replyToMsgId: number | null
  forwardedFrom: string | null
  mediaType: string | null
  mediaFileName: string | null
  mediaSize: number | null
}

export type ProgressEvent =
  | { type: 'progress'; dialog: string; current: number; total: number }
  | { type: 'done'; files: string[]; totalMessages: number }
  | { type: 'error'; message: string }
