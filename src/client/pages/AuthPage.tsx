import { useEffect, useRef, useState } from 'react'
import { api, type AuthUser } from '../api'
import { useTranslation } from '../i18n/useTranslation'
import { LangSwitcher } from '../components/LangSwitcher'
import { PrivacyAssurance } from '../components/PrivacyAssurance'
import { GlassButton } from '../components/GlassButton'

type Step = 'phone' | 'code' | '2fa'

interface AuthPageProps {
  onAuthenticated: (user: AuthUser, session: string) => void
}

const CODE_LENGTH = 5

export function AuthPage({ onAuthenticated }: AuthPageProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [authId, setAuthId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const codeInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (step === 'code') codeInputRef.current?.focus()
  }, [step])

  const sendCode = async (forceResend = false) => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.authStart(phone)
      if (res.status === 'already_authorized' && res.user && res.session) {
        onAuthenticated(res.user, res.session)
        return
      }
      if (res.authId) setAuthId(res.authId)
      if (!forceResend) setStep('code')
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorSend)
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async (codeValue: string) => {
    if (!authId) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.authVerify(authId, codeValue)
      if (res.status === '2fa_required') {
        if (res.authId) setAuthId(res.authId)
        setStep('2fa')
        return
      }
      if (res.status === 'ok' && res.user && res.session) {
        onAuthenticated(res.user, res.session)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorCode)
    } finally {
      setBusy(false)
    }
  }

  const submit2fa = async () => {
    if (!authId) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.authPassword(authId, password)
      if (res.user && res.session) onAuthenticated(res.user, res.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.auth.errorPassword)
    } finally {
      setBusy(false)
    }
  }

  const titles: Record<Step, string> = {
    phone: t.auth.titlePhone,
    code: t.auth.titleCode,
    '2fa': t.auth.title2fa,
  }
  const hints: Record<Step, string> = {
    phone: t.auth.hintPhone,
    code: t.auth.hintCode,
    '2fa': t.auth.hint2fa,
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="flex justify-end">
          <LangSwitcher />
        </div>

        <div className="glass glass-strong glass-refract rounded-3xl p-7 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <div className="text-xs uppercase tracking-wider text-accent font-semibold">
              {t.app.title}
            </div>
            <h1 className="text-xl font-semibold">{titles[step]}</h1>
            <p className="text-sm text-text-muted">{hints[step]}</p>
          </div>

          {step === 'phone' && (
            <>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  {t.auth.labelPhone}
                </span>
                <input
                  type="tel"
                  placeholder={t.auth.placeholderPhone}
                  value={phone}
                  autoFocus
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && phone.trim().length > 0) void sendCode()
                  }}
                />
              </label>
              <div className="flex justify-center pt-1">
                <GlassButton
                  disabled={busy || phone.trim().length === 0}
                  onClick={() => void sendCode()}
                >
                  {busy ? t.auth.sending : t.auth.sendCode}
                </GlassButton>
              </div>
            </>
          )}

          {step === 'code' && (
            <>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  {t.auth.labelCode}
                </span>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={CODE_LENGTH}
                  value={code}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH)
                    setCode(v)
                    if (v.length === CODE_LENGTH) void verifyCode(v)
                  }}
                  style={{
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    fontSize: '24px',
                    letterSpacing: '12px',
                    textAlign: 'center',
                    paddingLeft: '12px',
                  }}
                />
              </label>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => void sendCode(true)}
                  disabled={busy}
                  className="text-accent hover:underline disabled:opacity-50"
                >
                  {t.auth.resend}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep('phone')
                    setCode('')
                    setError(null)
                  }}
                  className="text-text-muted hover:text-text"
                >
                  {t.auth.changeNumber}
                </button>
              </div>
              <div className="flex justify-center pt-1">
                <GlassButton
                  disabled={busy || code.length !== CODE_LENGTH}
                  onClick={() => void verifyCode(code)}
                >
                  {busy ? t.auth.verifying : t.auth.verify}
                </GlassButton>
              </div>
            </>
          )}

          {step === '2fa' && (
            <>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-text-muted text-xs uppercase tracking-wide">
                  {t.auth.labelPassword}
                </span>
                <input
                  type="password"
                  value={password}
                  autoFocus
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && password.length > 0) void submit2fa()
                  }}
                />
              </label>
              <div className="flex justify-center pt-1">
                <GlassButton
                  disabled={busy || password.length === 0}
                  onClick={() => void submit2fa()}
                >
                  {busy ? t.auth.signingIn : t.auth.signIn}
                </GlassButton>
              </div>
            </>
          )}

          {error && (
            <div className="text-error text-sm bg-error/10 border border-error/30 rounded-lg p-3">
              {error}
            </div>
          )}

          <p className="text-xs text-text-muted text-center mt-1">{t.app.sessionHint}</p>
        </div>

        <PrivacyAssurance />
      </div>
    </div>
  )
}
