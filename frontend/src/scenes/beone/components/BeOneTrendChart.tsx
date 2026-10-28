import { LemonCard } from '@posthog/lemon-ui'

import { beoneCopy } from '~/beone/copy.zh'

import type { BeOneRange, BeOneTrendPoint } from '../beOneUsageQueries'

const WIDTH = 600
const HEIGHT = 160
const PADDING = 8

const RANGE_LABEL: Record<BeOneRange, string> = {
    '24h': beoneCopy.home.trend24h,
    '7d': beoneCopy.home.trend7d,
    '30d': beoneCopy.home.trend30d,
}

function toPoints(values: number[], max: number): string {
    const step = values.length > 1 ? (WIDTH - PADDING * 2) / (values.length - 1) : 0
    return values
        .map((v, i) => {
            const x = values.length > 1 ? PADDING + i * step : WIDTH / 2
            const y = HEIGHT - PADDING - (max > 0 ? (v / max) * (HEIGHT - PADDING * 2) : 0)
            return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')
}

export function BeOneTrendChart({ trend, range }: { trend: BeOneTrendPoint[]; range: BeOneRange }): JSX.Element {
    // Each series is scaled to its own max so the smaller one (actives) stays readable
    const eventsMax = Math.max(0, ...trend.map((p) => p.events))
    const activesMax = Math.max(0, ...trend.map((p) => p.actives))
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-trend-chart">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold m-0">{beoneCopy.home.trendTitle}</h2>
                <span className="text-xs text-secondary">{RANGE_LABEL[range]}</span>
            </div>
            {trend.length === 0 ? (
                <div className="text-secondary text-sm py-8 text-center">{beoneCopy.home.empty}</div>
            ) : (
                <svg
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    className="w-full h-40"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={beoneCopy.home.trendTitle}
                >
                    <polyline
                        fill="none"
                        stroke="var(--color-beone-sky)"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        points={toPoints(
                            trend.map((p) => p.events),
                            eventsMax
                        )}
                    />
                    <polyline
                        fill="none"
                        stroke="var(--color-beone-accent)"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        points={toPoints(
                            trend.map((p) => p.actives),
                            activesMax
                        )}
                    />
                </svg>
            )}
            <div className="flex gap-4 text-xs text-secondary mt-2">
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5 bg-[color:var(--color-beone-sky)]" />
                    {beoneCopy.home.trendEvents}
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5 bg-[color:var(--color-beone-accent)]" />
                    {beoneCopy.home.trendActives}
                </span>
            </div>
        </LemonCard>
    )
}
