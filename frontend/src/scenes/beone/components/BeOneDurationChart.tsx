import { LemonCard } from '@posthog/lemon-ui'

import { beoneCopy } from '~/beone/copy.zh'

import type { BeOneDurationBucket } from '../beOneUsageQueries'

const WIDTH = 600
const HEIGHT = 160
const PADDING = 8
const BAR_GAP = 8

export function BeOneDurationChart({
    buckets,
    loading,
}: {
    buckets: BeOneDurationBucket[]
    loading?: boolean
}): JSX.Element {
    const max = Math.max(0, ...buckets.map((b) => b.count))
    const barWidth = buckets.length > 0 ? (WIDTH - PADDING * 2 - BAR_GAP * (buckets.length - 1)) / buckets.length : 0
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-duration-chart">
            <h2 className="text-base font-semibold mb-2">{beoneCopy.home.durationTitle}</h2>
            {loading || buckets.every((b) => b.count === 0) ? (
                <div className="text-secondary text-sm py-8 text-center">{loading ? '…' : beoneCopy.home.empty}</div>
            ) : (
                <svg
                    viewBox={`0 0 ${WIDTH} ${HEIGHT + 24}`}
                    className="w-full h-48"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={beoneCopy.home.durationTitle}
                >
                    {buckets.map((b, i) => {
                        const h = max > 0 ? (b.count / max) * (HEIGHT - PADDING * 2) : 0
                        const x = PADDING + i * (barWidth + BAR_GAP)
                        const y = HEIGHT - PADDING - h
                        return (
                            <g key={b.bucket}>
                                <rect x={x} y={y} width={barWidth} height={h} fill="var(--color-beone-sky)" rx={2} />
                                <text
                                    x={x + barWidth / 2}
                                    y={HEIGHT + 14}
                                    textAnchor="middle"
                                    className="fill-current"
                                    style={{ fontSize: 10 }}
                                >
                                    {b.bucket}
                                </text>
                                <text
                                    x={x + barWidth / 2}
                                    y={y - 4}
                                    textAnchor="middle"
                                    className="fill-current"
                                    style={{ fontSize: 10 }}
                                >
                                    {b.count}
                                </text>
                            </g>
                        )
                    })}
                </svg>
            )}
        </LemonCard>
    )
}
