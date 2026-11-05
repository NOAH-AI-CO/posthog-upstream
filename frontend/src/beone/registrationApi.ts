import api from 'lib/api'

export type BeOneRegistrationOption = {
    kind: string
    code: string
    label: string
    parent_code: string
}

export type BeOneRegionCity = { value: string; label: string }
export type BeOneRegionProvince = {
    value: string
    label: string
    children: BeOneRegionCity[]
}

export type BeOneRegistrationOptionsResponse = {
    approval_required: boolean
    options: BeOneRegistrationOption[]
    regions: BeOneRegionProvince[]
    hospitals?: { count: number; source?: string; notice?: string }
}

export type BeOneHospitalSuggestion = {
    code: string
    name: string
    province: string
    city: string
}

export type BeOneHospitalsResponse = {
    count: number
    results: BeOneHospitalSuggestion[]
    can_enter_other: boolean
}

export type BeOneSelectOption = { value: string; label: string }

const OTHER_HOSPITAL_VALUE = 'other'

export function optionsOfKind(options: BeOneRegistrationOption[], kind: string): BeOneSelectOption[] {
    return options.filter((o) => o.kind === kind && o.code).map((o) => ({ value: o.code, label: o.label || o.code }))
}

export function provinceOptionsFromRegions(regions: BeOneRegionProvince[]): BeOneSelectOption[] {
    return regions.map((r) => ({ value: r.value, label: r.label || r.value }))
}

export function cityOptionsFromRegions(regions: BeOneRegionProvince[], province: string): BeOneSelectOption[] {
    if (!province) {
        return []
    }
    const match = regions.find((r) => r.value === province)
    return (match?.children ?? []).map((c) => ({ value: c.value, label: c.label || c.value }))
}

export async function fetchRegistrationOptions(lang: string = 'zh'): Promise<BeOneRegistrationOptionsResponse> {
    return await api.get(`api/beone/registration/options/?lang=${encodeURIComponent(lang)}`)
}

export async function fetchHospitalSuggestions(params: {
    q?: string
    province?: string
    city?: string
    lang?: string
}): Promise<BeOneHospitalsResponse> {
    const search = new URLSearchParams()
    if (params.q) {
        search.set('q', params.q)
    }
    if (params.province) {
        search.set('province', params.province)
    }
    if (params.city) {
        search.set('city', params.city)
    }
    search.set('lang', params.lang ?? 'zh')
    return await api.get(`api/beone/registration/hospitals/?${search.toString()}`)
}

export function hospitalSelectOptions(
    response: BeOneHospitalsResponse | null,
    otherLabel: string
): BeOneSelectOption[] {
    const results = (response?.results ?? []).map((h) => ({ value: h.name, label: h.name }))
    if (response?.can_enter_other !== false) {
        results.push({ value: OTHER_HOSPITAL_VALUE, label: otherLabel })
    }
    return results
}

export { OTHER_HOSPITAL_VALUE }
