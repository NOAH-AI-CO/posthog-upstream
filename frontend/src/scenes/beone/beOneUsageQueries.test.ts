import { escapeHogQLString } from '~/queries/utils'

import {
    DEFAULT_BEONE_FILTERS,
    buildDurationHistQuery,
    buildFilterClauses,
    buildFeedQuery,
    buildKpiQuery,
    buildRankingQuery,
    buildTrendQuery,
    buildUserAggQuery,
    parseDurationHistRows,
    parseKpiRows,
    parseRankingRows,
    parseUserAggRows,
} from './beOneUsageQueries'

describe('beOneUsageQueries', () => {
    it('builds KPI query mentioning user_activity and module_entered', () => {
        const q = String(buildKpiQuery(DEFAULT_BEONE_FILTERS))
        expect(q).toContain('user_activity')
        expect(q).toContain('module_entered')
        expect(q).toContain('uniqExact(distinct_id)')
        expect(q).toContain('INTERVAL 7 DAY')
    })

    it('builds hour vs day trend trunc from range', () => {
        expect(String(buildTrendQuery({ ...DEFAULT_BEONE_FILTERS, range: '24h' }))).toContain('toStartOfHour')
        expect(String(buildTrendQuery({ ...DEFAULT_BEONE_FILTERS, range: '7d' }))).toContain('toStartOfDay')
        expect(String(buildTrendQuery({ ...DEFAULT_BEONE_FILTERS, range: '30d' }))).toContain('INTERVAL 30 DAY')
    })

    it('builds ranking on module_entered', () => {
        expect(String(buildRankingQuery(DEFAULT_BEONE_FILTERS))).toContain("event = 'module_entered'")
        expect(String(buildRankingQuery(DEFAULT_BEONE_FILTERS))).toContain('properties.module')
    })

    it('builds feed query', () => {
        expect(String(buildFeedQuery(DEFAULT_BEONE_FILTERS))).toContain('LIMIT 20')
    })

    it('adds org and identity filters only when set', () => {
        const bare = buildFilterClauses(DEFAULT_BEONE_FILTERS)
        expect(bare.some((c) => c.includes('enterprise_id'))).toBe(false)

        const clauses = buildFilterClauses({
            ...DEFAULT_BEONE_FILTERS,
            module: 'thesis',
            enterpriseId: 'acme-1',
            userType: 'customer',
            accessRole: 'member',
            profileComplete: 'true',
            distinctId: 'beone:abc',
        })
        const joined = clauses.join('\n')
        expect(joined).toContain(`toString(properties.module) = ${escapeHogQLString('thesis')}`)
        expect(joined).toContain(`toString(properties.enterprise_id) = ${escapeHogQLString('acme-1')}`)
        expect(joined).toContain(`toString(properties.user_type) = ${escapeHogQLString('customer')}`)
        expect(joined).toContain(`toString(properties.access_role) = ${escapeHogQLString('member')}`)
        expect(joined).toContain('toBool(properties.profile_complete) = true')
        expect(joined).toContain(`positionCaseInsensitive(distinct_id, ${escapeHogQLString('beone:abc')}) > 0`)
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

    it('parses user agg rows', () => {
        expect(parseUserAggRows([['beone:1', 9, 3, '2026-01-01T00:00:00Z']])).toEqual([
            { distinctId: 'beone:1', events: 9, modules: 3, lastSeen: '2026-01-01T00:00:00Z' },
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
})
