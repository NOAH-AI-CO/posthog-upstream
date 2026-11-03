import { useActions, useValues } from 'kea'

import { LemonButton, LemonButtonWithDropdown, LemonSegmentedButton } from '@posthog/lemon-ui'

import { SceneExport } from 'scenes/sceneTypes'

import type { BeOneCopy } from '~/beone/copy'

import { beOneUsageLogic } from './beOneUsageLogic'
import type { BeOneWidgetId } from './beOneUsageQueries'
import { BeOneBreakdownChart } from './components/BeOneBreakdownChart'
import { BeOneDurationChart } from './components/BeOneDurationChart'
import { BeOneHourlyChart } from './components/BeOneHourlyChart'
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

function widgetLabel(copy: BeOneCopy, id: BeOneWidgetId): string {
    switch (id) {
        case 'trend':
            return copy.home.trendTitle
        case 'users':
            return copy.home.userTableTitle
        case 'ranking':
            return copy.home.rankingTitle
        case 'feed':
            return copy.home.feedTitle
        case 'duration':
            return copy.home.durationTitle
        case 'hourly':
            return copy.home.hourlyTitle
        case 'breakdown_user_type':
            return copy.home.breakdownUserType
        case 'breakdown_account_kind':
            return copy.home.breakdownAccountKind
        case 'breakdown_province':
            return copy.home.breakdownProvince
        case 'breakdown_hospital_level':
            return copy.home.breakdownHospitalLevel
        case 'breakdown_title':
            return copy.home.breakdownTitle
    }
}

