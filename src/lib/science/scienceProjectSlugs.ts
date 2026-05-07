import { scienceProjects } from '../../mock/scienceProjects'

const ALLOWED_SLUGS = new Set(scienceProjects.map((p) => p.slug))

export function parseScienceProjectSlug(raw: string | null | undefined): string | null {
  if (raw == null || typeof raw !== 'string') return null
  const t = raw.trim()
  if (!t || !ALLOWED_SLUGS.has(t)) return null
  return t
}

export function scienceProjectTitle(slug: string): string {
  return scienceProjects.find((p) => p.slug === slug)?.title ?? slug
}
