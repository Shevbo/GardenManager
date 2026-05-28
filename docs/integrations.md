# Garden Manager — external integrations

Сводка где брать ключи для каждой интеграции.

## DaData (КЛАДР, адреса)

Используется в `AddressAutocomplete` для автокомплита адресов в регистрации и при добавлении объектов недвижимости.

1. Зарегистрироваться на https://dadata.ru/api/
2. Перейти в личный кабинет → «API ключи» → скопировать **API-ключ** (не «секретный ключ»)
3. Установить `DADATA_API_KEY` в env
4. Тариф: free (10k запросов/день) хватает для нашего трафика

Без ключа: AddressAutocomplete показывает плашку «недоступно, введите вручную».

## SMSC.ru (SMS)

Используется для верификации телефона и SMS-подписи декларации собственности.

1. Зарегистрироваться на https://smsc.ru
2. Положить минимум 100 рублей на баланс (один SMS ≈ 1-2₽)
3. В «Настройках» включить «API» и завести отдельный API-логин
4. Установить `SMS_API_LOGIN`, `SMS_API_PASSWORD`. `SMS_SENDER` = `GARDEN`

Без ключей: dev-fallback логирует код в консоль. В проде верификация телефона невозможна.

## Resend (email)

Используется для email-OTP при входе/регистрации, уведомлений админу о новых заявках, оповещений юзера об одобрении.

1. Зарегистрироваться на https://resend.com
2. Подтвердить домен `shectory.ru` (или поддомен `garden.shectory.ru`)
3. Создать API key: https://resend.com/api-keys
4. Установить `RESEND_API_KEY` и `EMAIL_FROM="noreply@garden.shectory.ru"`

Без ключа: email не отправляется, в логах warn.

## Telegram Bot (админ-уведомления)

Используется для уведомления платформ-админа о новых PendingRegistration в реальном времени.

Вариант A — переиспользовать существующий `shectory-assist-bot`:
1. `TELEGRAM_BOT_TOKEN` = тот же что в `~/shectory-assist/.env` на хостере
2. Узнать chat_id админа: написать сообщение боту от своего Telegram-аккаунта, затем:
   ```bash
   curl "https://api.telegram.org/bot{TOKEN}/getUpdates" | jq '.result[].message.chat.id'
   ```
3. Установить `TELEGRAM_ADMIN_CHAT_ID`

Вариант B — новый бот:
1. Создать через @BotFather, получить токен
2. Дальше как в варианте A

Без ключей: уведомления только в `console.warn`. Email-копия уходит если `PLATFORM_ADMIN_EMAIL` + Resend настроены.

## DeepSeek (AI ревизия петиций)

1. Зарегистрироваться на https://deepseek.com
2. Получить API key: https://platform.deepseek.com/api_keys
3. Установить `DEEPSEEK_API_KEY`

Без ключа: кнопка AI-ревизии недоступна.

## S3 (хранилище материалов)

Используется для загрузки материалов к петициям. В проде сейчас используется встроенный storage. Для своего bucket — настроить через env переменные `S3_*`.