export function BeOneUsageOverview(): JSX.Element {
    const {
        kpis,
        trend,
        ranking,
        feed,
        users,
        durationHist,
        hourly,
        breakdownUserType,
        breakdownAccountKind,
        breakdownProvince,
        breakdownHospitalLevel,
        breakdownTitle,
        draftFilters,
        drilldown,
        hiddenWidgets,
        addableWidgets,
        copy,
        locale,
        savingDefault,
        hasAnyData,
        kpisLoaded,
        kpisInitialLoading,
        rankingInitialLoading,
        feedInitialLoading,
        usersInitialLoading,
        durationHistInitialLoading,
        hourlyInitialLoading,
        provinceOptions,
        cityOptions,
        hospitalLevelOptions,
        titleOptions,
        queryFilters,
    } = useValues(beOneUsageLogic)
    const {
        setDraftFilters,
        applyFilters,
        resetFilters,
        saveDefault,
        setLocale,
        setDrilldown,
        clearDrilldown,
        hideWidget,
        showWidget,
    } = useActions(beOneUsageLogic)

    const show = (id: BeOneWidgetId): boolean => !hiddenWidgets.includes(id)
    const titleDimension = queryFilters.titleKind || 'teaching_title'

    return (
        <div className="p-4 flex flex-col gap-4 max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-semibold text-[color:var(--color-beone-blue)] m-0">{copy.home.title}</h1>
                <div className="flex items-center gap-2">
                    <LemonSegmentedButton
                        size="small"
                        value={locale}
                        onChange={(v) => setLocale(v as 'zh' | 'en')}
                        options={[
                            { value: 'zh', label: copy.home.localeZh },
                            { value: 'en', label: copy.home.localeEn },
                        ]}
                    />
                    {addableWidgets.length > 0 ? (
                        <LemonButtonWithDropdown
                            type="secondary"
                            size="small"
                            dropdown={{
                                actionable: true,
                                closeOnClickInside: true,
                                overlay: (
                                    <div className="flex flex-col gap-1 p-1 min-w-48">
                                        {addableWidgets.map((id) => (
                                            <LemonButton key={id} size="small" fullWidth onClick={() => showWidget(id)}>
                                                {widgetLabel(copy, id)}
                                            </LemonButton>
                                        ))}
                                    </div>
                                ),
                            }}
                        >
                            {copy.home.addWidget}
                        </LemonButtonWithDropdown>
                    ) : null}
                </div>
            </div>

            <BeOneUsageFilters
                draft={draftFilters}
                copy={copy}
                onChange={setDraftFilters}
                onApply={applyFilters}
                onReset={resetFilters}
                onSaveDefault={saveDefault}
                saving={savingDefault}
                provinceOptions={provinceOptions}
                cityOptions={cityOptions}
                hospitalLevelOptions={hospitalLevelOptions}
                titleOptions={titleOptions}
            />

            {drilldown ? (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-secondary">
                        {copy.home.drilldownActive}: {drilldown.label || drilldown.value}
                    </span>
                    <LemonButton size="xsmall" type="secondary" onClick={clearDrilldown}>
                        {copy.home.drilldownClear}
                    </LemonButton>
                </div>
            ) : null}

            {!hasAnyData && kpisLoaded ? <p className="text-secondary">{copy.home.empty}</p> : null}
            <BeOneKpiRow kpis={kpis} copy={copy} loading={kpisInitialLoading} />

            {show('trend') ? <BeOneTrendChart trend={trend} copy={copy} onClose={() => hideWidget('trend')} /> : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {show('hourly') ? (
                    <BeOneHourlyChart
                        buckets={hourly}
                        copy={copy}
                        loading={hourlyInitialLoading}
                        onClose={() => hideWidget('hourly')}
                    />
                ) : null}
                {show('ranking') ? (
                    <BeOneModuleRanking
                        ranking={ranking}
                        copy={copy}
                        loading={rankingInitialLoading}
                        onClose={() => hideWidget('ranking')}
                        onDrilldown={(module, label) => setDrilldown({ dimension: 'module', value: module, label })}
                    />
                ) : null}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {show('breakdown_user_type') ? (
                    <BeOneBreakdownChart
                        title={copy.home.breakdownUserType}
                        rows={breakdownUserType}
                        dimension="user_type"
                        copy={copy}
                        onDrilldown={(dimension, value, label) => setDrilldown({ dimension, value, label })}
                        onClose={() => hideWidget('breakdown_user_type')}
                    />
                ) : null}
                {show('breakdown_account_kind') ? (
                    <BeOneBreakdownChart
                        title={copy.home.breakdownAccountKind}
                        rows={breakdownAccountKind}
                        dimension="account_kind"
                        copy={copy}
                        onDrilldown={(dimension, value, label) => setDrilldown({ dimension, value, label })}
                        onClose={() => hideWidget('breakdown_account_kind')}
                    />
                ) : null}
                {show('breakdown_province') ? (
                    <BeOneBreakdownChart
                        title={copy.home.breakdownProvince}
                        rows={breakdownProvince}
                        dimension="province"
                        copy={copy}
                        onDrilldown={(dimension, value, label) => setDrilldown({ dimension, value, label })}
                        onClose={() => hideWidget('breakdown_province')}
                    />
                ) : null}
                {show('breakdown_hospital_level') ? (
                    <BeOneBreakdownChart
                        title={copy.home.breakdownHospitalLevel}
                        rows={breakdownHospitalLevel}
                        dimension="hospital_level"
                        copy={copy}
                        onDrilldown={(dimension, value, label) => setDrilldown({ dimension, value, label })}
                        onClose={() => hideWidget('breakdown_hospital_level')}
                    />
                ) : null}
                {show('breakdown_title') ? (
                    <BeOneBreakdownChart
                        title={copy.home.breakdownTitle}
                        rows={breakdownTitle}
                        dimension={titleDimension}
                        copy={copy}
                        onDrilldown={(dimension, value, label) => setDrilldown({ dimension, value, label })}
                        onClose={() => hideWidget('breakdown_title')}
                    />
                ) : null}
                {show('duration') ? (
                    <BeOneDurationChart
                        buckets={durationHist}
                        copy={copy}
                        loading={durationHistInitialLoading}
                        onClose={() => hideWidget('duration')}
                    />
                ) : null}
            </div>

            {show('users') ? (
                <BeOneUserTable
                    users={users}
                    copy={copy}
                    loading={usersInitialLoading}
                    onClose={() => hideWidget('users')}
                />
            ) : null}
            {show('feed') ? (
                <BeOneLiveFeed
                    feed={feed}
                    copy={copy}
                    loading={feedInitialLoading}
                    onClose={() => hideWidget('feed')}
                />
            ) : null}
        </div>
    )
}
