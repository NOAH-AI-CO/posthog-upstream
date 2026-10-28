import { LemonCard, LemonTable } from '@posthog/lemon-ui'

import { beoneCopy } from '~/beone/copy.zh'

import type { BeOneRankingRow } from '../beOneUsageQueries'

export function BeOneModuleRanking({
    ranking,
    loading,
}: {
    ranking: BeOneRankingRow[]
    loading?: boolean
}): JSX.Element {
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-module-ranking">
            <h2 className="text-base font-semibold mb-2">{beoneCopy.home.rankingTitle}</h2>
            <LemonTable
                dataSource={ranking}
                loading={loading}
                rowKey="module"
                size="small"
                embedded
                columns={[
                    { title: '#', width: 32, render: (_, __, index) => index + 1 },
                    { title: beoneCopy.home.rankingModule, dataIndex: 'label' },
                    {
                        title: beoneCopy.home.rankingCount,
                        dataIndex: 'count',
                        align: 'right',
                        render: (_, row) => row.count.toLocaleString(),
                    },
                ]}
            />
        </LemonCard>
    )
}
