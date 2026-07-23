import { describe, expect, it } from 'vitest'
import { buildShareUrl, parseSharedRoute } from './shareUrl.ts'

const origin = { label: 'Praça do Comércio, Lisboa', lat: 38.707751, lon: -9.136592 }
const destination = { label: 'Castelo de São Jorge, Lisboa', lat: 38.713616, lon: -9.133393 }

describe('buildShareUrl / parseSharedRoute', () => {
  it('round-trips origin, destination, and mode through the URL', () => {
    const url = buildShareUrl('/', origin, destination, 'climb')
    const shared = parseSharedRoute(url.slice(url.indexOf('?')))
    expect(shared).not.toBeNull()
    expect(shared?.mode).toBe('climb')
    expect(shared?.origin.label).toBe(origin.label)
    expect(shared?.origin.lat).toBeCloseTo(origin.lat, 5)
    expect(shared?.origin.lon).toBeCloseTo(origin.lon, 5)
    expect(shared?.destination.label).toBe(destination.label)
    expect(shared?.destination.lat).toBeCloseTo(destination.lat, 5)
    expect(shared?.destination.lon).toBeCloseTo(destination.lon, 5)
  })

  it('defaults to energy mode when the mode param is missing or invalid', () => {
    expect(parseSharedRoute('?olat=1&olon=2&olabel=a&dlat=3&dlon=4&dlabel=b')?.mode).toBe('energy')
    expect(parseSharedRoute('?olat=1&olon=2&olabel=a&dlat=3&dlon=4&dlabel=b&mode=bogus')?.mode).toBe('energy')
  })

  it('returns null when required params are missing', () => {
    expect(parseSharedRoute('')).toBeNull()
    expect(parseSharedRoute('?olat=1&olon=2&olabel=a')).toBeNull()
  })

  it('returns null when coordinates are not finite numbers', () => {
    expect(parseSharedRoute('?olat=nope&olon=2&olabel=a&dlat=3&dlon=4&dlabel=b')).toBeNull()
  })

  it('returns null when a label is empty', () => {
    expect(parseSharedRoute('?olat=1&olon=2&olabel=&dlat=3&dlon=4&dlabel=b')).toBeNull()
  })
})
