import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import L from 'leaflet'
import { getSubjectSubtypeOptionsForCooperationSubject } from '../../mock/map/cooperationMapConstants'
import { mapFiltersByPage } from '../../mock/map/mapFilters'
import type { MapNode, MapPageType, SpeciesObservation } from '../../mock/map/mapTypes'
import { useMapDashboardMetrics } from '../../lib/map/useMapDashboardMetrics'
import { useMapLocationsBaseNodes } from '../../lib/map/useMapLocationsBaseNodes'
import { useOrgPartnerMapNodes } from '../../lib/map/useOrgPartnerMapNodes'
import { useSpeciesObservationMapNodes } from '../../lib/map/useSpeciesObservationMapNodes'
import { useWelfareEnrollmentMapNodes } from '../../lib/map/useWelfareEnrollmentMapNodes'
import { useWelfareProjectSitesForImpact } from '../../lib/map/useWelfareProjectSitesForImpact'
import {
  parseSiteBoundaryGeometry,
  welfareProjectSiteToMapNode,
  type WelfareProjectSiteRow,
} from '../../lib/map/welfareProjectSitesRemote'
import { mapFilterOptionValue } from '../../mock/map/mapTypes'
import { trackEvent } from '../../lib/analytics'
import { MapDetailDrawer } from './MapDetailDrawer'
import { MapFilterBar } from './MapFilterBar'
import { MapInsightPanel } from './MapInsightPanel'
import { MapLayerSwitcher } from './MapLayerSwitcher'
import { heroMapVideoByPage } from '../../config/heroMedia'
import { MapUploadEntry } from './MapUploadEntry'

interface MapHeroShellProps {
  page: MapPageType
  title: string
  subtitle: string
  cta: { label: string; to: string }
  /** 若设置，主 CTA 渲染为按钮并调用（用于公益页「先选项目」等） */
  ctaOnClick?: () => void
  secondaryCta?: { label: string; to: string }
}

const mapCenterByPage: Record<MapPageType, [number, number]> = {
  programs: [30.25, 119.6],
  cooperation: [30.35, 119.8],
  impact: [29.95, 119.5],
  science: [29.7, 119.2],
}

interface LeafletMapCanvasProps {
  page: MapPageType
  nodes: MapNode[]
  layers: { key: string; label: string; enabled: boolean }[]
  onNodeClick: (node: MapNode) => void
  /** Impact：公益项目地（点/面），与报名表点位分层 */
  impactProjectSites?: WelfareProjectSiteRow[]
  onImpactProjectSiteClick?: (site: WelfareProjectSiteRow) => void
}

