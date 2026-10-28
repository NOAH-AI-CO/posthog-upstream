import { labelForModule } from '~/beone/modules'
import { escapeHogQLString, hogql } from '~/queries/utils'
import type { HogQLQueryString } from '~/queries/utils'

export type BeOneRange = '24h' | '7d' | '30d'

export type BeOneUsageFilters = {
    range: BeOneRange
    module: string
    distinctId: string
    userType: string
    accountKind: string
    enterpriseId: string
    businessGroupId: string
    accessRole: string
    profileComplete: '' | 'true' | 'false'
}

export const DEFAULT_BEONE_FILTERS: BeOneUsageFilters = {
    range: '7d',
    module: '',
    distinctId: '',
    userType: '',
    accountKind: '',
    enterpriseId: '',
    businessGroupId: '',
    accessRole: '',
    profileComplete: '',
}

export type BeOneKpis = {
    todayActive: number
    periodActive: number
    todayEvents: number
    periodEvents: number
}

export type BeOneTrendPoint = { bucket: string; events: number; actives: number }
export type BeOneRankingRow = { module: string; label: string; count: number }
export type BeOneFeedRow = {
    timestamp: string
    event: string
    distinctId: string
    module: string
    moduleLabel: string
}
export type BeOneUserRow = {
    distinctId: string
    events: number
    modules: number
    lastSeen: string
}
export type BeOneDurationBucket = { bucket: string; count: number }

type HogQLRows = any[][] | undefined

const BEONE_EVENTS = hogql.raw(`event IN ('user_activity', 'module_entered')`)
const TASK_END_EVENTS = hogql.raw(`event IN ('task_succeeded', 'task_failed', 'task_cancelled', 'task_interrupted')`)

const RANGE_INTERVAL: Record<BeOneRange, string> = {
    '24h': '24 HOUR',
    '7d': '7 DAY',
    '30d': '30 DAY',
}

export function trendGranularityForRange(range: BeOneRange): 'hour' | 'day' {
    return range === '24h' ? 'hour' : 'day'
}

/** Build AND-clauses for optional filters. Empty string = no constraint. */
export function buildFilterClauses(filters: BeOneUsageFilters): string[] {
    const clauses: string[] = [`timestamp >= now() - INTERVAL ${RANGE_INTERVAL[filters.range]}`]
    if (filters.module) {
        clauses.push(`toString(properties.module) = ${escapeHogQLString(filters.module)}`)
    }
    if (filters.distinctId.trim()) {
        clauses.push(`positionCaseInsensitive(distinct_id, ${escapeHogQLString(filters.distinctId.trim())}) > 0`)
    }
    if (filters.userType) {
        clauses.push(`toString(properties.user_type) = ${escapeHogQLString(filters.userType)}`)
    }
    if (filters.accountKind) {
        clauses.push(`toString(properties.account_kind) = ${escapeHogQLString(filters.accountKind)}`)
    }
    if (filters.enterpriseId.trim()) {
        clauses.push(`toString(properties.enterprise_id) = ${escapeHogQLString(filters.enterpriseId.trim())}`)
    }
    if (filters.businessGroupId.trim()) {
        clauses.push(`toString(properties.business_group_id) = ${escapeHogQLString(filters.businessGroupId.trim())}`)
    }
    if (filters.accessRole) {
        clauses.push(`toString(properties.access_role) = ${escapeHogQLString(filters.accessRole)}`)
    }
    if (filters.profileComplete === 'true' || filters.profileComplete === 'false') {
        clauses.push(`toBool(properties.profile_complete) = ${filters.profileComplete}`)
    }
    return clauses
}

function whereAnd(base: { raw: string }, filters: BeOneUsageFilters): ReturnType<typeof hogql.raw> {
    return hogql.raw([base.raw, ...buildFilterClauses(filters)].map((p) => `(${p})`).join(' AND '))
}

export function buildKpiQuery(filters: BeOneUsageFilters): HogQLQueryString {
    const where = whereAnd(BEONE_EVENTS, filters)
    return hogql`
        SELECT
            uniqExactIf(distinct_id, timestamp >= now() - INTERVAL 1 DAY) AS today_active,
            uniqExact(distinct_id) AS period_active,
            countIf(timestamp >= now() - INTERVAL 1 DAY) AS today_events,
            count() AS period_events
        FROM events
        WHERE ${where}
    `
}

