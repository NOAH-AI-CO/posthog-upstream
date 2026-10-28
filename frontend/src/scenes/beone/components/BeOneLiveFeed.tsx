import { LemonButton, LemonCard, LemonTable } from '@posthog/lemon-ui'

import { TZLabel } from 'lib/components/TZLabel'
import { urls } from 'scenes/urls'

import { beoneCopy } from '~/beone/copy.zh'
import { ActivityTab } from '~/types'

import type { BeOneFeedRow } from '../beOneUsageQueries'

export function BeOneLiveFeed({ feed, loading }: { feed: BeOneFeedRow[]; loading?: boolean }): JSX.Element {
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-live-feed">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold m-0">{beoneCopy.home.feedTitle}</h2>
                <LemonButton size="small" type="secondary" to={urls.activity(ActivityTab.ExploreEvents)}>
                    {beoneCopy.home.feedViewAll}
                </LemonButton>
            </div>
            <LemonTable
                dataSource={feed}
                loading={loading}
                rowKey={(row) => `${row.timestamp}-${row.distinctId}-${row.event}`}
                size="small"
                embedded
                columns={[
                    {
                        title: beoneCopy.home.feedTime,
                        width: 120,
                        render: (_, row) => <TZLabel time={row.timestamp} />,
                    },
                    { title: beoneCopy.home.feedEvent, dataIndex: 'event' },
                    { title: beoneCopy.home.feedModule, dataIndex: 'moduleLabel' },
                    {
                        title: beoneCopy.home.feedUser,
                        dataIndex: 'distinctId',
                        render: (_, row) => <span className="font-mono text-xs truncate">{row.distinctId}</span>,
                    },
                ]}
            />
        </LemonCard>
    )
}
