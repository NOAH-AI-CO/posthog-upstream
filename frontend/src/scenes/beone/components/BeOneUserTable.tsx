import { LemonCard, LemonTable } from '@posthog/lemon-ui'

import { beoneCopy } from '~/beone/copy.zh'

import type { BeOneUserRow } from '../beOneUsageQueries'

export function BeOneUserTable({ users, loading }: { users: BeOneUserRow[]; loading?: boolean }): JSX.Element {
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-user-table">
            <h2 className="text-base font-semibold mb-2">{beoneCopy.home.userTableTitle}</h2>
            <LemonTable
                dataSource={users}
                loading={loading}
                rowKey="distinctId"
                size="small"
                embedded
                columns={[
                    {
                        title: beoneCopy.home.userTableUser,
                        dataIndex: 'distinctId',
                        render: (_, row) => <span className="font-mono text-xs">{row.distinctId}</span>,
                    },
                    {
                        title: beoneCopy.home.userTableEvents,
                        dataIndex: 'events',
                        align: 'right',
                        render: (_, row) => row.events.toLocaleString(),
                    },
                    {
                        title: beoneCopy.home.userTableModules,
                        dataIndex: 'modules',
                        align: 'right',
                    },
                    {
                        title: beoneCopy.home.userTableLastSeen,
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
