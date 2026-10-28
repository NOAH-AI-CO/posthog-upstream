import { LemonButton, LemonCard, LemonInput, LemonSelect } from '@posthog/lemon-ui'

import { beoneCopy } from '~/beone/copy.zh'
import { moduleFilterOptions } from '~/beone/modules'

import type { BeOneUsageFilters } from '../beOneUsageQueries'

const ALL = { value: '', label: beoneCopy.home.filterAll }

export function BeOneUsageFilters({
    draft,
    onChange,
    onApply,
    onReset,
}: {
    draft: BeOneUsageFilters
    onChange: (partial: Partial<BeOneUsageFilters>) => void
    onApply: () => void
    onReset: () => void
}): JSX.Element {
    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-usage-filters">
            <h2 className="text-base font-semibold mb-3">{beoneCopy.home.filterTitle}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                <label className="flex flex-col gap-1 text-xs text-secondary">
                    {beoneCopy.home.filterRange}
                    <LemonSelect
                        value={draft.range}
                        onChange={(range) => range && onChange({ range })}
                        options={[
                            { value: '24h', label: beoneCopy.home.trend24h },
                            { value: '7d', label: beoneCopy.home.trend7d },
                            { value: '30d', label: beoneCopy.home.trend30d },
                        ]}
                        fullWidth
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary">
                    {beoneCopy.home.filterModule}
                    <LemonSelect
                        value={draft.module}
                        onChange={(module) => onChange({ module: module ?? '' })}
                        options={[ALL, ...moduleFilterOptions()]}
                        fullWidth
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary">
                    {beoneCopy.home.filterDistinctId}
                    <LemonInput
                        value={draft.distinctId}
                        onChange={(distinctId) => onChange({ distinctId })}
                        placeholder="beone:…"
                        allowClear
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary">
                    {beoneCopy.home.filterUserType}
                    <LemonSelect
                        value={draft.userType}
                        onChange={(userType) => onChange({ userType: userType ?? '' })}
                        options={[
                            ALL,
                            { value: 'customer', label: 'customer' },
                            { value: 'employee', label: 'employee' },
                            { value: 'unknown', label: 'unknown' },
                        ]}
                        fullWidth
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary">
                    {beoneCopy.home.filterAccountKind}
                    <LemonSelect
                        value={draft.accountKind}
                        onChange={(accountKind) => onChange({ accountKind: accountKind ?? '' })}
                        options={[
                            ALL,
                            { value: 'individual', label: 'individual' },
                            { value: 'shared', label: 'shared' },
                            { value: 'test', label: 'test' },
                            { value: 'service', label: 'service' },
                            { value: 'unknown', label: 'unknown' },
                        ]}
                        fullWidth
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary">
                    {beoneCopy.home.filterEnterpriseId}
                    <LemonInput
                        value={draft.enterpriseId}
                        onChange={(enterpriseId) => onChange({ enterpriseId })}
                        allowClear
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary">
                    {beoneCopy.home.filterBusinessGroupId}
                    <LemonInput
                        value={draft.businessGroupId}
                        onChange={(businessGroupId) => onChange({ businessGroupId })}
                        allowClear
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary">
                    {beoneCopy.home.filterAccessRole}
                    <LemonSelect
                        value={draft.accessRole}
                        onChange={(accessRole) => onChange({ accessRole: accessRole ?? '' })}
                        options={[
                            ALL,
                            { value: 'platform_admin', label: 'platform_admin' },
                            { value: 'company_admin', label: 'company_admin' },
                            { value: 'group_admin', label: 'group_admin' },
                            { value: 'member', label: 'member' },
                            { value: 'unassigned', label: 'unassigned' },
                        ]}
                        fullWidth
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary">
                    {beoneCopy.home.filterProfileComplete}
                    <LemonSelect
                        value={draft.profileComplete}
                        onChange={(profileComplete) =>
                            onChange({
                                profileComplete: (profileComplete ?? '') as BeOneUsageFilters['profileComplete'],
                            })
                        }
                        options={[
                            ALL,
                            { value: 'true', label: beoneCopy.home.profileCompleteYes },
                            { value: 'false', label: beoneCopy.home.profileCompleteNo },
                        ]}
                        fullWidth
                    />
                </label>
            </div>
            <div className="flex gap-2 mt-3">
                <LemonButton type="primary" onClick={onApply}>
                    {beoneCopy.home.filterApply}
                </LemonButton>
                <LemonButton type="secondary" onClick={onReset}>
                    {beoneCopy.home.filterReset}
                </LemonButton>
            </div>
        </LemonCard>
    )
}
