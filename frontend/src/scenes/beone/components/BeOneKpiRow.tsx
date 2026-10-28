import { LemonCard, LemonSkeleton } from '@posthog/lemon-ui'

import { beoneCopy } from '~/beone/copy.zh'

import type { BeOneKpis } from '../beOneUsageQueries'

export function BeOneKpiRow({ kpis, loading }: { kpis: BeOneKpis; loading?: boolean }): JSX.Element {
    const items: { label: string; value: number }[] = [
        { label: beoneCopy.home.kpiTodayActive, value: kpis.todayActive },
        { label: beoneCopy.home.kpiPeriodActive, value: kpis.periodActive },
        { label: beoneCopy.home.kpiTodayEvents, value: kpis.todayEvents },
        { label: beoneCopy.home.kpiPeriodEvents, value: kpis.periodEvents },
    ]
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-attr="beone-kpi-row">
            {items.map(({ label, value }) => (
                <LemonCard key={label} hoverEffect={false} className="p-4">
                    <div className="text-secondary text-xs">{label}</div>
                    {loading ? (
                        <LemonSkeleton className="h-8 w-20 mt-1" />
                    ) : (
                        <div className="text-3xl font-semibold text-[color:var(--color-beone-blue)]">
                            {value.toLocaleString()}
                        </div>
                    )}
                </LemonCard>
            ))}
        </div>
    )
}
