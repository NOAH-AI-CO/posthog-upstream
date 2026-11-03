import { LemonCard, LemonSkeleton } from '@posthog/lemon-ui'

import type { BeOneCopy } from '~/beone/copy'

import type { BeOneKpis } from '../beOneUsageQueries'

export function BeOneKpiRow({
    kpis,
    copy,
    loading,
}: {
    kpis: BeOneKpis
    copy: BeOneCopy
    loading?: boolean
}): JSX.Element {
    const items: { label: string; value: number }[] = [
        { label: copy.home.kpiTodayActive, value: kpis.todayActive },
        { label: copy.home.kpiPeriodActive, value: kpis.periodActive },
        { label: copy.home.kpiTodayEvents, value: kpis.todayEvents },
        { label: copy.home.kpiPeriodEvents, value: kpis.periodEvents },
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
