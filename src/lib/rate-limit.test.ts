import { describe, it, expect } from 'vitest'
import { createRateLimiter } from './rate-limit'

describe('createRateLimiter', () => {
  it('allows up to the limit inside the window', () => {
    const take = createRateLimiter(3, 1000)
    expect(take('ip1', 0).allowed).toBe(true)
    expect(take('ip1', 100).allowed).toBe(true)
    expect(take('ip1', 200).allowed).toBe(true)
    expect(take('ip1', 300).allowed).toBe(false)
  })

  it('reports when the caller may retry', () => {
    const take = createRateLimiter(1, 1000)
    take('ip1', 0)
    const r = take('ip1', 400)
    expect(r.allowed).toBe(false)
    expect(r.retryAfterSec).toBe(1) // окно закрывается через 600мс → округляем вверх
  })

  it('lets the window slide', () => {
    const take = createRateLimiter(2, 1000)
    take('ip1', 0)
    take('ip1', 100)
    expect(take('ip1', 900).allowed).toBe(false)
    expect(take('ip1', 1101).allowed).toBe(true) // первые две попытки уже вне окна
  })

  it('counts each key separately', () => {
    const take = createRateLimiter(1, 1000)
    expect(take('ip1', 0).allowed).toBe(true)
    expect(take('ip2', 0).allowed).toBe(true)
    expect(take('ip1', 0).allowed).toBe(false)
  })

  it('does not grow unboundedly — stale keys are dropped', () => {
    const take = createRateLimiter(1, 1000, 10)
    for (let i = 0; i < 50; i++) take(`ip${i}`, 0)
    expect(take('ip0', 5000).allowed).toBe(true) // окно давно прошло, ключ очищен или устарел
    expect(take.size()).toBeLessThanOrEqual(20)
  })
})
