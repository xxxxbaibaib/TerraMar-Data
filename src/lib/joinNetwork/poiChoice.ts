import type { NearbyMapPoi } from '../geo/nearbyMapPois'
import type { MapNode } from '../../mock/map/mapTypes'

/** 入网 / 个人登记：可选「地图真实 POI」或「平台协作参考目录」 */
export type JoinNetworkPoiChoice =
  | { kind: 'map'; poi: NearbyMapPoi; distanceKm: number }
  | { kind: 'catalog'; node: MapNode; distanceKm: number }

export function joinPoiDisplayName(choice: JoinNetworkPoiChoice): string {
  if (choice.kind === 'catalog') {
    return choice.node.cooperationMeta?.partnerName ?? choice.node.name
  }
  return choice.poi.name
}

export function joinPoiSubtitle(choice: JoinNetworkPoiChoice): string | null {
  if (choice.kind === 'catalog') {
    const parts = [choice.node.location.province, choice.node.location.city].filter(Boolean)
    return parts.length ? parts.join(' · ') : null
  }
  if (choice.poi.category) return choice.poi.category
  return choice.poi.source === 'geoapify' ? 'Geoapify Places' : 'OpenStreetMap'
}

/** 写入线索 / 本地存档的 joinNetwork 载荷 */
export function buildJoinNetworkExtraPayload(
  choice: JoinNetworkPoiChoice,
  userGeo: { lat: number; lng: number },
): { joinNetwork: Record<string, unknown> } {
  const km = Math.round(choice.distanceKm * 10) / 10
  return {
    joinNetwork: {
      selectedNodeId: choice.kind === 'catalog' ? choice.node.id : choice.poi.id,
      selectedNodeName: joinPoiDisplayName(choice),
      selectionKind: choice.kind,
      userLat: userGeo.lat,
      userLng: userGeo.lng,
      distanceKm: km,
      ...(choice.kind === 'map'
        ? {
            mapPoi: {
              source: choice.poi.source,
              osmType: choice.poi.osmType,
              osmId: choice.poi.osmId,
              lat: choice.poi.lat,
              lng: choice.poi.lng,
              category: choice.poi.category,
            },
          }
        : {}),
    },
  }
}
