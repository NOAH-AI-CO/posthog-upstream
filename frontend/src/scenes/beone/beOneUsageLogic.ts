import { actions, afterMount, kea, listeners, path, reducers, selectors } from 'kea'
import { loaders } from 'kea-loaders'

import api from 'lib/api'

import { getBeOneCopy, type BeOneLocale } from '~/beone/copy'
import {
    cityOptionsFromRegions,
    fetchHospitalSuggestions,
    fetchRegistrationOptions,
    hospitalSelectOptions,
    optionsOfKind,
    provinceOptionsFromRegions,
    type BeOneHospitalsResponse,
    type BeOneRegistrationOptionsResponse,
    type BeOneSelectOption,
} from '~/beone/registrationApi'

import {
    ALL_WIDGET_IDS,
    DEFAULT_BEONE_FILTERS,
    DEFAULT_HIDDEN_WIDGETS,
    buildBreakdownQuery,
    buildDurationHistQuery,
    buildFeedQuery,
    buildHourlyQuery,
    buildKpiQuery,
    buildRankingQuery,
    buildTrendQuery,
    buildUserAggQuery,
    fillTrendBuckets,
    mergeFiltersWithDrilldown,
    parseBreakdownRows,
    parseDurationHistRows,
    parseFeedRows,
    parseHourlyRows,
    parseKpiRows,
    parseRankingRows,
    parseTrendRows,
    parseUserAggRows,
    trendGranularityForFilters,
} from './beOneUsageQueries'
import type {
    BeOneBreakdownRow,
    BeOneDrilldown,
    BeOneDurationBucket,
    BeOneFeedRow,
    BeOneHourlyBucket,
    BeOneKpis,
    BeOneRankingRow,
    BeOneTrendGranularity,
    BeOneTrendPoint,
    BeOneUsageFilters,
    BeOneUserRow,
    BeOneWidgetId,
} from './beOneUsageQueries'

const OVERVIEW_POLL_INTERVAL_MS = 60_000
const FEED_POLL_INTERVAL_MS = 15_000
const HOSPITAL_SEARCH_DEBOUNCE_MS = 250

const QUERY_TAGS = { scene: 'ProjectHomepage', productKey: 'product_analytics' } as const
const QUERY_OPTIONS = { refresh: 'force_blocking' } as const

type BeOneHomeSettings = {
    filters?: Partial<BeOneUsageFilters>
    hiddenWidgets?: BeOneWidgetId[]
    locale?: BeOneLocale
}

async function keepPreviousOnError<T>(previous: T, load: () => Promise<T>): Promise<T> {
    try {
        return await load()
    } catch (error) {
        console.warn('[beone] usage query failed, keeping previous value', error)
        return previous
    }
}

function effectiveFilters(filters: BeOneUsageFilters, drilldown: BeOneDrilldown): BeOneUsageFilters {
    return mergeFiltersWithDrilldown(filters, drilldown)
}

