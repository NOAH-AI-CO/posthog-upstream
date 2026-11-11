import { dayjs } from 'lib/dayjs'

import { labelForModule } from '~/beone/modules'
import { escapeHogQLString, hogql } from '~/queries/utils'
import type { HogQLQueryString } from '~/queries/utils'

export type BeOneTitleKind = '' | 'teaching_title' | 'clinical_title'

export type BeOneUsageFilters = {
    dateFrom: string
    dateTo: string | null
    module: string
    eventSource: string
    userType: string
    accountKind: string
    province: string
    city: string
    hospitalLevel: string
    titleKind: BeOneTitleKind
    titleValue: string
    hospitalName: string
}

export const DEFAULT_BEONE_FILTERS: BeOneUsageFilters = {
    dateFrom: '-90d',
    dateTo: null,
    module: '',
    eventSource: '',
    userType: '',
    accountKind: '',
    province: '',
    city: '',
    hospitalLevel: '',
    titleKind: '',
    titleValue: '',
    hospitalName: '',
}

export type BeOneDrilldown = { dimension: string; value: string; label: string } | null

export type BeOneWidgetId =
    | 'trend'
    | 'users'
    | 'ranking'
    | 'feed'
    | 'duration'
    | 'hourly'
    | 'breakdown_user_type'
    | 'breakdown_account_kind'
    | 'breakdown_province'
    | 'breakdown_hospital_level'
    | 'breakdown_title'

export const DEFAULT_HIDDEN_WIDGETS: BeOneWidgetId[] = ['duration']

export const ALL_WIDGET_IDS: BeOneWidgetId[] = [
    'trend',
    'users',
    'ranking',
    'feed',
    'hourly',
    'breakdown_user_type',
    'breakdown_account_kind',
    'breakdown_province',
    'breakdown_hospital_level',
    'breakdown_title',
    'duration',
]

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
export type BeOneHourlyBucket = { hour: number; count: number }
export type BeOneBreakdownRow = { value: string; label: string; people: number; events: number }

export type BeOneTrendGranularity = 'hour' | 'day' | 'week' | 'month'

type HogQLRows = any[][] | undefined

const BEONE_EVENTS = hogql.raw(`event IN ('user_activity', 'module_entered')`)
const TASK_END_EVENTS = hogql.raw(`event IN ('task_succeeded', 'task_failed', 'task_cancelled', 'task_interrupted')`)

export function mergeFiltersWithDrilldown(filters: BeOneUsageFilters, drilldown: BeOneDrilldown): BeOneUsageFilters {
    if (!drilldown) {
        return filters
    }
    const next = { ...filters }
    switch (drilldown.dimension) {
        case 'user_type':
            next.userType = drilldown.value
            break
        case 'account_kind':
            next.accountKind = drilldown.value
            break
        case 'province':
            next.province = drilldown.value
            break
        case 'hospital_level':
            next.hospitalLevel = drilldown.value
            break
        case 'teaching_title':
            next.titleKind = 'teaching_title'
            next.titleValue = drilldown.value
            break
        case 'clinical_title':
            next.titleKind = 'clinical_title'
            next.titleValue = drilldown.value
            break
        case 'module':
            next.module = drilldown.value
            break
        default:
            break
    }
    return next
}

function relativeIntervalClause(dateFrom: string): string | null {
    const m = /^-(?<n>\d+)(?<u>[hdwm])$/i.exec(dateFrom.trim())
    if (!m?.groups) {
        return null
    }
    const n = Number(m.groups.n)
    const unitMap: Record<string, string> = { h: 'HOUR', d: 'DAY', w: 'WEEK', m: 'MONTH' }
    const unit = unitMap[m.groups.u.toLowerCase()]
    if (!unit || !Number.isFinite(n)) {
        return null
    }
    return `timestamp >= now() - INTERVAL ${n} ${unit}`
}

