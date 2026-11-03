import { LemonButton, LemonCard, LemonTable } from '@posthog/lemon-ui'

import type { BeOneCopy } from '~/beone/copy'

import type { BeOneRankingRow } from '../beOneUsageQueries'

export function BeOneModuleRanking({
    ranking,
    copy,
    loading,
    onClose,
    onDrilldown,
}: {
    ranking: BeOneRankingRow[]
    copy: BeOneCopy
    loading?: boolean
    onClose?: () => void
    onDrilldown?: (module: string, label: string) => void
}): JSX.Element {
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-module-ranking">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold m-0">{copy.home.rankingTitle}</h2>
                {onClose ? (
                    <LemonButton size="xsmall" type="tertiary" onClick={onClose}>
                        {copy.home.closeWidget}
                    </LemonButton>
                ) : null}
            </div>
            <LemonTable
                dataSource={ranking}
                loading={loading}
                rowKey="module"
                size="small"
                embedded
                onRow={
                    onDrilldown
                        ? (row) => ({
                              className: 'cursor-pointer',
                              onClick: () => onDrilldown(row.module, row.label),
                          })
                        : undefined
                }
                columns={[
                    { title: '#', width: 32, render: (_, __, index) => index + 1 },
                    { title: copy.home.rankingModule, dataIndex: 'label' },
                    {
                        title: copy.home.rankingCount,
                        dataIndex: 'count',
                        align: 'right',
                        render: (_, row) => row.count.toLocaleString(),
                    },
                ]}
            />
        </LemonCard>
    )
}
