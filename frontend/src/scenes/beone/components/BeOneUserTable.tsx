import { LemonButton, LemonCard, LemonTable } from '@posthog/lemon-ui'

import type { BeOneCopy } from '~/beone/copy'

import type { BeOneUserRow } from '../beOneUsageQueries'

export function BeOneUserTable({
    users,
    copy,
    loading,
    onClose,
}: {
    users: BeOneUserRow[]
    copy: BeOneCopy
    loading?: boolean
    onClose?: () => void
}): JSX.Element {
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-user-table">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold m-0">{copy.home.userTableTitle}</h2>
                {onClose ? (
                    <LemonButton size="xsmall" type="tertiary" onClick={onClose}>
                        {copy.home.closeWidget}
                    </LemonButton>
                ) : null}
            </div>
            <LemonTable
                dataSource={users}
                loading={loading}
                rowKey="distinctId"
                size="small"
                embedded
                columns={[
                    {
                        title: copy.home.userTableUser,
                        dataIndex: 'distinctId',
                        render: (_, row) => <span className="font-mono text-xs">{row.distinctId}</span>,
                    },
                    {
                        title: copy.home.userTableEvents,
                        dataIndex: 'events',
                        align: 'right',
                        render: (_, row) => row.events.toLocaleString(),
                    },
                    {
                        title: copy.home.userTableModules,
                        dataIndex: 'modules',
                        align: 'right',
                    },
                    {
                        title: copy.home.userTableLastSeen,
                        dataIndex: 'lastSeen',
                        render: (_, row) => {
                            const d = Date.parse(row.lastSeen)
                            return Number.isFinite(d) ? new Date(d).toLocaleString() : row.lastSeen
                        },
                    },
                ]}
            />
        </LemonCard>
    )
}