/** Build AND-clauses for optional filters. Empty string = no constraint. */
export function buildFilterClauses(filters: BeOneUsageFilters): string[] {
    const clauses: string[] = []
    const relative = relativeIntervalClause(filters.dateFrom)
    if (relative) {
        clauses.push(relative)
    } else if (filters.dateFrom) {
        clauses.push(`timestamp >= toDateTime(${escapeHogQLString(filters.dateFrom)})`)
    } else {
        clauses.push(`timestamp >= now() - INTERVAL 90 DAY`)
    }
    if (filters.dateTo) {
        clauses.push(`timestamp <= toDateTime(${escapeHogQLString(filters.dateTo)})`)
    }
    if (filters.module) {
        clauses.push(`toString(properties.module) = ${escapeHogQLString(filters.module)}`)
    }
    if (filters.eventSource) {
        clauses.push(`toString(properties.event_source) = ${escapeHogQLString(filters.eventSource)}`)
    }
    if (filters.userType) {
        clauses.push(`toString(properties.user_type) = ${escapeHogQLString(filters.userType)}`)
    }
    if (filters.accountKind) {
        clauses.push(`toString(properties.account_kind) = ${escapeHogQLString(filters.accountKind)}`)
    }
    if (filters.province) {
        clauses.push(`toString(properties.province) = ${escapeHogQLString(filters.province)}`)
    }
    if (filters.city) {
        clauses.push(`toString(properties.city) = ${escapeHogQLString(filters.city)}`)
    }
    if (filters.hospitalLevel) {
        clauses.push(`toString(properties.hospital_level) = ${escapeHogQLString(filters.hospitalLevel)}`)
    }
    if (filters.titleKind && filters.titleValue) {
        clauses.push(`toString(properties.${filters.titleKind}) = ${escapeHogQLString(filters.titleValue)}`)
    }
    if (filters.hospitalName.trim()) {
        clauses.push(
            `positionCaseInsensitive(toString(properties.hospital), ${escapeHogQLString(filters.hospitalName.trim())}) > 0`
        )
    }
    return clauses
}

function whereAnd(base: { raw: string }, filters: BeOneUsageFilters): ReturnType<typeof hogql.raw> {
    return hogql.raw([base.raw, ...buildFilterClauses(filters)].map((p) => `(${p})`).join(' AND '))
}

export function trendGranularityForFilters(filters: BeOneUsageFilters): BeOneTrendGranularity {
    const relative = relativeIntervalClause(filters.dateFrom)
    if (relative?.includes('HOUR')) {
        return 'hour'
    }
    const days = estimateRangeDays(filters)
    if (days <= 2) {
        return 'hour'
    }
    if (days <= 60) {
        return 'day'
    }
    if (days <= 180) {
        return 'week'
    }
    return 'month'
}

export function estimateRangeDays(filters: BeOneUsageFilters, now: dayjs.Dayjs = dayjs()): number {
    const m = /^-(?<n>\d+)(?<u>[hdwm])$/i.exec(filters.dateFrom.trim())
    if (m?.groups) {
        const n = Number(m.groups.n)
        switch (m.groups.u.toLowerCase()) {
            case 'h':
                return Math.max(1, n / 24)
            case 'd':
                return n
            case 'w':
                return n * 7
            case 'm':
                return n * 30
        }
    }
    const from = dayjs(filters.dateFrom)
    const to = filters.dateTo ? dayjs(filters.dateTo) : now
    if (from.isValid() && to.isValid()) {
        return Math.max(1, to.diff(from, 'day'))
    }
    return 90
}