function LeafletMapCanvas({
  page,
  nodes,
  layers,
  onNodeClick,
  impactProjectSites,
  onImpactProjectSiteClick,
}: LeafletMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<{
    tileLayer?: L.TileLayer
    heatLayer?: L.LayerGroup
    pointLayer?: L.LayerGroup
  }>({})

  const isEnabled = (key: string) => layers.find((layer) => layer.key === key)?.enabled

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const zoom = page === 'science' ? 6 : 5.8
    const map = L.map(containerRef.current, {
      center: mapCenterByPage[page],
      zoom,
      zoomControl: true,
      attributionControl: true,
    })
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layersRef.current = {}
    }
  }, [page])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (layersRef.current.tileLayer) {
      map.removeLayer(layersRef.current.tileLayer)
    }

    const tileLayer = isEnabled('satellite')
      ? L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { attribution: '&copy; Esri' },
        )
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
        })

    tileLayer.addTo(map)
    layersRef.current.tileLayer = tileLayer

    return () => {
      if (map && tileLayer) map.removeLayer(tileLayer)
    }
  }, [layers])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const heatLayer = L.layerGroup()
    const pointLayer = L.layerGroup()

    if (isEnabled('heat')) {
      nodes.forEach((node) => {
        L.circle([node.location.lat, node.location.lng], {
          radius: 28000,
          color: '#6E8F97',
          fillColor: '#6E8F97',
          fillOpacity: 0.18,
          weight: 0,
        }).addTo(heatLayer)
      })
      if (page === 'impact' && impactProjectSites?.length) {
        impactProjectSites.forEach((site) => {
          L.circle([site.centroid_lat, site.centroid_lng], {
            radius: 28000,
            color: '#43A047',
            fillColor: '#43A047',
            fillOpacity: 0.12,
            weight: 0,
          }).addTo(heatLayer)
        })
      }
      heatLayer.addTo(map)
    }

    if (isEnabled('points')) {
      if (page === 'impact' && impactProjectSites?.length && onImpactProjectSiteClick) {
        const siteOverlay = L.layerGroup()
        for (const site of impactProjectSites) {
          if (site.geometry_kind === 'polygon') {
            const geom = parseSiteBoundaryGeometry(site.boundary_geojson)
            if (!geom) continue
            const feature: Feature<Polygon | MultiPolygon, { _siteId: string }> = {
              type: 'Feature',
              properties: { _siteId: site.id },
              geometry: geom as Polygon | MultiPolygon,
            }
            const gj = L.geoJSON(feature, {
              style: {
                fillColor: '#1B5E20',
                color: '#C8E6C9',
                weight: 1.5,
                fillOpacity: 0.28,
              },
              onEachFeature: (feat, lyr) => {
                const id = feat.properties?._siteId
                const s = impactProjectSites.find((x) => x.id === id)
                lyr.on('click', () => {
                  if (s) onImpactProjectSiteClick(s)
                })
              },
            })
            gj.addTo(siteOverlay)
          } else {
            L.circleMarker([site.centroid_lat, site.centroid_lng], {
              radius: 9,
              color: '#fff',
              weight: 1.5,
              fillColor: '#2E7D32',
              fillOpacity: 0.92,
            })
              .on('click', () => onImpactProjectSiteClick(site))
              .addTo(siteOverlay)
          }
        }
        siteOverlay.addTo(pointLayer)
      }

      nodes.forEach((node) => {
        const marker = L.circleMarker([node.location.lat, node.location.lng], {
          radius: 8,
          color: '#fff',
          weight: 1,
          fillColor: '#A8784B',
          fillOpacity: 0.95,
        })
        marker.on('click', () => onNodeClick(node))
        marker.addTo(pointLayer)
      })
      pointLayer.addTo(map)
    }

    layersRef.current.heatLayer = heatLayer
    layersRef.current.pointLayer = pointLayer

    return () => {
      heatLayer.remove()
      pointLayer.remove()
    }
  }, [impactProjectSites, layers, nodes, onImpactProjectSiteClick, onNodeClick, page])

  return <div ref={containerRef} className="h-full w-full" />
}

function trackJoinNetworkFromMap(page: MapPageType, slot: 'primary' | 'secondary') {
  if (page === 'cooperation' || page === 'programs') {
    trackEvent('click_join_network_from_map', { page, slot })
  }
}

