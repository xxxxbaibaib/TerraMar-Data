import { Link, Navigate, useParams } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../lib/auth/AuthContext'
import { tryAwardResourceArticleComplete } from '../lib/auth/mockAuthStore'
import { upsertResourceProgressRemote } from '../lib/account/resourceProgressRemote'
import { isMockAuthMode } from '../lib/supabase/env'
import { getSupabaseClient } from '../lib/supabase/client'
import { resolveAuthUserForProfileWrites } from '../lib/supabase/resolveAuthUserForProfileWrites'
import { remoteTryAwardResourceArticleComplete } from '../lib/auth/profileRemoteUpdates'
import {
  combinedResourceProgress,
  getSlugProgress,
  setResourceTextProgress,
  setResourceVideoProgress,
} from '../lib/resources/resourceProgressStore'
import { resources } from '../mock/resources'
import { trackEvent } from '../lib/analytics'

const SAVE_MS = 220
const REMOTE_SYNC_MS = 650

export function ResourceArticlePage() {
  const { slug } = useParams()
  const { user, isAuthenticated, refreshUser } = useAuth()
  const mockMode = isMockAuthMode()
  const article = slug ? resources.find((r) => r.slug === slug) : undefined
  const scrollRef = useRef<HTMLDivElement>(null)
  const textSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const videoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remoteSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [textPct, setTextPct] = useState(0)
  const [videoPct, setVideoPct] = useState(0)
  const userId = isAuthenticated && user ? user.id : undefined
  const hasVideo = Boolean(article?.videoUrl)

  const scheduleRemoteProgressSync = useCallback(() => {
    if (!userId || !slug || mockMode) return
    if (remoteSyncTimer.current) window.clearTimeout(remoteSyncTimer.current)
    remoteSyncTimer.current = window.setTimeout(() => {
      remoteSyncTimer.current = null
      const s = getSlugProgress(userId, slug)
      const c = combinedResourceProgress(hasVideo, s)
      void upsertResourceProgressRemote(userId, slug, {
        textPct: s.textPct,
        videoPct: s.videoPct,
        completedOnce: c >= 100,
      }).catch((err) => console.warn('[TerraMar] resource_progress 云端同步', err))
    }, REMOTE_SYNC_MS)
  }, [userId, slug, mockMode, hasVideo])

  const persistText = useCallback(
    (pct: number) => {
      if (!userId || !slug) return
      setResourceTextProgress(userId, slug, pct)
      scheduleRemoteProgressSync()
    },
    [userId, slug, scheduleRemoteProgressSync],
  )

  const persistVideo = useCallback(
    (pct: number) => {
      if (!userId || !slug) return
      setResourceVideoProgress(userId, slug, pct)
      scheduleRemoteProgressSync()
    },
    [userId, slug, scheduleRemoteProgressSync],
  )

  /** 已登录用户首次进入阅读页：写入最小正文进度，便于「我的课程」仅展示已点开过的资源 */
  useEffect(() => {
    if (!slug || !userId || !article) return
    const s = getSlugProgress(userId, slug)
    let text = s.textPct
    const vid = hasVideo ? s.videoPct : 100
    const c = combinedResourceProgress(hasVideo, { textPct: text, videoPct: vid, updatedAt: s.updatedAt })
    if (c === 0) {
      setResourceTextProgress(userId, slug, 1)
      text = Math.max(text, 1)
      if (!mockMode) scheduleRemoteProgressSync()
    }
    setTextPct(text)
    setVideoPct(hasVideo ? s.videoPct : 100)
  }, [slug, userId, article, hasVideo, mockMode, scheduleRemoteProgressSync])

  useEffect(() => {
    if (!slug) return
    trackEvent('view_resource_article', { slug })
  }, [slug])

  useEffect(() => {
    return () => {
      if (textSaveTimer.current) window.clearTimeout(textSaveTimer.current)
      if (videoSaveTimer.current) window.clearTimeout(videoSaveTimer.current)
      if (remoteSyncTimer.current) window.clearTimeout(remoteSyncTimer.current)
    }
  }, [])

  const combined = useMemo(
    () =>
      article
        ? combinedResourceProgress(hasVideo, {
            textPct,
            videoPct: hasVideo ? videoPct : 100,
            updatedAt: '',
          })
        : 0,
    [article, hasVideo, textPct, videoPct],
  )

  useEffect(() => {
    if (!userId || !slug || combined < 100) return
    let cancelled = false
    void (async () => {
      if (mockMode) {
        if (tryAwardResourceArticleComplete(userId, slug)) await refreshUser()
        return
      }
      const supabase = getSupabaseClient()
      const authUser = await resolveAuthUserForProfileWrites(supabase)
      if (!authUser || cancelled) return
      if (await remoteTryAwardResourceArticleComplete(userId, authUser, slug)) await refreshUser()
    })()
    return () => {
      cancelled = true
    }
  }, [combined, userId, slug, refreshUser, mockMode])

  const scheduleTextSave = useCallback(
    (pct: number) => {
      setTextPct(pct)
      if (textSaveTimer.current) window.clearTimeout(textSaveTimer.current)
      textSaveTimer.current = window.setTimeout(() => persistText(pct), SAVE_MS)
    },
    [persistText],
  )

  const flushVideoProgress = useCallback(
    (v: HTMLVideoElement) => {
      if (!userId || !slug) return
      if (!v.duration || !Number.isFinite(v.duration) || v.duration <= 0) return
      const p = (v.currentTime / v.duration) * 100
      if (videoSaveTimer.current) {
        window.clearTimeout(videoSaveTimer.current)
        videoSaveTimer.current = null
      }
      setVideoPct(p)
      persistVideo(p)
    },
    [userId, slug, persistVideo],
  )

  /** 正文随「整页滚动」推进：原先只监听内层 overflow 盒子，用户滚页面读正文时 scrollTop 不变，会卡在 1%。 */
  const updateTextProgressFromPageScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || !userId || !slug) return
    const docTop = el.getBoundingClientRect().top + window.scrollY
    const h = el.scrollHeight
    if (h <= 1) return
    const viewBottom = window.scrollY + window.innerHeight
    const pct = Math.max(0, Math.min(100, ((viewBottom - docTop) / h) * 100))
    scheduleTextSave(pct)
  }, [userId, slug, scheduleTextSave])

  useEffect(() => {
    if (!article || !userId) return
    const tick = () => {
      requestAnimationFrame(() => updateTextProgressFromPageScroll())
    }
    tick()
    window.addEventListener('scroll', tick, { passive: true })
    window.addEventListener('resize', tick, { passive: true })
    let ro: ResizeObserver | null = null
    const el = scrollRef.current
    if (el) {
      ro = new ResizeObserver(tick)
      ro.observe(el)
    }
    return () => {
      window.removeEventListener('scroll', tick)
      window.removeEventListener('resize', tick)
      ro?.disconnect()
    }
  }, [article, userId, slug, updateTextProgressFromPageScroll])

  if (!article) return <Navigate to="/resources" replace />

  const paragraphs = article.paragraphs?.length ? article.paragraphs : [article.summary]

  return (
    <div className="section-shell bg-[var(--bg-base)] pb-24 pt-28">
      <div className="container-page max-w-3xl">
        <nav className="text-sm text-[var(--text-secondary)]">
          <Link to="/resources" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
            资源中心
          </Link>
          <span className="mx-2">/</span>
          <span className="text-[var(--text-primary)]">{article.title}</span>
        </nav>

        <header className="mt-6">
          <p className="text-xs text-[var(--brand-accent)]">{article.category}</p>
          <h1 className="mt-2 font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">{article.title}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{article.summary}</p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{article.date}</p>
        </header>

        <div className="card mt-8 p-5 shadow-[var(--shadow-soft)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[var(--brand-deep)]">学习进度</p>
            <span className="text-sm text-[var(--text-secondary)]">{Math.round(combined)}%</span>
          </div>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[rgba(47,79,58,0.1)]"
            role="progressbar"
            aria-valuenow={Math.round(combined)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, combined))}%` }}
            />
          </div>
          {hasVideo ? (
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              明细：正文约 <strong className="font-medium text-[var(--text-primary)]">{Math.round(textPct)}%</strong>
              {' · '}
              视频约 <strong className="font-medium text-[var(--text-primary)]">{Math.round(videoPct)}%</strong>
              {' · '}
              综合按正文 45%、视频 55% 加权；正文进度随<strong className="font-medium text-[var(--text-primary)]">页面滚动</strong>
              经过正文区域计算，请把页面滚到文末；视频需播放到结束。
            </p>
          ) : null}
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            {hasVideo
              ? '正文阅读与视频播放均会计入；进度满 100% 后才会发放资源轨积分并写入学习记录。'
              : '根据正文阅读滚动实时更新。'}
            {!userId
              ? '登录后进度会写入本机并与「我的课程」同步。'
              : mockMode
                ? null
                : '登录后进度会写入本机并同步至云端资源进度表。'}
          </p>
        </div>

        {article.videoUrl ? (
          <div className="card mt-6 overflow-hidden p-0 shadow-[var(--shadow-soft)]">
            <video
              className="aspect-video w-full bg-black"
              src={article.videoUrl}
              controls
              playsInline
              onTimeUpdate={(e) => {
                const v = e.currentTarget
                if (!v.duration || !Number.isFinite(v.duration)) return
                const p = (v.currentTime / v.duration) * 100
                setVideoPct(p)
                if (videoSaveTimer.current) window.clearTimeout(videoSaveTimer.current)
                videoSaveTimer.current = window.setTimeout(() => persistVideo(p), SAVE_MS)
              }}
              onPause={(e) => flushVideoProgress(e.currentTarget)}
              onEnded={() => {
                if (videoSaveTimer.current) {
                  window.clearTimeout(videoSaveTimer.current)
                  videoSaveTimer.current = null
                }
                setVideoPct(100)
                persistVideo(100)
              }}
            >
              您的浏览器不支持视频播放。
            </video>
          </div>
        ) : null}

        <div ref={scrollRef} className="card mt-6 space-y-4 p-6 shadow-[var(--shadow-soft)]">
          {paragraphs.map((para, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-[var(--text-primary)]">
              {para}
            </p>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
          <Link to="/resources" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
            返回资源列表
          </Link>
          {' · '}
          <Link to="/account/courses" className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline">
            我的课程
          </Link>
        </p>
      </div>
    </div>
  )
}