export const beOneUsageLogic = kea([
    path(['scenes', 'beone', 'beOneUsageLogic']),
    actions({
        setDraftFilters: (draftFilters: Partial<BeOneUsageFilters>) => ({ draftFilters }),
        applyFilters: true,
        setFilters: (filters: BeOneUsageFilters) => ({ filters }),
        resetFilters: true,
        reloadOverview: true,
        reloadFeed: true,
        setDrilldown: (drilldown: BeOneDrilldown) => ({ drilldown }),
        clearDrilldown: true,
        hideWidget: (widgetId: BeOneWidgetId) => ({ widgetId }),
        showWidget: (widgetId: BeOneWidgetId) => ({ widgetId }),
        setLocale: (locale: BeOneLocale) => ({ locale }),
        saveDefault: true,
        loadHomeSettings: true,
        loadHomeSettingsSuccess: (settings: BeOneHomeSettings) => ({ settings }),
        setSavingDefault: (saving: boolean) => ({ saving }),
        setHospitalSearch: (query: string) => ({ query }),
        searchHospitals: true,
        clearHospitalSuggestions: true,
    }),
    reducers({
        draftFilters: [
            { ...DEFAULT_BEONE_FILTERS } as BeOneUsageFilters,
            {
                setDraftFilters: (state, { draftFilters }) => ({ ...state, ...draftFilters }),
                setFilters: (_, { filters }) => ({ ...filters }),
                resetFilters: () => ({ ...DEFAULT_BEONE_FILTERS }),
                loadHomeSettingsSuccess: (state, { settings }) =>
                    settings.filters ? { ...DEFAULT_BEONE_FILTERS, ...settings.filters } : state,
            },
        ],
        filters: [
            { ...DEFAULT_BEONE_FILTERS } as BeOneUsageFilters,
            {
                setFilters: (_, { filters }) => ({ ...filters }),
                resetFilters: () => ({ ...DEFAULT_BEONE_FILTERS }),
                loadHomeSettingsSuccess: (state, { settings }) => {
                    if (!settings.filters) {
                        return state
                    }
                    const next = { ...DEFAULT_BEONE_FILTERS, ...settings.filters }
                    return next
                },
            },
        ],
        drilldown: [
            null as BeOneDrilldown,
            {
                setDrilldown: (_, { drilldown }) => drilldown,
                clearDrilldown: () => null,
                setFilters: () => null,
                resetFilters: () => null,
            },
        ],
        hiddenWidgets: [
            [...DEFAULT_HIDDEN_WIDGETS] as BeOneWidgetId[],
            {
                hideWidget: (state, { widgetId }) => (state.includes(widgetId) ? state : [...state, widgetId]),
                showWidget: (state, { widgetId }) => state.filter((id) => id !== widgetId),
                loadHomeSettingsSuccess: (state, { settings }) =>
                    settings.hiddenWidgets ? [...settings.hiddenWidgets] : state,
            },
        ],
        locale: [
            'zh' as BeOneLocale,
            {
                setLocale: (_, { locale }) => locale,
                loadHomeSettingsSuccess: (state, { settings }) => settings.locale ?? state,
            },
        ],
        savingDefault: [
            false,
            {
                setSavingDefault: (_, { saving }) => saving,
            },
        ],
        homeSettingsLoaded: [
            false,
            {
                loadHomeSettingsSuccess: () => true,
            },
        ],
        hospitalSearch: [
            '',
            {
                setHospitalSearch: (_, { query }) => query,
                setDraftFilters: (state, { draftFilters }) => {
                    if ('province' in draftFilters || 'city' in draftFilters) {
                        return ''
                    }
                    if ('hospitalName' in draftFilters) {
                        return draftFilters.hospitalName ?? ''
                    }
                    return state
                },
                resetFilters: () => '',
                clearHospitalSuggestions: () => '',
            },
        ],
        kpisLoaded: [
            false,
            {
                loadKpisSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        rankingLoaded: [
            false,
            {
                loadRankingSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        feedLoaded: [
            false,
            {
                loadFeedSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        usersLoaded: [
            false,
            {
                loadUsersSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        durationHistLoaded: [
            false,
            {
                loadDurationHistSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        hourlyLoaded: [
            false,
            {
                loadHourlySuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        breakdownUserTypeLoaded: [
            false,
            {
                loadBreakdownUserTypeSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        breakdownAccountKindLoaded: [
            false,
            {
                loadBreakdownAccountKindSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        breakdownProvinceLoaded: [
            false,
            {
                loadBreakdownProvinceSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        breakdownHospitalLevelLoaded: [
            false,
            {
                loadBreakdownHospitalLevelSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
        breakdownTitleLoaded: [
            false,
            {
                loadBreakdownTitleSuccess: () => true,
                setFilters: () => false,
                resetFilters: () => false,
                setDrilldown: () => false,
                clearDrilldown: () => false,
            },
        ],
    }),
    loaders(({ values }) => ({
        kpis: [
            { todayActive: 0, periodActive: 0, todayEvents: 0, periodEvents: 0 } as BeOneKpis,
            {
                loadKpis: () =>
                    keepPreviousOnError(values.kpis, async () => {
                        const res = await api.queryHogQL(buildKpiQuery(values.queryFilters), QUERY_TAGS, QUERY_OPTIONS)
                        return parseKpiRows(res.results)
                    }),
            },
        ],
        trend: [
            [] as BeOneTrendPoint[],
            {
                loadTrend: () =>
                    keepPreviousOnError(values.trend, async () => {
                        const f = values.queryFilters
                        const res = await api.queryHogQL(buildTrendQuery(f), QUERY_TAGS, QUERY_OPTIONS)
                        return fillTrendBuckets(parseTrendRows(res.results), f)
                    }),
            },
        ],
        ranking: [
            [] as BeOneRankingRow[],
            {
                loadRanking: () =>
                    keepPreviousOnError(values.ranking, async () => {
                        const res = await api.queryHogQL(
                            buildRankingQuery(values.queryFilters),
                            QUERY_TAGS,
                            QUERY_OPTIONS
                        )
                        return parseRankingRows(res.results)
                    }),
            },
        ],
        feed: [
            [] as BeOneFeedRow[],
            {
                loadFeed: () =>
                    keepPreviousOnError(values.feed, async () => {
                        const res = await api.queryHogQL(buildFeedQuery(values.queryFilters), QUERY_TAGS, QUERY_OPTIONS)
                        return parseFeedRows(res.results)
                    }),
            },
        ],
        users: [
            [] as BeOneUserRow[],
            {
                loadUsers: () =>
                    keepPreviousOnError(values.users, async () => {
                        const res = await api.queryHogQL(
                            buildUserAggQuery(values.queryFilters),
                            QUERY_TAGS,
                            QUERY_OPTIONS
                        )
                        return parseUserAggRows(res.results)
                    }),
            },
        ],
        durationHist: [
            [] as BeOneDurationBucket[],
            {
                loadDurationHist: () =>
                    keepPreviousOnError(values.durationHist, async () => {
                        const res = await api.queryHogQL(
                            buildDurationHistQuery(values.queryFilters),
                            QUERY_TAGS,
                            QUERY_OPTIONS
                        )
                        return parseDurationHistRows(res.results)
                    }),
            },
        ],
        hourly: [
            [] as BeOneHourlyBucket[],
            {
                loadHourly: () =>
                    keepPreviousOnError(values.hourly, async () => {
                        const res = await api.queryHogQL(
                            buildHourlyQuery(values.queryFilters),
                            QUERY_TAGS,
                            QUERY_OPTIONS
                        )
                        return parseHourlyRows(res.results)
                    }),
            },
        ],
        breakdownUserType: [
            [] as BeOneBreakdownRow[],
            {
                loadBreakdownUserType: () =>
                    keepPreviousOnError(values.breakdownUserType, async () => {
                        const res = await api.queryHogQL(
                            buildBreakdownQuery(values.queryFilters, 'user_type'),
                            QUERY_TAGS,
                            QUERY_OPTIONS
                        )
                        return parseBreakdownRows(res.results)
                    }),
            },
        ],
        breakdownAccountKind: [
            [] as BeOneBreakdownRow[],
            {
                loadBreakdownAccountKind: () =>
                    keepPreviousOnError(values.breakdownAccountKind, async () => {
                        const res = await api.queryHogQL(
                            buildBreakdownQuery(values.queryFilters, 'account_kind'),
                            QUERY_TAGS,
                            QUERY_OPTIONS
                        )
                        return parseBreakdownRows(res.results)
                    }),
            },
        ],
        breakdownProvince: [
            [] as BeOneBreakdownRow[],
            {
                loadBreakdownProvince: () =>
                    keepPreviousOnError(values.breakdownProvince, async () => {
                        const res = await api.queryHogQL(
                            buildBreakdownQuery(values.queryFilters, 'province', 'province_label'),
                            QUERY_TAGS,
                            QUERY_OPTIONS
                        )
                        return parseBreakdownRows(res.results)
                    }),
            },
        ],
        breakdownHospitalLevel: [
            [] as BeOneBreakdownRow[],
            {
                loadBreakdownHospitalLevel: () =>
                    keepPreviousOnError(values.breakdownHospitalLevel, async () => {
                        const res = await api.queryHogQL(
                            buildBreakdownQuery(values.queryFilters, 'hospital_level', 'hospital_level_label'),
                            QUERY_TAGS,
                            QUERY_OPTIONS
                        )
                        return parseBreakdownRows(res.results)
                    }),
            },
        ],
        breakdownTitle: [
            [] as BeOneBreakdownRow[],
            {
                loadBreakdownTitle: () =>
                    keepPreviousOnError(values.breakdownTitle, async () => {
                        const kind = values.queryFilters.titleKind || 'teaching_title'
                        const labelProp = kind === 'clinical_title' ? 'clinical_title_label' : 'teaching_title_label'
                        const res = await api.queryHogQL(
                            buildBreakdownQuery(values.queryFilters, kind, labelProp),
                            QUERY_TAGS,
                            QUERY_OPTIONS
                        )
                        return parseBreakdownRows(res.results)
                    }),
            },
        ],
        registrationOptions: [
            null as BeOneRegistrationOptionsResponse | null,
            {
                loadRegistrationOptions: () =>
                    keepPreviousOnError(values.registrationOptions, async () => {
                        return await fetchRegistrationOptions(values.locale === 'en' ? 'en' : 'zh')
                    }),
            },
        ],
        hospitalSuggestions: [
            null as BeOneHospitalsResponse | null,
            {
                loadHospitalSuggestions: () =>
                    keepPreviousOnError(values.hospitalSuggestions, async () => {
                        return await fetchHospitalSuggestions({
                            q: values.hospitalSearch.trim(),
                            province: values.draftFilters.province,
                            city: values.draftFilters.city,
                            lang: values.locale === 'en' ? 'en' : 'zh',
                        })
                    }),
                clearHospitalSuggestions: () => null,
            },
        ],
    })),
    selectors({
        queryFilters: [
            (s) => [s.filters, s.drilldown],
            (filters: BeOneUsageFilters, drilldown: BeOneDrilldown): BeOneUsageFilters =>
                effectiveFilters(filters, drilldown),
        ],
        copy: [(s) => [s.locale], (locale: BeOneLocale) => getBeOneCopy(locale)],
        provinceOptions: [
            (s) => [s.registrationOptions],
            (registrationOptions: BeOneRegistrationOptionsResponse | null): BeOneSelectOption[] =>
                provinceOptionsFromRegions(registrationOptions?.regions ?? []),
        ],
        cityOptions: [
            (s) => [s.registrationOptions, s.draftFilters],
            (
                registrationOptions: BeOneRegistrationOptionsResponse | null,
                draftFilters: BeOneUsageFilters
            ): BeOneSelectOption[] => cityOptionsFromRegions(registrationOptions?.regions ?? [], draftFilters.province),
        ],
        hospitalLevelOptions: [
            (s) => [s.registrationOptions],
            (registrationOptions: BeOneRegistrationOptionsResponse | null): BeOneSelectOption[] =>
                optionsOfKind(registrationOptions?.options ?? [], 'hospital_level'),
        ],
        titleOptions: [
            (s) => [s.registrationOptions, s.draftFilters],
            (
                registrationOptions: BeOneRegistrationOptionsResponse | null,
                draftFilters: BeOneUsageFilters
            ): BeOneSelectOption[] => {
                if (!draftFilters.titleKind) {
                    return []
                }
                return optionsOfKind(registrationOptions?.options ?? [], draftFilters.titleKind)
            },
        ],
        hospitalOptions: [
            (s) => [s.hospitalSuggestions, s.copy],
            (
                hospitalSuggestions: BeOneHospitalsResponse | null,
                copy: ReturnType<typeof getBeOneCopy>
            ): BeOneSelectOption[] => hospitalSelectOptions(hospitalSuggestions, copy.home.hospitalOther),
        ],
        trendGranularity: [
            (s) => [s.queryFilters],
            (filters: BeOneUsageFilters): BeOneTrendGranularity => trendGranularityForFilters(filters),
        ],
        hasAnyData: [
            (s) => [s.kpis, s.feed],
            (kpis: BeOneKpis, feed: BeOneFeedRow[]): boolean => kpis.periodEvents > 0 || feed.length > 0,
        ],
        visibleWidgets: [
            (s) => [s.hiddenWidgets],
            (hiddenWidgets: BeOneWidgetId[]): BeOneWidgetId[] =>
                ALL_WIDGET_IDS.filter((id) => !hiddenWidgets.includes(id)),
        ],
        addableWidgets: [(s) => [s.hiddenWidgets], (hiddenWidgets: BeOneWidgetId[]): BeOneWidgetId[] => hiddenWidgets],
        kpisInitialLoading: [
            (s) => [s.kpisLoading, s.kpisLoaded],
            (loading: boolean, loaded: boolean): boolean => loading && !loaded,
        ],
        rankingInitialLoading: [
            (s) => [s.rankingLoading, s.rankingLoaded],
            (loading: boolean, loaded: boolean): boolean => loading && !loaded,
        ],
        feedInitialLoading: [
            (s) => [s.feedLoading, s.feedLoaded],
            (loading: boolean, loaded: boolean): boolean => loading && !loaded,
        ],
        usersInitialLoading: [
            (s) => [s.usersLoading, s.usersLoaded],
            (loading: boolean, loaded: boolean): boolean => loading && !loaded,
        ],
        durationHistInitialLoading: [
            (s) => [s.durationHistLoading, s.durationHistLoaded],
            (loading: boolean, loaded: boolean): boolean => loading && !loaded,
        ],
        hourlyInitialLoading: [
            (s) => [s.hourlyLoading, s.hourlyLoaded],
            (loading: boolean, loaded: boolean): boolean => loading && !loaded,
        ],
    }),
    listeners(({ actions, values }) => ({
        reloadOverview: () => {
            actions.loadKpis()
            actions.loadTrend()
            actions.loadRanking()
            actions.loadUsers()
            actions.loadDurationHist()
            actions.loadHourly()
            actions.loadBreakdownUserType()
            actions.loadBreakdownAccountKind()
            actions.loadBreakdownProvince()
            actions.loadBreakdownHospitalLevel()
            actions.loadBreakdownTitle()
        },
        reloadFeed: () => {
            actions.loadFeed()
        },
        applyFilters: () => {
            actions.setFilters({ ...values.draftFilters })
        },
        setFilters: () => {
            actions.reloadOverview()
            actions.reloadFeed()
        },
        resetFilters: () => {
            actions.reloadOverview()
            actions.reloadFeed()
        },
        setDrilldown: () => {
            actions.reloadOverview()
            actions.reloadFeed()
        },
        clearDrilldown: () => {
            actions.reloadOverview()
            actions.reloadFeed()
        },
        setDraftFilters: ({ draftFilters }) => {
            if ('province' in draftFilters || 'city' in draftFilters) {
                // Doc: clearing province/city must drop the hospital pick; reload top-30 for the new scope.
                actions.clearHospitalSuggestions()
                actions.searchHospitals()
            }
        },
        setHospitalSearch: () => {
            actions.searchHospitals()
        },
        searchHospitals: async (_, breakpoint) => {
            await breakpoint(HOSPITAL_SEARCH_DEBOUNCE_MS)
            actions.loadHospitalSuggestions()
        },
        setLocale: () => {
            actions.loadRegistrationOptions()
        },
        loadHomeSettingsSuccess: () => {
            actions.loadRegistrationOptions()
        },
        loadHomeSettings: async () => {
            try {
                const res = await api.get('api/user_home_settings/@me/')
                const beone = (res?.homepage?.beone ?? {}) as BeOneHomeSettings
                actions.loadHomeSettingsSuccess(beone)
                if (beone.filters) {
                    actions.setFilters({ ...DEFAULT_BEONE_FILTERS, ...beone.filters })
                } else {
                    actions.reloadOverview()
                    actions.reloadFeed()
                }
            } catch (error) {
                console.warn('[beone] failed to load home settings', error)
                actions.reloadOverview()
                actions.reloadFeed()
            }
        },
        saveDefault: async () => {
            actions.setSavingDefault(true)
            try {
                const current = await api.get('api/user_home_settings/@me/')
                const homepage = { ...current?.homepage }
                homepage.beone = {
                    filters: values.filters,
                    hiddenWidgets: values.hiddenWidgets,
                    locale: values.locale,
                }
                await api.update('api/user_home_settings/@me/', { homepage })
            } catch (error) {
                console.warn('[beone] failed to save default settings', error)
            } finally {
                actions.setSavingDefault(false)
            }
        },
    })),
    afterMount(({ actions, cache }) => {
        actions.loadHomeSettings()
        actions.loadRegistrationOptions()

        cache.disposables.add(() => {
            const id = window.setInterval(() => {
                if (!document.hidden) {
                    actions.reloadOverview()
                }
            }, OVERVIEW_POLL_INTERVAL_MS)
            return () => clearInterval(id)
        }, 'overviewPoll')
        cache.disposables.add(() => {
            const id = window.setInterval(() => {
                if (!document.hidden) {
                    actions.reloadFeed()
                }
            }, FEED_POLL_INTERVAL_MS)
            return () => clearInterval(id)
        }, 'feedPoll')
        cache.disposables.add(() => {
            const onVisibilityChange = (): void => {
                if (!document.hidden) {
                    actions.reloadOverview()
                    actions.reloadFeed()
                }
            }
            document.addEventListener('visibilitychange', onVisibilityChange)
            return () => document.removeEventListener('visibilitychange', onVisibilityChange)
        }, 'visibilityReload')
    }),
])
