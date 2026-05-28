import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendTelegramAdmin, notifyAdminNewRegistration, notifyUserApproved } from './notifications'

describe('sendTelegramAdmin', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => {
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_ADMIN_CHAT_ID
  })

  it('logs in dev when no env configured', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await sendTelegramAdmin('test message')
    expect(warnSpy).toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('calls telegram API when configured', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    process.env.TELEGRAM_ADMIN_CHAT_ID = '12345'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    await sendTelegramAdmin('hello')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.telegram.org/bottest-token/sendMessage',
      expect.objectContaining({ method: 'POST' })
    )
    vi.unstubAllGlobals()
  })

  it('does not throw on telegram failure', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token'
    process.env.TELEGRAM_ADMIN_CHAT_ID = '12345'
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')))
    await expect(sendTelegramAdmin('hello')).resolves.toBeUndefined()
    vi.unstubAllGlobals()
  })
})

describe('notifyAdminNewRegistration', () => {
  it('returns without throw on missing config', async () => {
    await expect(notifyAdminNewRegistration({
      requestedAddress: 'Москва',
      userName: 'Тест',
      userEmail: 't@t.t',
      registrationId: 'r1',
      apartmentNumber: '47',
      areaSqm: 50,
    })).resolves.toBeUndefined()
  })
})

describe('notifyUserApproved', () => {
  it('returns without throw on missing config', async () => {
    await expect(notifyUserApproved({
      email: 't@t.t',
      address: 'Москва',
      orgName: 'ЖК Тестовый',
    })).resolves.toBeUndefined()
  })
})
