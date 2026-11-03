import { LemonButton, LemonCard } from '@posthog/lemon-ui'

import type { BeOneCopy } from '~/beone/copy'

import type { BeOneTrendPoint } from '../beOneUsageQueries'

const WIDTH = 720
const HEIGHT = 200
const PADDING = 12

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

export function BeOneTrendChart({
    trend,
    copy,
    onClose,
}: {
    trend: BeOneTrendPoint[]
    copy: BeOneCopy
    onClose?: () => void
}): JSX.Element {
    const eventsMax = Math.max(0, ...trend.map((p) => p.events))
    const activesMax = Math.max(0, ...trend.map((p) => p.actives))
    const chartMax = Math.max(eventsMax, activesMax)
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-trend-chart">
            <div className="flex items-start justify-between mb-1 gap-2">
                <div>
                    <h2 className="text-base font-semibold m-0">{copy.home.trendTitle}</h2>
                    <p className="text-xs text-secondary m-0 mt-1">{copy.home.trendHint}</p>
                </div>
                {onClose ? (
                    <LemonButton size="xsmall" type="tertiary" onClick={onClose}>
                        {copy.home.closeWidget}
                    </LemonButton>
                ) : null}
            </div>
            {trend.length === 0 || chartMax === 0 ? (
                <div className="text-secondary text-sm py-8 text-center">{copy.home.empty}</div>
            ) : (
                <svg
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    className="w-full h-52"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={copy.home.trendTitle}
                >
                    <polyline
                        fill="none"
                        stroke="var(--color-beone-sky)"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        points={toPoints(
                            trend.map((p) => p.events),
                            chartMax
                        )}
                    />
                    <polyline
                        fill="none"
                        stroke="var(--color-beone-accent)"
                        strokeWidth={2}
                        vectorEffect="non-scaling-stroke"
                        points={toPoints(
                            trend.map((p) => p.actives),
                            chartMax
                        )}
                    />
                    {trend.map((p, i) => {
                        const step = trend.length > 1 ? (WIDTH - PADDING * 2) / (trend.length - 1) : 0
                        const x = trend.length > 1 ? PADDING + i * step : WIDTH / 2
                        const ey =
                            HEIGHT - PADDING - (chartMax > 0 ? (p.events / chartMax) * (HEIGHT - PADDING * 2) : 0)
                        const ay =
                            HEIGHT - PADDING - (chartMax > 0 ? (p.actives / chartMax) * (HEIGHT - PADDING * 2) : 0)
                        return (
                            <g key={p.bucket}>
                                {p.events > 0 ? <circle cx={x} cy={ey} r={3} fill="var(--color-beone-sky)" /> : null}
                                {p.actives > 0 ? (
                                    <circle cx={x} cy={ay} r={3} fill="var(--color-beone-accent)" />
                                ) : null}
                            </g>
                        )
                    })}
                </svg>
            )}
            <div className="flex gap-4 text-xs text-secondary mt-2">
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5 bg-[color:var(--color-beone-sky)]" />
                    {copy.home.trendEvents}
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block w-3 h-0.5 bg-[color:var(--color-beone-accent)]" />
                    {copy.home.trendActives}
                </span>
            </div>
        </LemonCard>
    )
}