export function buildTrendQuery(filters: BeOneUsageFilters): HogQLQueryString {
    const where = whereAnd(BEONE_EVENTS, filters)
    const trunc = trendGranularityForRange(filters.range) === 'hour' ? 'toStartOfHour' : 'toStartOfDay'
    return hogql`
        SELECT
            ${hogql.raw(trunc)}(timestamp) AS bucket,
            count() AS events,
            uniqExact(distinct_id) AS actives
        FROM events
        WHERE ${where}
        GROUP BY bucket
        ORDER BY bucket
    `
}

export function buildRankingQuery(filters: BeOneUsageFilters): HogQLQueryString {
    const where = whereAnd(hogql.raw(`event = 'module_entered'`), filters)
    return hogql`
        SELECT
            toString(properties.module) AS module,
            count() AS c
        FROM events
        WHERE ${where}
        GROUP BY module
        ORDER BY c DESC
        LIMIT 12
    `
}

export function buildFeedQuery(filters: BeOneUsageFilters): HogQLQueryString {
    const where = whereAnd(BEONE_EVENTS, filters)
    return hogql`
        SELECT
            timestamp,
            event,
            distinct_id,
            toString(properties.module) AS module
        FROM events
        WHERE ${where}
        ORDER BY timestamp DESC
        LIMIT 20
    `
}

export function buildUserAggQuery(filters: BeOneUsageFilters): HogQLQueryString {
    const where = whereAnd(BEONE_EVENTS, filters)
    return hogql`
        SELECT
            distinct_id,
            count() AS events,
            uniqExact(toString(properties.module)) AS modules,
            max(timestamp) AS last_seen
        FROM events
        WHERE ${where}
        GROUP BY distinct_id
        ORDER BY events DESC
        LIMIT 50
    `
}

export function buildDurationHistQuery(filters: BeOneUsageFilters): HogQLQueryString {
    const where = whereAnd(hogql.raw(`${TASK_END_EVENTS.raw} AND properties.duration_ms IS NOT NULL`), filters)
    return hogql`
        SELECT
            multiIf(
                toFloat(properties.duration_ms) < 10000, '<10s',
                toFloat(properties.duration_ms) < 60000, '10-60s',
                toFloat(properties.duration_ms) < 300000, '1-5m',
                toFloat(properties.duration_ms) < 1800000, '5-30m',
                '>=30m'
            ) AS bucket,
            count() AS c
        FROM events
        WHERE ${where}
        GROUP BY bucket
        ORDER BY
            multiIf(
                bucket = '<10s', 1,
                bucket = '10-60s', 2,
                bucket = '1-5m', 3,
                bucket = '5-30m', 4,
                5
            )
    `
}

export function parseKpiRows(results: HogQLRows): BeOneKpis {
    const row = results?.[0] ?? [0, 0, 0, 0]
    return {
        todayActive: Number(row[0] ?? 0),
        periodActive: Number(row[1] ?? 0),
        todayEvents: Number(row[2] ?? 0),
        periodEvents: Number(row[3] ?? 0),
    }
}

export function parseTrendRows(results: HogQLRows): BeOneTrendPoint[] {
    return (results ?? []).map((r) => ({
        bucket: String(r[0]),
        events: Number(r[1] ?? 0),
        actives: Number(r[2] ?? 0),
    }))
}

export function parseRankingRows(results: HogQLRows): BeOneRankingRow[] {
    return (results ?? []).map((r) => {
        const module = String(r[0] ?? '')
        return { module, label: labelForModule(module || null), count: Number(r[1] ?? 0) }
    })
}

export function parseFeedRows(results: HogQLRows): BeOneFeedRow[] {
    return (results ?? []).map((r) => {
        const module = String(r[3] ?? '')
        return {
            timestamp: String(r[0]),
            event: String(r[1]),
            distinctId: String(r[2]),
            module,
            moduleLabel: labelForModule(module || null),
        }
    })
}

export function parseUserAggRows(results: HogQLRows): BeOneUserRow[] {
    return (results ?? []).map((r) => ({
        distinctId: String(r[0] ?? ''),
        events: Number(r[1] ?? 0),
        modules: Number(r[2] ?? 0),
        lastSeen: String(r[3] ?? ''),
    }))
}

const DURATION_ORDER = ['<10s', '10-60s', '1-5m', '5-30m', '>=30m'] as const

export function parseDurationHistRows(results: HogQLRows): BeOneDurationBucket[] {
    const counts = new Map<string, number>()
    for (const r of results ?? []) {
        counts.set(String(r[0]), Number(r[1] ?? 0))
    }
    return DURATION_ORDER.map((bucket) => ({ bucket, count: counts.get(bucket) ?? 0 }))
}
