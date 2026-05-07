import type { SpeciesObservation } from './mapTypes'

export const speciesObservations: SpeciesObservation[] = [
  {
    id: 'obs-001',
    speciesNameCn: '白鹭',
    speciesNameEn: 'Little Egret',
    topic: 'birds',
    observedAt: '2026-04-15T08:20:00.000Z',
    location: { id: 'obs-loc-1', lng: 120.17, lat: 30.26, city: '杭州', province: '浙江' },
    observerType: 'family',
    verificationStatus: 'verified',
  },
  {
    id: 'obs-002',
    speciesNameCn: '柑橘凤蝶',
    topic: 'insects',
    observedAt: '2026-04-20T15:40:00.000Z',
    location: { id: 'obs-loc-2', lng: 118.35, lat: 29.23, city: '衢州', province: '浙江' },
    observerType: 'volunteer',
    verificationStatus: 'pending_review',
  },
]
