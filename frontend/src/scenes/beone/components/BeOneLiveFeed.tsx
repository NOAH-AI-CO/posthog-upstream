import { LemonButton, LemonCard, LemonTable } from '@posthog/lemon-ui'

import { TZLabel } from 'lib/components/TZLabel'
import { urls } from 'scenes/urls'

import type { BeOneCopy } from '~/beone/copy'
import { ActivityTab } from '~/types'

import type { BeOneFeedRow } from '../beOneUsageQueries'

export function BeOneLiveFeed({
    feed,
    copy,
    loading,
    onClose,
}: {
    feed: BeOneFeedRow[]
    copy: BeOneCopy
    loading?: boolean
    onClose?: () => void
}): JSX.Element {
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-live-feed">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold m-0">{copy.home.feedTitle}</h2>
                <div className="flex items-center gap-1">
                    <LemonButton size="small" type="secondary" to={urls.activity(ActivityTab.ExploreEvents)}>
                        {copy.home.feedViewAll}
                    </LemonButton>
                    {onClose ? (
                        <LemonButton size="xsmall" type="tertiary" onClick={onClose}>
                            {copy.home.closeWidget}
                        </LemonButton>
                    ) : null}
                </div>
            </div>
            <LemonTable
                dataSource={feed}
                loading={loading}
                rowKey={(row) => `${row.timestamp}-${row.distinctId}-${row.event}`}
                size="small"
                embedded
                columns={[
                    {
                        title: copy.home.feedTime,
                        width: 120,
                        render: (_, row) => <TZLabel time={row.timestamp} />,
                    },
                    { title: copy.home.feedEvent, dataIndex: 'event' },
                    { title: copy.home.feedModule, dataIndex: 'moduleLabel' },
                    {
                        title: copy.home.feedUser,
                        dataIndex: 'distinctId',
                        render: (_, row) => <span className="font-mono text-xs truncate">{row.distinctId}</span>,
                    },
                ]}
            />
        </LemonCard>
    )
}
