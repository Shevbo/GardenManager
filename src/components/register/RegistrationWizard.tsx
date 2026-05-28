'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { StepAddress } from './StepAddress'
import { StepDetails } from './StepDetails'
import { StepOtp } from './StepOtp'

type Org = { id: string; name: string } | null

export function RegistrationWizard() {
  const [step, setStep] = useState<'address' | 'details' | 'otp'>('address')

  const [rawAddress, setRawAddress] = useState('')
  const [checkLoading, setCheckLoading] = useState(false)
  const [checkError, setCheckError] = useState('')

  const [matched, setMatched] = useState(false)
  const [org, setOrg] = useState<Org>(null)

  const [apartmentNumber, setApartmentNumber] = useState('')
  const [areaSqm, setAreaSqm] = useState('')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')

  const [otp, setOtp] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpError, setOtpError] = useState('')

  async function checkAddress() {
    setCheckLoading(true); setCheckError('')
    try {
      const res = await fetch('/api/register/check-address', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawAddress: rawAddress.trim() }),
      })
      const data = await res.json() as { matched: boolean; org?: Org; error?: string }
      if (!res.ok) {
        setCheckError(data.error || 'Ошибка')
        return
      }
      setMatched(data.matched)
      setOrg(data.matched ? (data.org ?? null) : null)
      setStep('details')
    } catch {
      setCheckError('Сетевая ошибка')
    } finally { setCheckLoading(false) }
  }

  async function sendOtp() {
    if (!email.trim() || !fullName.trim()) {
      setDetailsError('Заполните ФИО и email')
      return
    }
    setDetailsLoading(true); setDetailsError('')
    try {
      const res = await fetch('/api/email-otp/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setDetailsError(data.error || 'Не удалось отправить код')
        return
      }
      setStep('otp')
    } catch {
      setDetailsError('Сетевая ошибка')
    } finally { setDetailsLoading(false) }
  }

  async function submit() {
    setOtpLoading(true); setOtpError('')
    try {
      const res = await fetch('/api/register/submit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          fullName: fullName.trim(),
          rawAddress: rawAddress.trim(),
          apartmentNumber: apartmentNumber.trim() || undefined,
          areaSqm: areaSqm.trim() ? Number(areaSqm) : undefined,
        }),
      })
      const data = await res.json() as { ok?: boolean; mode?: string; error?: string }
      if (!res.ok || !data.ok) {
        setOtpError(data.error || 'Не удалось завершить регистрацию')
        return
      }
      const r = await signIn('email-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        redirect: false,
      })
      if (r?.error) {
        setOtpError('Ошибка входа после регистрации. Войдите вручную.')
        return
      }
      const target = data.mode === 'pending' ? '/dashboard?welcome=pending' : '/dashboard?welcome=active'
      window.location.href = target
    } catch {
      setOtpError('Сетевая ошибка')
    } finally { setOtpLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md border border-gray-100">
        <h1 className="text-2xl font-semibold mb-1 text-center text-gray-900">
          Регистрация
        </h1>
        <p className="text-center text-sm text-gray-500 mb-6">
          Шаг {step === 'address' ? '1' : step === 'details' ? '2' : '3'} из 3
        </p>

        {step === 'address' && (
          <StepAddress value={rawAddress} onChange={setRawAddress}
            loading={checkLoading} error={checkError} onNext={checkAddress} />
        )}

        {step === 'details' && (
          <StepDetails
            matched={matched} org={org}
            apartmentNumber={apartmentNumber} areaSqm={areaSqm}
            fullName={fullName} email={email}
            error={detailsError} loading={detailsLoading}
            onChange={(p) => {
              if (p.apartmentNumber !== undefined) setApartmentNumber(p.apartmentNumber)
              if (p.areaSqm !== undefined) setAreaSqm(p.areaSqm)
              if (p.fullName !== undefined) setFullName(p.fullName)
              if (p.email !== undefined) setEmail(p.email)
            }}
            onBack={() => setStep('address')}
            onSubmit={sendOtp}
          />
        )}

        {step === 'otp' && (
          <StepOtp email={email} otp={otp} error={otpError} loading={otpLoading}
            onChange={setOtp} onResend={sendOtp} onSubmit={submit} />
        )}

        <p className="text-sm text-gray-500 text-center mt-6">
          Уже есть аккаунт? <a href="/login" className="text-blue-600 hover:underline">Войти</a>
        </p>
      </div>
    </div>
  )
}
