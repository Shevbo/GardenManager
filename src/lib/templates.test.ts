import { describe, it, expect } from 'vitest'
import { applyTemplate, missingRequired, profileVariableValues } from './templates'
import type { TemplateVariable } from './pdf/types'

const vars: TemplateVariable[] = [
  { name: 'applicant_name', label: 'ФИО', type: 'text', required: true, source: 'profile' },
  { name: 'addressee', label: 'Адресат', type: 'text', required: true, source: 'manual' },
  { name: 'note', label: 'Примечание', type: 'multiline', required: false, source: 'manual' },
]

describe('applyTemplate', () => {
  it('substitutes {{name}} placeholders', () => {
    const out = applyTemplate('Я, {{applicant_name}}, прошу {{addressee}}.', { applicant_name: 'Иванов', addressee: 'мэра' })
    expect(out).toBe('Я, Иванов, прошу мэра.')
  })
  it('replaces missing values with empty string', () => {
    expect(applyTemplate('X={{nope}}', {})).toBe('X=')
  })
})

describe('missingRequired', () => {
  it('lists required vars with empty values', () => {
    expect(missingRequired(vars, { applicant_name: 'Иванов', addressee: '' })).toEqual(['Адресат'])
  })
  it('returns [] when all required filled', () => {
    expect(missingRequired(vars, { applicant_name: 'Иванов', addressee: 'мэра' })).toEqual([])
  })
  it('ignores optional empties', () => {
    expect(missingRequired(vars, { applicant_name: 'И', addressee: 'a', note: '' })).toEqual([])
  })
})

describe('profileVariableValues', () => {
  it('fills profile-source vars from the user, leaves manual untouched', () => {
    const got = profileVariableValues(vars, { name: 'Пётр', phone: '+7900', email: 'p@x.ru', address: 'ул. Сад, 1' })
    expect(got).toEqual({ applicant_name: 'Пётр' })
  })
})
