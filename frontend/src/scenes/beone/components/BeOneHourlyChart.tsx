import { LemonButton, LemonCard } from '@posthog/lemon-ui'

import type { BeOneCopy } from '~/beone/copy'

import type { BeOneHourlyBucket } from '../beOneUsageQueries'

const WIDTH = 600
const HEIGHT = 160
const PADDING = 8

export function BeOneHourlyChart({
    buckets,
    copy,
    loading,
    onClose,
}: {
    buckets: BeOneHourlyBucket[]
    copy: BeOneCopy
    loading?: boolean
    onClose?: () => void
}): JSX.Element {
    const max = Math.max(0, ...buckets.map((b) => b.count))
    const barWidth = buckets.length > 0 ? (WIDTH - PADDING * 2) / buckets.length - 1 : 0
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-hourly-chart">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold m-0">{copy.home.hourlyTitle}</h2>
                {onClose ? (
                    <LemonButton size="xsmall" type="tertiary" onClick={onClose}>
                        {copy.home.closeWidget}
                    </LemonButton>
                ) : null}
            </div>
            {loading || max === 0 ? (
                <div className="text-secondary text-sm py-8 text-center">{loading ? '…' : copy.home.empty}</div>
            ) : (
                <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + 20}`} className="w-full h-44" role="img">
                    {buckets.map((b, i) => {
                        const h = max > 0 ? (b.count / max) * (HEIGHT - PADDING * 2) : 0
                        const x = PADDING + i * (barWidth + 1)
                        const y = HEIGHT - PADDING - h
                        return (
                            <g key={b.hour}>
                                <rect x={x} y={y} width={barWidth} height={h} fill="var(--color-beone-sky)" rx={1} />
                                {b.hour % 3 === 0 ? (
                                    <text
                                        x={x + barWidth / 2}
                                        y={HEIGHT + 12}
                                        textAnchor="middle"
                                        style={{ fontSize: 9 }}
                                        className="fill-current"
                                    >
                                        {b.hour}
                                    </text>
                                ) : null}
                            </g>
                        )
                    })}
                </svg>
            )}
        </LemonCard>
    )
}
