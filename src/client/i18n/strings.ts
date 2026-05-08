export const LOCALES = ['ru', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const LOCALE_LABEL: Record<Locale, string> = {
  ru: 'Русский',
  en: 'English',
}

export interface Strings {
  app: {
    title: string
    tagline: string
    sessionHint: string
  }
  privacy: {
    title: string
    subtitle: string
    flowBrowser: string
    flowBrowserNote: string
    flowServer: string
    flowServerNote: string
    flowTelegram: string
    flowTelegramNote: string
    pointSession: string
    pointNoStore: string
    pointDownload: string
    pointPublic: string
    disclaimer: string
  }
  auth: {
    titlePhone: string
    titleCode: string
    title2fa: string
    hintPhone: string
    hintCode: string
    hint2fa: string
    labelPhone: string
    labelCode: string
    labelPassword: string
    placeholderPhone: string
    sendCode: string
    sending: string
    verify: string
    verifying: string
    signIn: string
    signingIn: string
    resend: string
    changeNumber: string
    errorSend: string
    errorCode: string
    errorPassword: string
  }
  header: {
    signOut: string
    connected: string
    language: string
  }
  dashboard: {
    chats: string
    chatsForExport: string
    nothingSelected: string
    selectedCount: (n: number) => string
    pickChats: string
    searchPlaceholder: string
    reset: string
    loading: string
    nothingFound: string
    settingsTitle: string
    period: string
    format: string
    formatJsonl: string
    formatJsonlSubtitle: string
    formatCombined: string
    formatCombinedSubtitle: string
    includeForwarded: string
    includeReplies: string
    cta: (n: number) => string
    ctaEmpty: string
    ctaRunning: string
    resultsTitle: string
    clear: string
    download: string
    downloadAll: string
    summary: (msgs: number, files: number) => string
    open: string
    close: string
  }
  picker: {
    typeUser: string
    typeGroup: string
    typeChannel: string
    noName: string
  }
  range: {
    today: string
    yesterday: string
    last7: string
    last30: string
    thisMonth: string
    from: string
    to: string
  }
  progress: {
    preparing: string
    messagesUnit: string
  }
}

export const ru: Strings = {
  app: {
    title: 'gramsnap',
    tagline: 'Экспорт чатов Telegram',
    sessionHint: 'Сессия хранится в вашем браузере (localStorage)',
  },
  privacy: {
    title: 'Ваши данные — только у вас',
    subtitle: 'Как это работает технически',
    flowBrowser: 'Ваш браузер',
    flowBrowserNote: 'хранит сессию',
    flowServer: 'Этот сервер',
    flowServerNote: 'без БД, без логов',
    flowTelegram: 'Telegram',
    flowTelegramNote: 'оригинал',
    pointSession:
      'Сессия Telegram хранится только в localStorage браузера — на сервере не остаётся.',
    pointNoStore:
      'Сообщения и файлы не попадают в базу данных — сервер только проксирует MTProto.',
    pointDownload:
      'Экспорт скачивается напрямую к вам в браузер. Файлы не сохраняются на сервере.',
    pointPublic:
      'Используются публичные api_id Telegram Desktop. Никаких сторонних приложений или ключей.',
    disclaimer:
      'Это не E2E-шифрование. Доверять серверу нужно так же, как любому Telegram-клиенту, через который проходит трафик.',
  },
  auth: {
    titlePhone: 'Войдите в аккаунт',
    titleCode: 'Введите код',
    title2fa: 'Облачный пароль',
    hintPhone: 'Мы отправим код в ваше приложение Telegram',
    hintCode: 'Код отправлен в Telegram. Введите 5 цифр',
    hint2fa: 'У вас включена двухфакторная аутентификация',
    labelPhone: 'Номер телефона',
    labelCode: 'Код подтверждения',
    labelPassword: 'Пароль',
    placeholderPhone: '+7 999 123 45 67',
    sendCode: 'Отправить код',
    sending: 'Отправляю…',
    verify: 'Подтвердить',
    verifying: 'Проверяю…',
    signIn: 'Войти',
    signingIn: 'Вхожу…',
    resend: 'Отправить повторно',
    changeNumber: 'Сменить номер',
    errorSend: 'Не удалось отправить код',
    errorCode: 'Неверный код',
    errorPassword: 'Неверный пароль',
  },
  header: {
    signOut: 'Выйти',
    connected: 'подключено',
    language: 'Язык',
  },
  dashboard: {
    chats: 'Чаты',
    chatsForExport: 'Чаты для экспорта',
    nothingSelected: 'Не выбрано',
    selectedCount: (n) => `Выбрано: ${n}`,
    pickChats: 'Выбрать →',
    searchPlaceholder: 'Поиск по имени или @username',
    reset: 'Сбросить',
    loading: 'Загрузка…',
    nothingFound: 'Ничего не найдено',
    settingsTitle: 'Настройки экспорта',
    period: 'Период',
    format: 'Формат вывода',
    formatJsonl: 'Файл на каждый чат',
    formatJsonlSubtitle: 'JSONL · удобно для парсинга',
    formatCombined: 'Один общий JSON',
    formatCombinedSubtitle: 'все чаты в одном файле',
    includeForwarded: 'Включать пересланные сообщения',
    includeReplies: 'Включать ответы (replies)',
    cta: (n) => `Экспортировать (${n})`,
    ctaEmpty: 'Выберите чаты',
    ctaRunning: 'Экспортирую…',
    resultsTitle: 'Результаты',
    clear: 'Очистить',
    download: 'Скачать',
    downloadAll: 'Скачать всё',
    summary: (m, f) =>
      `Экспортировано ${m.toLocaleString('ru-RU')} сообщ. · файлов: ${f}`,
    open: 'Открыть список чатов',
    close: 'Закрыть',
  },
  picker: {
    typeUser: 'диалог',
    typeGroup: 'группа',
    typeChannel: 'канал',
    noName: '(без имени)',
  },
  range: {
    today: 'Сегодня',
    yesterday: 'Вчера',
    last7: '7 дней',
    last30: '30 дней',
    thisMonth: 'Этот месяц',
    from: 'С',
    to: 'По',
  },
  progress: {
    preparing: 'подготовка…',
    messagesUnit: 'сообщ.',
  },
}

export const en: Strings = {
  app: {
    title: 'gramsnap',
    tagline: 'Telegram chat exporter',
    sessionHint: 'Session is stored in your browser (localStorage)',
  },
  privacy: {
    title: 'Your data stays with you',
    subtitle: 'How this actually works',
    flowBrowser: 'Your browser',
    flowBrowserNote: 'holds the session',
    flowServer: 'This server',
    flowServerNote: 'no DB, no logs',
    flowTelegram: 'Telegram',
    flowTelegramNote: 'origin',
    pointSession:
      'Your Telegram session is stored only in your browser localStorage — never on the server.',
    pointNoStore:
      'Messages and files never touch a database — the server only proxies MTProto.',
    pointDownload:
      'Exports download straight to your browser. Nothing is persisted on the server.',
    pointPublic:
      "Public Telegram Desktop api_id is used. No third-party app or key registration.",
    disclaimer:
      'This is not E2E encryption. Trust the server like any Telegram client whose traffic passes through it.',
  },
  auth: {
    titlePhone: 'Sign in',
    titleCode: 'Enter code',
    title2fa: 'Cloud password',
    hintPhone: "We'll send a code to your Telegram app",
    hintCode: 'Check your Telegram for a 5-digit code',
    hint2fa: 'Two-factor authentication is enabled',
    labelPhone: 'Phone number',
    labelCode: 'Verification code',
    labelPassword: 'Password',
    placeholderPhone: '+1 555 123 4567',
    sendCode: 'Send code',
    sending: 'Sending…',
    verify: 'Verify',
    verifying: 'Verifying…',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    resend: 'Resend',
    changeNumber: 'Change number',
    errorSend: 'Failed to send code',
    errorCode: 'Invalid code',
    errorPassword: 'Invalid password',
  },
  header: {
    signOut: 'Sign out',
    connected: 'connected',
    language: 'Language',
  },
  dashboard: {
    chats: 'Chats',
    chatsForExport: 'Chats to export',
    nothingSelected: 'None selected',
    selectedCount: (n) => `${n} selected`,
    pickChats: 'Pick →',
    searchPlaceholder: 'Search by name or @username',
    reset: 'Clear',
    loading: 'Loading…',
    nothingFound: 'Nothing found',
    settingsTitle: 'Export settings',
    period: 'Date range',
    format: 'Output format',
    formatJsonl: 'One file per chat',
    formatJsonlSubtitle: 'JSONL · easy to parse',
    formatCombined: 'Single JSON',
    formatCombinedSubtitle: 'all chats in one file',
    includeForwarded: 'Include forwarded messages',
    includeReplies: 'Include replies',
    cta: (n) => `Export (${n})`,
    ctaEmpty: 'Pick chats first',
    ctaRunning: 'Exporting…',
    resultsTitle: 'Results',
    clear: 'Clear',
    download: 'Download',
    downloadAll: 'Download all',
    summary: (m, f) => `${m.toLocaleString('en-US')} messages · ${f} file${f === 1 ? '' : 's'}`,
    open: 'Open chat list',
    close: 'Close',
  },
  picker: {
    typeUser: 'chat',
    typeGroup: 'group',
    typeChannel: 'channel',
    noName: '(no name)',
  },
  range: {
    today: 'Today',
    yesterday: 'Yesterday',
    last7: '7 days',
    last30: '30 days',
    thisMonth: 'This month',
    from: 'From',
    to: 'To',
  },
  progress: {
    preparing: 'preparing…',
    messagesUnit: 'msgs',
  },
}

export const STRINGS: Record<Locale, Strings> = { ru, en }
