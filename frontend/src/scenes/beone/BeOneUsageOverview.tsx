import { useActions, useValues } from 'kea'

import { SceneExport } from 'scenes/sceneTypes'

import { beoneCopy } from '~/beone/copy.zh'

import { beOneUsageLogic } from './beOneUsageLogic'
import { BeOneDurationChart } from './components/BeOneDurationChart'
import { BeOneKpiRow } from './components/BeOneKpiRow'
import { BeOneLiveFeed } from './components/BeOneLiveFeed'
import { BeOneModuleRanking } from './components/BeOneModuleRanking'
import { BeOneTrendChart } from './components/BeOneTrendChart'
import { BeOneUsageFilters } from './components/BeOneUsageFilters'
import { BeOneUserTable } from './components/BeOneUserTable'

export const scene: SceneExport = {
    component: BeOneUsageOverview,
    logic: beOneUsageLogic,
}

export function BeOneUsageOverview(): JSX.Element {
    const {
        kpis,
        trend,
        ranking,
        feed,
        users,
        durationHist,
        draftFilters,
        filters,
        hasAnyData,
        kpisLoaded,
        kpisInitialLoading,
        rankingInitialLoading,
        feedInitialLoading,
        usersInitialLoading,
        durationHistInitialLoading,
    } = useValues(beOneUsageLogic)
    const { setDraftFilters, applyFilters, resetFilters } = useActions(beOneUsageLogic)

    return (
        <div className="p-4 flex flex-col gap-4 max-w-7xl mx-auto">
            <h1 className="text-2xl font-semibold text-[color:var(--color-beone-blue)]">{beoneCopy.home.title}</h1>
            <BeOneUsageFilters
                draft={draftFilters}
                onChange={setDraftFilters}
                onApply={applyFilters}
                onReset={resetFilters}
            />
            {!hasAnyData && kpisLoaded ? <p className="text-secondary">{beoneCopy.home.empty}</p> : null}
            <BeOneKpiRow kpis={kpis} loading={kpisInitialLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BeOneTrendChart trend={trend} range={filters.range} />
                <BeOneDurationChart buckets={durationHist} loading={durationHistInitialLoading} />
            </div>
            <BeOneUserTable users={users} loading={usersInitialLoading} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <BeOneModuleRanking ranking={ranking} loading={rankingInitialLoading} />
                <BeOneLiveFeed feed={feed} loading={feedInitialLoading} />
            </div>
        </div>
    )
}
