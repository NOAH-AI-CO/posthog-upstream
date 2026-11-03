import { dayjs } from 'lib/dayjs'

import { escapeHogQLString } from '~/queries/utils'

import {
    DEFAULT_BEONE_FILTERS,
    buildDurationHistQuery,
    buildFilterClauses,
    buildFeedQuery,
    buildHourlyQuery,
    buildKpiQuery,
    buildRankingQuery,
    buildTrendQuery,
    buildUserAggQuery,
    fillTrendBuckets,
    mergeFiltersWithDrilldown,
    parseDurationHistRows,
    parseHourlyRows,
    parseKpiRows,
    parseRankingRows,
    parseUserAggRows,
    trendGranularityForFilters,
} from './beOneUsageQueries'

describe('beOneUsageQueries', () => {
    it('builds KPI query mentioning user_activity and module_entered', () => {
        const q = String(buildKpiQuery(DEFAULT_BEONE_FILTERS))
        expect(q).toContain('user_activity')
        expect(q).toContain('module_entered')
        expect(q).toContain('uniqExact(distinct_id)')
        expect(q).toContain('INTERVAL 90 DAY')
    })

    it('picks trend trunc from date range', () => {
        expect(String(buildTrendQuery({ ...DEFAULT_BEONE_FILTERS, dateFrom: '-24h' }))).toContain('toStartOfHour')
        expect(String(buildTrendQuery({ ...DEFAULT_BEONE_FILTERS, dateFrom: '-7d' }))).toContain('toStartOfDay')
        expect(String(buildTrendQuery({ ...DEFAULT_BEONE_FILTERS, dateFrom: '-90d' }))).toContain('toStartOfWeek')
        expect(trendGranularityForFilters({ ...DEFAULT_BEONE_FILTERS, dateFrom: '-180d' })).toBe('week')
        expect(trendGranularityForFilters({ ...DEFAULT_BEONE_FILTERS, dateFrom: '-200d' })).toBe('month')
    })

    it('builds ranking on module_entered', () => {
        expect(String(buildRankingQuery(DEFAULT_BEONE_FILTERS))).toContain("event = 'module_entered'")
        expect(String(buildRankingQuery(DEFAULT_BEONE_FILTERS))).toContain('properties.module')
    })

    it('builds feed and hourly queries', () => {
        expect(String(buildFeedQuery(DEFAULT_BEONE_FILTERS))).toContain('LIMIT 20')
        expect(String(buildHourlyQuery(DEFAULT_BEONE_FILTERS))).toContain('toHour(timestamp)')
    })

    it('adds new attribute filters only when set', () => {
        const bare = buildFilterClauses(DEFAULT_BEONE_FILTERS)
        expect(bare.some((c) => c.includes('enterprise_id'))).toBe(false)
        expect(bare.some((c) => c.includes('INTERVAL 90 DAY'))).toBe(true)

        const clauses = buildFilterClauses({
            ...DEFAULT_BEONE_FILTERS,
            module: 'thesis',
            userType: 'customer',
            accountKind: 'individual',
            province: '440000',
            city: '440100',
            hospitalLevel: '三级甲等',
            titleKind: 'teaching_title',
            titleValue: '教授',
            hospitalName: '协和',
        })
        const joined = clauses.join('\n')
        expect(joined).toContain(`toString(properties.module) = ${escapeHogQLString('thesis')}`)
        expect(joined).toContain(`toString(properties.user_type) = ${escapeHogQLString('customer')}`)
        expect(joined).toContain(`toString(properties.account_kind) = ${escapeHogQLString('individual')}`)
        expect(joined).toContain(`toString(properties.province) = ${escapeHogQLString('440000')}`)
        expect(joined).toContain(`toString(properties.city) = ${escapeHogQLString('440100')}`)
        expect(joined).toContain(`toString(properties.hospital_level) = ${escapeHogQLString('三级甲等')}`)
        expect(joined).toContain(`toString(properties.teaching_title) = ${escapeHogQLString('教授')}`)
        expect(joined).toContain(
            `positionCaseInsensitive(toString(properties.hospital), ${escapeHogQLString('协和')}) > 0`
        )
    })

    it('merges drilldown into filters without mutating originals', () => {
        const filters = { ...DEFAULT_BEONE_FILTERS }
        const next = mergeFiltersWithDrilldown(filters, {
            dimension: 'user_type',
            value: 'employee',
            label: 'employee',
        })
        expect(next.userType).toBe('employee')
        expect(filters.userType).toBe('')
    })

    it('builds user agg and duration hist queries', () => {
        expect(String(buildUserAggQuery(DEFAULT_BEONE_FILTERS))).toContain('GROUP BY distinct_id')
        const duration = String(buildDurationHistQuery(DEFAULT_BEONE_FILTERS))
        expect(duration).toContain('task_succeeded')
        expect(duration).toContain('duration_ms')
        expect(duration).toContain('multiIf')
    })

    it('parses KPI row', () => {
        expect(parseKpiRows([[3, 10, 40, 200]])).toEqual({
            todayActive: 3,
            periodActive: 10,
            todayEvents: 40,
            periodEvents: 200,
        })
    })

    it('parses ranking with Chinese labels', () => {
        expect(
            parseRankingRows([
                ['thesis', 12],
                ['weird', 2],
            ])
        ).toEqual([
            { module: 'thesis', label: '论文', count: 12 },
            { module: 'weird', label: 'weird', count: 2 },
        ])
    })

    it('parses user agg and hourly rows', () => {
        expect(parseUserAggRows([['beone:1', 9, 3, '2026-01-01T00:00:00Z']])).toEqual([
            { distinctId: 'beone:1', events: 9, modules: 3, lastSeen: '2026-01-01T00:00:00Z' },
        ])
        expect(
            parseHourlyRows([
                [9, 4],
                [10, 2],
            ]).slice(9, 11)
        ).toEqual([
            { hour: 9, count: 4 },
            { hour: 10, count: 2 },
        ])
    })

    it('fills missing duration buckets in order', () => {
        expect(
            parseDurationHistRows([
                ['1-5m', 4],
                ['<10s', 2],
            ])
        ).toEqual([
            { bucket: '<10s', count: 2 },
            { bucket: '10-60s', count: 0 },
            { bucket: '1-5m', count: 4 },
            { bucket: '5-30m', count: 0 },
            { bucket: '>=30m', count: 0 },
        ])
    })

    it('pads sparse trend points across the selected range', () => {
        const filled = fillTrendBuckets(
            [{ bucket: '2026-10-27T00:00:00Z', events: 43, actives: 1 }],
            { ...DEFAULT_BEONE_FILTERS, dateFrom: '-7d' },
            dayjs('2026-10-29T15:00:00Z')
        )
        expect(filled).toHaveLength(8)
        expect(filled.map((p) => p.events)).toEqual([0, 0, 0, 0, 0, 43, 0, 0])
        expect(filled.map((p) => p.actives)).toEqual([0, 0, 0, 0, 0, 1, 0, 0])
    })

    it('keeps the oldest day inside a rolling INTERVAL window', () => {
        const filled = fillTrendBuckets(
            [{ bucket: '2026-10-27T00:00:00', events: 43, actives: 1 }],
            { ...DEFAULT_BEONE_FILTERS, dateFrom: '-7d' },
            dayjs('2026-11-03T10:28:00')
        )
        expect(filled).toHaveLength(8)
        expect(filled[0]?.events).toBe(43)
        expect(filled.reduce((sum, p) => sum + p.events, 0)).toBe(43)
    })
})