function truncFn(granularity: BeOneTrendGranularity): string {
    switch (granularity) {
        case 'hour':
            return 'toStartOfHour'
        case 'week':
            return 'toStartOfWeek'
        case 'month':
            return 'toStartOfMonth'
        default:
            return 'toStartOfDay'
    }
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
    const trunc = truncFn(trendGranularityForFilters(filters))
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

export function buildHourlyQuery(filters: BeOneUsageFilters): HogQLQueryString {
    const where = whereAnd(BEONE_EVENTS, filters)
    return hogql`
        SELECT
            toHour(timestamp) AS hour,
            count() AS c
        FROM events
        WHERE ${where}
        GROUP BY hour
        ORDER BY hour
    `
}

export function buildBreakdownQuery(
    filters: BeOneUsageFilters,
    property: string,
    labelProperty?: string
): HogQLQueryString {
    const where = whereAnd(BEONE_EVENTS, filters)
    const labelExpr = labelProperty
        ? `if(toString(properties.${labelProperty}) = '', toString(properties.${property}), toString(properties.${labelProperty}))`
        : `toString(properties.${property})`
    return hogql`
        SELECT
            toString(properties.${hogql.identifier(property)}) AS value,
            ${hogql.raw(labelExpr)} AS label,
            uniqExact(distinct_id) AS people,
            count() AS events
        FROM events
        WHERE ${where}
        GROUP BY value, label
        ORDER BY people DESC
        LIMIT 20
    `
}

export function buildDistinctPropQuery(
    filters: BeOneUsageFilters,
    property: string,
    labelProperty?: string
): HogQLQueryString {
    const where = whereAnd(BEONE_EVENTS, filters)
    const labelExpr = labelProperty
        ? `if(toString(properties.${labelProperty}) = '', toString(properties.${property}), toString(properties.${labelProperty}))`
        : `toString(properties.${property})`
    return hogql`
        SELECT
            toString(properties.${hogql.identifier(property)}) AS value,
            ${hogql.raw(labelExpr)} AS label
        FROM events
        WHERE ${where}
          AND toString(properties.${hogql.identifier(property)}) != ''
        GROUP BY value, label
        ORDER BY label
        LIMIT 200
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

function trendBucketKey(ts: string, granularity: BeOneTrendGranularity): string {
    const d = dayjs(ts)
    switch (granularity) {
        case 'hour':
            return d.format('YYYY-MM-DD HH:00:00')
        case 'week':
            return d.startOf('week').format('YYYY-MM-DD')
        case 'month':
            return d.format('YYYY-MM')
        default:
            return d.format('YYYY-MM-DD')
    }
}

/**
 * Pad sparse GROUP BY results across the filter window.
 * Rolling INTERVAL N can span N+1 calendar buckets (partial first day).
 */
export function fillTrendBuckets(
    points: BeOneTrendPoint[],
    filters: BeOneUsageFilters,
    now: dayjs.Dayjs = dayjs()
): BeOneTrendPoint[] {
    const granularity = trendGranularityForFilters(filters)
    const days = estimateRangeDays(filters, now)
    let steps: number
    let unit: dayjs.ManipulateType
    switch (granularity) {
        case 'hour':
            steps = Math.max(24, Math.ceil(days * 24))
            unit = 'hour'
            break
        case 'week':
            steps = Math.max(1, Math.ceil(days / 7))
            unit = 'week'
            break
        case 'month':
            steps = Math.max(1, Math.ceil(days / 30))
            unit = 'month'
            break
        default:
            steps = Math.max(1, Math.ceil(days))
            unit = 'day'
    }
    const byKey = new Map<string, BeOneTrendPoint>()
    for (const p of points) {
        byKey.set(trendBucketKey(p.bucket, granularity), p)
    }
    const end = now.startOf(unit === 'week' ? 'week' : unit === 'month' ? 'month' : unit)
    const filled: BeOneTrendPoint[] = []
    for (let i = steps; i >= 0; i--) {
        const bucket = end.subtract(i, unit)
        const key = trendBucketKey(bucket.toISOString(), granularity)
        const existing = byKey.get(key)
        filled.push(existing ?? { bucket: bucket.toISOString(), events: 0, actives: 0 })
    }
    return filled
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

export function parseHourlyRows(results: HogQLRows): BeOneHourlyBucket[] {
    const counts = new Map<number, number>()
    for (const r of results ?? []) {
        counts.set(Number(r[0]), Number(r[1] ?? 0))
    }
    return Array.from({ length: 24 }, (_, hour) => ({ hour, count: counts.get(hour) ?? 0 }))
}

export function parseBreakdownRows(results: HogQLRows): BeOneBreakdownRow[] {
    return (results ?? []).map((r) => ({
        value: String(r[0] ?? ''),
        label: String(r[1] ?? r[0] ?? ''),
        people: Number(r[2] ?? 0),
        events: Number(r[3] ?? 0),
    }))
}

export function parseDistinctPropRows(results: HogQLRows): { value: string; label: string }[] {
    return (results ?? [])
        .map((r) => ({ value: String(r[0] ?? ''), label: String(r[1] ?? r[0] ?? '') }))
        .filter((r) => r.value)
}