export function MapHeroShell({ page, title, subtitle, cta, ctaOnClick, secondaryCta }: MapHeroShellProps) {
  const { nodes: baseMapNodes } = useMapLocationsBaseNodes(page)
  const { nodes: welfareEnrollmentMapNodes, fromEnrollments: impactNodesFromWelfareEnrollments } =
    useWelfareEnrollmentMapNodes(page)
  const { sites: welfareProjectSites } = useWelfareProjectSitesForImpact(page)
  const orgPartnerMapNodes = useOrgPartnerMapNodes(page)
  const speciesObservationMapNodes = useSpeciesObservationMapNodes(page)
  const pageMetrics = useMapDashboardMetrics(page)
  const filters = mapFiltersByPage[page]
  const initialFilterState = useMemo(
    () =>
      filters.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = mapFilterOptionValue(item.options[0])
        return acc
      }, {}),
    [filters],
  )
  const [filterState, setFilterState] = useState<Record<string, string>>(initialFilterState)

  const heroFilters = useMemo(() => {
    if (page !== 'cooperation') return filters
    const base = mapFiltersByPage.cooperation
    const subj = filterState.cooperationSubject ?? '全部'
    const subtypeOptions = getSubjectSubtypeOptionsForCooperationSubject(subj === '全部' ? '' : subj)
    return [base[0], { ...base[1], options: subtypeOptions }]
  }, [page, filters, filterState.cooperationSubject])
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null)
  const [dynamicScienceNodes, setDynamicScienceNodes] = useState<MapNode[]>([])
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false)
  const [layers, setLayers] = useState([
    { key: 'satellite', label: '卫星', enabled: true },
    { key: 'heat', label: '热力', enabled: true },
    { key: 'points', label: '点位', enabled: true },
  ])

  useEffect(() => {
    trackEvent('view_map_hero', { page })
  }, [page])

  const pageNodes = useMemo(() => {
    let builtIn = baseMapNodes
    if (page === 'impact' && impactNodesFromWelfareEnrollments && welfareEnrollmentMapNodes.length > 0) {
      builtIn = welfareEnrollmentMapNodes
    }
    if (page === 'cooperation' && orgPartnerMapNodes.length > 0) {
      builtIn = [...orgPartnerMapNodes, ...builtIn]
    }
    if (page === 'science' && speciesObservationMapNodes.length > 0) {
      builtIn = [...speciesObservationMapNodes, ...builtIn]
    }
    if (page !== 'science') return builtIn
    return [...builtIn, ...dynamicScienceNodes]
  }, [
    baseMapNodes,
    dynamicScienceNodes,
    impactNodesFromWelfareEnrollments,
    orgPartnerMapNodes,
    page,
    speciesObservationMapNodes,
    welfareEnrollmentMapNodes,
  ])

  const filteredImpactProjectSites = useMemo(() => {
    if (page !== 'impact') return []
    return welfareProjectSites.filter((site) => {
      return Object.values(filterState).every((value) => {
        if (value === '全部' || value === '近30天' || value === '本季' || value === '全年' || value === '近7天')
          return true
        return site.tags.includes(value) || site.site_name.includes(value)
      })
    })
  }, [filterState, page, welfareProjectSites])

  const filteredNodes = useMemo(() => {
    return pageNodes.filter((node) => {
      if (page === 'science') {
        const topic = filterState.topic ?? '全部'
        if (topic !== '全部' && !node.tags.includes(topic) && !node.name.includes(topic)) {
          return false
        }

        const quality = filterState.quality ?? '全部'
        if (quality === '待核验') {
          if (!node.tags.includes('pending_review') && node.status !== 'pending_review') return false
        } else if (quality === '已核验') {
          const verifiedLike =
            node.tags.includes('approved') || node.status === 'verified' || node.tags.includes('verified')
          if (!verifiedLike) return false
        }

        const tr = filterState.timeRange ?? '近30天'
        const maxDays =
          tr === '近7天' ? 7 : tr === '近30天' ? 30 : tr === '本季' ? 92 : tr === '全年' ? 365 : 30
        if (maxDays < 365) {
          const observationDate = node.metrics?.find((metric) => metric.label === '观测时间')?.value
          if (typeof observationDate === 'string') {
            const t = new Date(observationDate).getTime()
            if (Number.isFinite(t)) {
              const diffDays = (Date.now() - t) / (1000 * 60 * 60 * 24)
              if (diffDays > maxDays) return false
            }
          }
        }
        return true
      }

      if (page === 'cooperation') {
        const meta = node.cooperationMeta
        if (!meta) return false
        const cooperationSubject = filterState.cooperationSubject ?? '全部'
        if (cooperationSubject !== '全部' && meta.cooperationSubject !== cooperationSubject) return false
        const subjectSubtype = filterState.subjectSubtype ?? '全部'
        if (subjectSubtype !== '全部' && meta.subjectSubtype !== subjectSubtype) return false
        return true
      }
      return Object.values(filterState).every((value) => {
        if (value === '全部' || value === '近30天' || value === '本季' || value === '全年' || value === '近7天')
          return true
        return node.tags.includes(value) || node.name.includes(value)
      })
    })
  }, [filterState, page, pageNodes])

  const handleFilterChange = (key: string, value: string) => {
    let next: Record<string, string> = { ...filterState, [key]: value }
    if (page === 'cooperation' && key === 'cooperationSubject') {
      const opts = getSubjectSubtypeOptionsForCooperationSubject(value === '全部' ? '' : value)
      const currentSubtype = next.subjectSubtype ?? '全部'
      if (!opts.includes(currentSubtype)) {
        next = { ...next, subjectSubtype: '全部' }
      }
    }
    setFilterState(next)
    trackEvent('change_map_filter', { page, filterState: next })
  }

  const handleToggleLayer = (layerKey: string) => {
    setLayers((prev) =>
      prev.map((layer) => (layer.key === layerKey ? { ...layer, enabled: !layer.enabled } : layer)),
    )
    trackEvent('toggle_map_layer', { page, layer: layerKey })
  }

  const handleNodeClick = (node: MapNode) => {
    setSelectedNode(node)
    trackEvent('click_map_node', { page, nodeType: node.nodeType, nodeId: node.id })
    trackEvent('open_detail_drawer', { page, nodeId: node.id })
  }

  const handleImpactProjectSiteClick = useCallback((site: WelfareProjectSiteRow) => {
    setSelectedNode(welfareProjectSiteToMapNode(site))
    trackEvent('click_map_node', { page, nodeType: 'welfare_project_site', nodeId: site.id })
    trackEvent('open_detail_drawer', { page, nodeId: site.id })
  }, [page])

  const handleAddObservation = (observation: SpeciesObservation) => {
    const tags = [
      observation.topic,
      observation.verificationStatus,
      ...(observation.observerUserId ? [`user:${observation.observerUserId}`] : []),
    ]
    const node: MapNode = {
      id: `species-dynamic-${observation.id}`,
      page: 'science',
      nodeType: 'species_record',
      name: `${observation.speciesNameCn}记录`,
      location: observation.location,
      tags,
      status: observation.verificationStatus,
      metrics: [{ label: '观测时间', value: observation.observedAt }],
    }
    setDynamicScienceNodes((prev) => [node, ...prev])
  }

  return (
    <section className="relative -mt-6 min-h-screen w-full overflow-hidden pt-24">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => {
          console.warn(
            '[TerraMar] 地图页首屏视频加载失败，请检查 Storage 桶 Public 与策略。page=',
            page,
            'url=',
            heroMapVideoByPage[page],
          )
        }}
      >
        <source src={heroMapVideoByPage[page]} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[rgba(14,22,18,0.4)]" />

      <div className="container-page relative z-10 flex min-h-screen flex-col justify-between pb-12 pt-8">
        <div
          className={
            page === 'cooperation'
              ? 'max-w-3xl text-white mt-10 md:mt-16 lg:mt-20'
              : 'max-w-3xl text-white'
          }
        >
          <h1 className="whitespace-nowrap text-[clamp(2rem,5vw,4.25rem)] font-semibold leading-tight">{title}</h1>
          <p className="mt-4 text-base text-white/90 md:text-lg">{subtitle}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {ctaOnClick ? (
              <button
                type="button"
                onClick={() => {
                  trackEvent('click_map_cta', { page, to: cta.to, mode: 'button' })
                  ctaOnClick()
                }}
                className="inline-flex min-h-11 items-center rounded-[999px] bg-white/95 px-5 py-2 text-sm font-medium text-[#1f3328]"
              >
                {cta.label}
              </button>
            ) : (
              <Link
                to={cta.to}
                onClick={() => {
                  trackEvent('click_map_cta', { page, to: cta.to })
                  if (cta.to === '/join-network' || cta.to.startsWith('/join-network')) trackJoinNetworkFromMap(page, 'primary')
                }}
                className="inline-flex min-h-11 items-center rounded-[999px] bg-white/95 px-5 py-2 text-sm font-medium text-[#1f3328]"
              >
                {cta.label}
              </Link>
            )}
            {secondaryCta ? (
              <Link
                to={secondaryCta.to}
                onClick={() => {
                  trackEvent('click_map_cta', { page, to: secondaryCta.to, slot: 'secondary' })
                  if (secondaryCta.to === '/join-network' || secondaryCta.to.startsWith('/join-network'))
                    trackJoinNetworkFromMap(page, 'secondary')
                }}
                className="inline-flex min-h-11 items-center rounded-[999px] border border-white/85 bg-transparent px-5 py-2 text-sm font-medium text-white shadow-sm backdrop-blur-sm transition hover:bg-white/10"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="relative mt-8 overflow-hidden rounded-3xl border border-white/30 bg-black/25 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <MapLayerSwitcher layers={layers} onToggle={handleToggleLayer} />
            <button
              type="button"
              onClick={() => setIsPanelCollapsed((prev) => !prev)}
              className="rounded-[999px] border border-white/40 bg-black/25 px-3 py-1 text-xs text-white"
            >
              {isPanelCollapsed ? '展开信息面板' : '收起信息面板'}
            </button>
            <MapFilterBar filters={heroFilters} values={filterState} onChange={handleFilterChange} />
          </div>

          <div className="relative mt-4 h-[460px] overflow-hidden rounded-2xl border border-white/25 bg-black/20">
            <LeafletMapCanvas
              page={page}
              nodes={filteredNodes}
              layers={layers}
              onNodeClick={handleNodeClick}
              impactProjectSites={page === 'impact' ? filteredImpactProjectSites : undefined}
              onImpactProjectSiteClick={page === 'impact' ? handleImpactProjectSiteClick : undefined}
            />

            <div className="pointer-events-none absolute bottom-3 left-3 max-w-[min(100%,360px)] rounded-xl border border-white/30 bg-black/35 px-3 py-2 text-[11px] text-white/90 backdrop-blur">
              <p>
                图例：
                {page === 'impact' ? (
                  <>
                    <span className="text-[#A8784B]">●</span> 报名触点 · <span className="text-[#2E7D32]">●</span> 项目地（点）·{' '}
                    <span className="text-[#A5D6A7]">▢</span> 项目地（面）·{' '}
                  </>
                ) : (
                  <>
                    <span className="text-[#A8784B]">●</span> 点位 ·{' '}
                  </>
                )}
                <span className="text-[#6E8F97]">◉</span> 热力
              </p>
              {page === 'impact' && welfareProjectSites.length > 0 ? (
                <p className="mt-1 border-t border-white/20 pt-1 text-[10px] leading-snug text-white/80">
                  绿色点与浅绿填充面来自运营配置表 platform_welfare_project_sites（公益项目地）。
                </p>
              ) : null}
              {page === 'impact' && impactNodesFromWelfareEnrollments ? (
                <p className="mt-1 border-t border-white/20 pt-1 text-[10px] leading-snug text-white/80">
                  棕色点为公益报名表 platform_welfare_enrollments（匿名坐标，不含个人联系方式）。
                </p>
              ) : null}
            </div>

            {page === 'cooperation' && filteredNodes.length === 0 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/45 px-6 text-center text-sm text-white/90">
                当前筛选下暂无合作主体，请调整筛选条件。
              </div>
            ) : null}
          </div>

          {!isPanelCollapsed && (
            <div className="mt-4">
              <MapInsightPanel metrics={pageMetrics} />
            </div>
          )}

          {page === 'science' && (
            <div className="mt-3">
              <MapUploadEntry onSubmitSuccess={handleAddObservation} />
            </div>
          )}
        </div>
      </div>

      <MapDetailDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
    </section>
  )
}
