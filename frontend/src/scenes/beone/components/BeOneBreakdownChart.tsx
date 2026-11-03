import { useState } from 'react'

import { LemonButton, LemonCard, LemonSegmentedButton } from '@posthog/lemon-ui'

import type { BeOneCopy } from '~/beone/copy'

import type { BeOneBreakdownRow } from '../beOneUsageQueries'

const WIDTH = 560
const HEIGHT = 180
const PADDING = 8

export function BeOneBreakdownChart({
    title,
    rows,
    dimension,
    copy,
    loading,
    onDrilldown,
    onClose,
}: {
    title: string
    rows: BeOneBreakdownRow[]
    dimension: string
    copy: BeOneCopy
    loading?: boolean
    onDrilldown: (dimension: string, value: string, label: string) => void
    onClose?: () => void
}): JSX.Element {
    const [mode, setMode] = useState<'bar' | 'pie'>('bar')
    const maxPeople = Math.max(0, ...rows.map((r) => r.people))
    const maxEvents = Math.max(0, ...rows.map((r) => r.events))
    const totalPeople = rows.reduce((s, r) => s + r.people, 0)
    const barScale = Math.max(maxPeople, maxEvents)

    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr={`beone-breakdown-${dimension}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
                <h2 className="text-base font-semibold m-0">{title}</h2>
                <div className="flex items-center gap-1">
                    <LemonSegmentedButton
                        size="xsmall"
                        value={mode}
                        onChange={(v) => setMode(v as 'bar' | 'pie')}
                        options={[
                            { value: 'bar', label: copy.home.chartModeBar },
                            { value: 'pie', label: copy.home.chartModePie },
                        ]}
                    />
                    {onClose ? (
                        <LemonButton size="xsmall" type="tertiary" onClick={onClose}>
                            {copy.home.closeWidget}
                        </LemonButton>
                    ) : null}
                </div>
            </div>
            {loading || rows.length === 0 || totalPeople === 0 ? (
                <div className="text-secondary text-sm py-8 text-center">{loading ? '…' : copy.home.empty}</div>
            ) : mode === 'bar' ? (
                <div>
                    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-44" role="img" aria-label={title}>
                        {rows.slice(0, 12).map((r, i) => {
                            const groupW = (WIDTH - PADDING * 2) / Math.min(rows.length, 12)
                            const barW = Math.max(2, (groupW - 6) / 2)
                            const x = PADDING + i * groupW
                            const peopleH = barScale > 0 ? (r.people / barScale) * (HEIGHT - 28) : 0
                            const eventsH = barScale > 0 ? (r.events / barScale) * (HEIGHT - 28) : 0
                            return (
                                <g
                                    key={r.value}
                                    className="cursor-pointer"
                                    onClick={() => onDrilldown(dimension, r.value, r.label)}
                                >
                                    <rect
                                        x={x}
                                        y={HEIGHT - 20 - peopleH}
                                        width={barW}
                                        height={peopleH}
                                        fill="var(--color-beone-sky)"
                                        rx={2}
                                    />
                                    <rect
                                        x={x + barW + 2}
                                        y={HEIGHT - 20 - eventsH}
                                        width={barW}
                                        height={eventsH}
                                        fill="var(--color-beone-accent)"
                                        rx={2}
                                    />
                                    <text
                                        x={x + groupW / 2 - 3}
                                        y={HEIGHT - 6}
                                        textAnchor="middle"
                                        style={{ fontSize: 9 }}
                                        className="fill-current"
                                    >
                                        {(r.label || r.value).slice(0, 6)}
                                    </text>
                                </g>
                            )
                        })}
                    </svg>
                    <div className="flex gap-4 text-xs text-secondary mt-1">
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-sm bg-[color:var(--color-beone-sky)]" />
                            {copy.home.people}
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-2 h-2 rounded-sm bg-[color:var(--color-beone-accent)]" />
                            {copy.home.events}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-4">
                    <svg viewBox="0 0 120 120" className="w-32 h-32 shrink-0" role="img" aria-label={title}>
                        {(() => {
                            let angle = 0
                            const colors = [
                                'var(--color-beone-sky)',
                                'var(--color-beone-accent)',
                                'var(--color-beone-blue)',
                                'var(--color-beone-midnight)',
                                '#6b8f71',
                                '#c4a35a',
                            ]
                            return rows.slice(0, 8).map((r, i) => {
                                const slice = (r.people / totalPeople) * Math.PI * 2
                                const x1 = 60 + 50 * Math.cos(angle)
                                const y1 = 60 + 50 * Math.sin(angle)
                                angle += slice
                                const x2 = 60 + 50 * Math.cos(angle)
                                const y2 = 60 + 50 * Math.sin(angle)
                                const large = slice > Math.PI ? 1 : 0
                                const d = `M60,60 L${x1},${y1} A50,50 0 ${large} 1 ${x2},${y2} Z`
                                return (
                                    <path
                                        key={r.value}
                                        d={d}
                                        fill={colors[i % colors.length]}
                                        className="cursor-pointer"
                                        onClick={() => onDrilldown(dimension, r.value, r.label)}
                                    />
                                )
                            })
                        })()}
                    </svg>
                    <ul className="text-xs space-y-1 m-0 p-0 list-none">
                        {rows.slice(0, 8).map((r) => (
                            <li key={r.value}>
                                <button
                                    type="button"
                                    className="text-left hover:underline"
                                    onClick={() => onDrilldown(dimension, r.value, r.label)}
                                >
                                    {r.label || r.value}: {((r.people / totalPeople) * 100).toFixed(1)}%
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </LemonCard>
    )
}
