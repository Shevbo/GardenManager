import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { CommentForm } from '@/components/petition/CommentForm'

const STATUS_MAP: Record<string, { label: string; textColor: string; bgColor: string; borderColor: string }> = {
  DRAFT:       { label: 'Черновик',   textColor: '#6B6B63', bgColor: '#F0EDE6',  borderColor: '#C4BEB4' },
  DISCUSSION:  { label: 'Обсуждение', textColor: '#4B3FBF', bgColor: '#EDEAFC',  borderColor: '#9B8EE8' },
  AI_REVISION: { label: 'AI Ревизия', textColor: '#92400E', bgColor: '#FEF3C7',  borderColor: '#D97706' },
  SIGNING:     { label: 'Подписание', textColor: '#0A3D2E', bgColor: '#D6F4E5',  borderColor: '#0A3D2E' },
  CLOSED:      { label: 'Закрыто',    textColor: '#374151', bgColor: '#F3F4F6',  borderColor: '#9CA3AF' },
  EXPORTED:    { label: 'Готово',     textColor: '#145C43', bgColor: '#D1FAE5',  borderColor: '#10B981' },
}

function initials(name: string | null, email: string | null): string {
  if (name) return name.trim().split(/\s+/).map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (email ?? '?').slice(0, 2).toUpperCase()
}

