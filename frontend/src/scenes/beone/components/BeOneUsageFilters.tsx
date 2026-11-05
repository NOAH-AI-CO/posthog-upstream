import { LemonButton, LemonCard, LemonInputSelect, LemonSelect } from '@posthog/lemon-ui'

import { DateFilter } from 'lib/components/DateFilter/DateFilter'

import type { BeOneCopy } from '~/beone/copy'
import { moduleFilterOptions } from '~/beone/modules'
import { OTHER_HOSPITAL_VALUE, type BeOneSelectOption } from '~/beone/registrationApi'
import { DateMappingOption } from '~/types'

import type { BeOneUsageFilters } from '../beOneUsageQueries'

export function BeOneUsageFilters({
    draft,
    copy,
    onChange,
    onApply,
    onReset,
    onSaveDefault,
    saving,
    provinceOptions,
    cityOptions,
    hospitalLevelOptions,
    titleOptions,
    hospitalOptions,
    hospitalSearchLoading,
    onHospitalSearch,
}: {
    draft: BeOneUsageFilters
    copy: BeOneCopy
    onChange: (partial: Partial<BeOneUsageFilters>) => void
    onApply: () => void
    onReset: () => void
    onSaveDefault: () => void
    saving?: boolean
    provinceOptions: BeOneSelectOption[]
    cityOptions: BeOneSelectOption[]
    hospitalLevelOptions: BeOneSelectOption[]
    titleOptions: BeOneSelectOption[]
    hospitalOptions: BeOneSelectOption[]
    hospitalSearchLoading?: boolean
    onHospitalSearch: (query: string) => void
}): JSX.Element {
    const ALL = { value: '', label: copy.home.filterAll }
    const dateOptions: DateMappingOption[] = [
        { key: copy.home.dateLastWeek, values: ['-7d'], defaultInterval: 'day' },
        { key: copy.home.dateLastMonth, values: ['-30d'], defaultInterval: 'day' },
        { key: copy.home.dateLast3Months, values: ['-90d'], defaultInterval: 'day' },
        { key: copy.home.dateLastHalfYear, values: ['-180d'], defaultInterval: 'month' },
    ]

    const hospitalValue = draft.hospitalName && draft.hospitalName !== OTHER_HOSPITAL_VALUE ? [draft.hospitalName] : []

    return (
        <LemonCard hoverEffect={false} className="p-4" data-attr="beone-usage-filters">
            <h2 className="text-base font-semibold mb-3">{copy.home.filterTitle}</h2>
            <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-40">
                    {copy.home.filterRange}
                    <DateFilter
                        dateFrom={draft.dateFrom}
                        dateTo={draft.dateTo}
                        onChange={(dateFrom, dateTo) =>
                            onChange({ dateFrom: dateFrom ?? '-90d', dateTo: dateTo ?? null })
                        }
                        dateOptions={dateOptions}
                        size="small"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-36">
                    {copy.home.filterModule}
                    <LemonSelect
                        value={draft.module}
                        onChange={(module) => onChange({ module: module ?? '' })}
                        options={[ALL, ...moduleFilterOptions()]}
                        size="small"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-32">
                    {copy.home.filterUserType}
                    <LemonSelect
                        value={draft.userType}
                        onChange={(userType) => onChange({ userType: userType ?? '' })}
                        options={[
                            ALL,
                            { value: 'customer', label: 'customer' },
                            { value: 'employee', label: 'employee' },
                            { value: 'unknown', label: 'unknown' },
                        ]}
                        size="small"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-32">
                    {copy.home.filterAccountKind}
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
                        size="small"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-32">
                    {copy.home.filterProvince}
                    <LemonSelect
                        value={draft.province}
                        onChange={(province) => onChange({ province: province ?? '', city: '', hospitalName: '' })}
                        options={[ALL, ...provinceOptions]}
                        size="small"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-32">
                    {copy.home.filterCity}
                    <LemonSelect
                        value={draft.city}
                        onChange={(city) => onChange({ city: city ?? '', hospitalName: '' })}
                        options={[ALL, ...cityOptions]}
                        size="small"
                        disabledReason={!draft.province ? copy.home.filterProvince : undefined}
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-32">
                    {copy.home.filterHospitalLevel}
                    <LemonSelect
                        value={draft.hospitalLevel}
                        onChange={(hospitalLevel) => onChange({ hospitalLevel: hospitalLevel ?? '' })}
                        options={[ALL, ...hospitalLevelOptions]}
                        size="small"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-32">
                    {copy.home.filterTitleKind}
                    <LemonSelect
                        value={draft.titleKind}
                        onChange={(titleKind) =>
                            onChange({
                                titleKind: (titleKind ?? '') as BeOneUsageFilters['titleKind'],
                                titleValue: '',
                            })
                        }
                        options={[
                            ALL,
                            { value: 'teaching_title', label: copy.home.filterTitleTeaching },
                            { value: 'clinical_title', label: copy.home.filterTitleClinical },
                        ]}
                        size="small"
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-32">
                    {copy.home.filterTitleValue}
                    <LemonSelect
                        value={draft.titleValue}
                        onChange={(titleValue) => onChange({ titleValue: titleValue ?? '' })}
                        options={[ALL, ...titleOptions]}
                        size="small"
                        disabledReason={!draft.titleKind ? copy.home.filterTitleKind : undefined}
                    />
                </label>
                <label className="flex flex-col gap-1 text-xs text-secondary min-w-56">
                    {copy.home.filterHospitalName}
                    <LemonInputSelect
                        mode="single"
                        size="small"
                        value={hospitalValue}
                        options={hospitalOptions.map((o) => ({ key: o.value, label: o.label }))}
                        placeholder={copy.home.hospitalNamePlaceholder}
                        loading={hospitalSearchLoading}
                        disableFiltering
                        allowCustomValues
                        formatCreateLabel={(input) => `${copy.home.hospitalOther}: ${input}`}
                        onInputChange={(query) => onHospitalSearch(query)}
                        onChange={(values) => {
                            const next = values[0] ?? ''
                            if (next === OTHER_HOSPITAL_VALUE) {
                                onChange({ hospitalName: '' })
                                return
                            }
                            onChange({ hospitalName: next })
                        }}
                        data-attr="beone-hospital-typeahead"
                    />
                </label>
            </div>
            <div className="flex gap-2 mt-3">
                <LemonButton type="primary" size="small" onClick={onApply}>
                    {copy.home.filterApply}
                </LemonButton>
                <LemonButton type="secondary" size="small" onClick={onReset}>
                    {copy.home.filterReset}
                </LemonButton>
                <LemonButton type="secondary" size="small" onClick={onSaveDefault} loading={saving}>
                    {copy.home.filterSaveDefault}
                </LemonButton>
            </div>
        </LemonCard>
    )
}