export default async function PetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  const petition = await prisma.petition.findUnique({
    where: { id },
    include: {
      org: { select: { name: true }, },
      materials: true,
      comments: {
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { signatures: true } },
    },
  })

  if (!petition) notFound()

  const userSignature = session?.user
    ? await prisma.petitionSignature.findUnique({
        where: { petitionId_userId: { petitionId: id, userId: session.user.id } },
      })
    : null

  const canComment = petition.status === 'DISCUSSION'
  const canSign = petition.status === 'SIGNING' && !userSignature && !!session?.user
  const statusInfo = STATUS_MAP[petition.status] ?? STATUS_MAP.DRAFT
  const showText =
    petition.status === 'SIGNING' || petition.status === 'CLOSED' || petition.status === 'EXPORTED'
      ? (petition.finalText ?? petition.draftText)
      : petition.draftText

  const isCollecting = petition.status === 'SIGNING' || petition.status === 'CLOSED' || petition.status === 'EXPORTED'

  return (
    <div style={{ minHeight: '100%', background: 'var(--cream)', overflowY: 'auto' }}>

      {/* Navigation bar */}
      <div style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--white)',
        padding: '0 24px',
        height: '48px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Link href="/admin/petitions" style={{
          color: 'var(--ink-soft)',
          fontSize: '13px',
          textDecoration: 'none',
          fontFamily: 'Golos Text, sans-serif',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          transition: 'color 0.15s',
        }}>
          ← Заявления
        </Link>
        <span style={{ color: 'var(--border)', fontSize: '13px' }}>/</span>
        <span style={{ color: 'var(--ink-soft)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
          {petition.title}
        </span>
      </div>

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── Title block ────────────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
            <h1 style={{
              fontFamily: 'Unbounded, sans-serif',
              fontSize: 'clamp(20px, 3vw, 30px)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              margin: 0,
              flex: 1,
            }}>
              {petition.title}
            </h1>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '5px 11px',
              borderRadius: '5px',
              border: `2px solid ${statusInfo.borderColor}`,
              background: statusInfo.bgColor,
              color: statusInfo.textColor,
              fontSize: '10px',
              fontFamily: 'Unbounded, sans-serif',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              marginTop: '4px',
            }}>
              {statusInfo.label}
            </span>
          </div>

          {(petition.discussionDeadline || petition.signingDeadline) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {petition.discussionDeadline && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  color: 'var(--ink-soft)', fontSize: '12px', fontFamily: 'Golos Text, sans-serif',
                }}>
                  <span style={{ opacity: 0.6 }}>Обсуждение до</span>{' '}
                  <strong style={{ color: 'var(--ink-mid)', fontWeight: 600 }}>
                    {new Date(petition.discussionDeadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </strong>
                </span>
              )}
              {petition.signingDeadline && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  color: 'var(--ink-soft)', fontSize: '12px', fontFamily: 'Golos Text, sans-serif',
                }}>
                  <span style={{ opacity: 0.6 }}>Подписание до</span>{' '}
                  <strong style={{ color: 'var(--ink-mid)', fontWeight: 600 }}>
                    {new Date(petition.signingDeadline).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── Signature progress meter ────────────────────────────── */}
        {isCollecting && (
          <div style={{
            background: 'var(--forest)',
            borderRadius: '16px',
            padding: '28px 32px',
            marginBottom: '24px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative ring */}
            <div style={{
              position: 'absolute', top: '-40px', right: '-40px',
              width: '160px', height: '160px',
              borderRadius: '50%',
              border: '24px solid rgba(255,255,255,0.05)',
              pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', marginBottom: '18px' }}>
              <span style={{
                fontFamily: 'Unbounded, sans-serif',
                fontSize: 'clamp(40px, 8vw, 64px)',
                fontWeight: 900,
                lineHeight: 1,
                letterSpacing: '-0.03em',
                color: 'var(--amber)',
              }}>
                {petition._count.signatures}
              </span>
              <span style={{
                fontFamily: 'Golos Text, sans-serif',
                fontSize: '15px',
                color: 'rgba(255,255,255,0.65)',
                paddingBottom: '8px',
              }}>
                {petition._count.signatures === 1 ? 'подпись собрана' :
                 petition._count.signatures < 5 ? 'подписи собрано' : 'подписей собрано'}
              </span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.15)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, petition._count.signatures)}%`,
                background: 'var(--amber)',
                borderRadius: '3px',
                transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            </div>
          </div>
        )}

        {/* ── Document card ───────────────────────────────────────── */}
        <div style={{
          background: 'var(--white)',
          borderRadius: '14px',
          border: '1px solid var(--border)',
          borderLeft: '4px solid var(--forest)',
          overflow: 'hidden',
          marginBottom: '20px',
          boxShadow: '0 1px 4px rgba(10,61,46,0.06)',
        }}>
          <div style={{
            padding: '10px 24px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--cream)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <line x1="4.5" y1="4.5" x2="9.5" y2="4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="4.5" y1="6.5" x2="9.5" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="4.5" y1="8.5" x2="7.5" y2="8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span style={{
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
            }}>
              Текст заявления
            </span>
          </div>
          {/* ── Official header (шапка) ─────────────────────────── */}
          {(petition.recipient || petition.org.name) && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0',
              borderBottom: '1px solid var(--border)',
            }}>
              {/* Кому */}
              {petition.recipient && (
                <div style={{
                  padding: '20px 28px',
                  borderRight: '1px solid var(--border)',
                }}>
                  <p style={{
                    fontFamily: 'Unbounded, sans-serif',
                    fontSize: '9px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-soft)',
                    margin: '0 0 8px',
                  }}>
                    Кому
                  </p>
                  <p style={{
                    fontFamily: 'Golos Text, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.65',
                    color: 'var(--ink)',
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                  }}>
                    {petition.recipient}
                  </p>
                </div>
              )}
              {/* От кого */}
              <div style={{
                padding: '20px 28px',
                gridColumn: petition.recipient ? undefined : '1 / -1',
              }}>
                <p style={{
                  fontFamily: 'Unbounded, sans-serif',
                  fontSize: '9px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-soft)',
                  margin: '0 0 8px',
                }}>
                  От кого
                </p>
                <p style={{
                  fontFamily: 'Golos Text, sans-serif',
                  fontSize: '14px',
                  lineHeight: '1.65',
                  color: 'var(--ink)',
                  margin: '0 0 8px',
                }}>
                  {petition.org.name}
                </p>
                <p style={{
                  fontFamily: 'Golos Text, sans-serif',
                  fontSize: '13px',
                  color: 'var(--ink-soft)',
                  margin: 0,
                }}>
                  {petition._count.signatures > 0 && (
                    <>{petition._count.signatures} {
                      petition._count.signatures === 1 ? 'подписант' :
                      petition._count.signatures < 5 ? 'подписанта' : 'подписантов'
                    }</>
                  )}
                </p>
              </div>
            </div>
          )}

          <div style={{
            padding: '28px 28px 32px',
            fontFamily: 'Golos Text, sans-serif',
            fontSize: '15px',
            lineHeight: '1.8',
            color: 'var(--ink)',
            whiteSpace: 'pre-wrap',
          }}>
            {showText}
          </div>
        </div>

        {/* ── Materials ───────────────────────────────────────────── */}
        {petition.materials.length > 0 && (
          <div style={{
            background: 'var(--white)',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            padding: '18px 24px',
            marginBottom: '20px',
          }}>
            <p style={{
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color: 'var(--ink-soft)',
              margin: '0 0 12px',
            }}>
              Материалы
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {petition.materials.map(m => (
                <li key={m.id}>
                  <a
                    href={`/api/storage/${encodeURIComponent(m.url)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--forest)',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontFamily: 'Golos Text, sans-serif',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '7px',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>📎</span>
                    <span style={{ borderBottom: '1px dashed rgba(10,61,46,0.3)' }}>{m.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Sign CTA ────────────────────────────────────────────── */}
        {canSign && (
          <div style={{
            background: 'var(--forest)',
            borderRadius: '16px',
            padding: '28px 32px',
            marginBottom: '20px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', bottom: '-30px', right: '-30px',
              width: '120px', height: '120px',
              borderRadius: '50%',
              border: '20px solid rgba(255,255,255,0.06)',
              pointerEvents: 'none',
            }} />
            <h3 style={{
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--white)',
              margin: '0 0 8px',
            }}>
              Поддержите это заявление
            </h3>
            <p style={{
              fontFamily: 'Golos Text, sans-serif',
              fontSize: '14px',
              color: 'rgba(255,255,255,0.65)',
              margin: '0 0 22px',
              lineHeight: 1.6,
            }}>
              Ваша подпись юридически значима и войдёт в официальный лист подписей
            </p>
            <Link href={`/petition/${id}/sign`} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--amber)',
              color: 'var(--ink)',
              padding: '13px 24px',
              borderRadius: '10px',
              fontFamily: 'Unbounded, sans-serif',
              fontSize: '13px',
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}>
              Поставить подпись →
            </Link>
          </div>
        )}

        {/* ── Already signed ──────────────────────────────────────── */}
        {userSignature && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            background: '#EDFAF3',
            border: '1px solid #7ECFA4',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '20px',
          }}>
            <div style={{
              width: '38px', height: '38px',
              borderRadius: '50%',
              background: 'var(--forest)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              flexShrink: 0,
              fontWeight: 700,
            }}>
              ✓
            </div>
            <div>
              <p style={{
                margin: 0,
                fontFamily: 'Unbounded, sans-serif',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--forest)',
                letterSpacing: '-0.01em',
              }}>
                Вы подписали это заявление
              </p>
              <p style={{
                margin: '3px 0 0',
                fontSize: '12px',
                fontFamily: 'Golos Text, sans-serif',
                color: '#3D8B65',
              }}>
                {userSignature.signedAt.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {/* ── Discussion ──────────────────────────────────────────── */}
        {canComment && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <h2 style={{
                fontFamily: 'Unbounded, sans-serif',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--ink)',
                margin: 0,
              }}>
                Обсуждение
              </h2>
              {petition.comments.length > 0 && (
                <span style={{
                  background: 'var(--cream-dark)',
                  color: 'var(--ink-soft)',
                  fontSize: '11px',
                  fontFamily: 'Golos Text, sans-serif',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '20px',
                }}>
                  {petition.comments.length}
                </span>
              )}
            </div>

            {petition.comments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {petition.comments.map(c => (
                  <div key={c.id} style={{
                    background: 'var(--white)',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                    padding: '16px 20px',
                    display: 'flex',
                    gap: '12px',
                  }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      background: 'var(--forest)',
                      color: 'var(--white)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontFamily: 'Unbounded, sans-serif',
                      fontWeight: 700,
                      flexShrink: 0,
                      letterSpacing: '0',
                    }}>
                      {initials(c.user.name, c.user.email)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{
                          fontFamily: 'Golos Text, sans-serif',
                          fontWeight: 600,
                          fontSize: '13px',
                          color: 'var(--ink)',
                        }}>
                          {c.user.name ?? c.user.email}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--ink-soft)', fontFamily: 'Golos Text, sans-serif' }}>
                          {new Date(c.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        fontFamily: 'Golos Text, sans-serif',
                        color: 'var(--ink-mid)',
                        lineHeight: '1.65',
                      }}>
                        {c.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {session?.user ? (
              <CommentForm petitionId={id} />
            ) : (
              <div style={{
                background: 'var(--cream-dark)',
                borderRadius: '10px',
                padding: '16px 20px',
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--ink-soft)',
                fontFamily: 'Golos Text, sans-serif',
              }}>
                <Link href="/login" style={{ color: 'var(--forest)', textDecoration: 'none', fontWeight: 600 }}>Войдите</Link>,
                {' '}чтобы оставить комментарий
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
