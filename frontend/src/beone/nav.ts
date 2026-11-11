import { urls } from 'scenes/urls'

import { ActivityTab } from '~/types'

import { getBeOneCopy, type BeOneLocale } from './copy'

export type BeOneNavId = 'home' | 'activity' | 'insights' | 'settings'

export type BeOnePrimaryNavItem = {
    id: BeOneNavId
    label: string
    path: () => string
}

export function getBeOnePrimaryNav(locale: BeOneLocale = 'zh'): ReadonlyArray<BeOnePrimaryNavItem> {
    const { nav } = getBeOneCopy(locale)
    return [
        { id: 'home', label: nav.home, path: () => urls.projectRoot() },
        { id: 'activity', label: nav.activity, path: () => urls.activity(ActivityTab.ExploreEvents) },
        { id: 'insights', label: nav.insights, path: () => urls.insights() },
        { id: 'settings', label: nav.settings, path: () => urls.settings('project') },
    ]
}

/** @deprecated prefer getBeOnePrimaryNav(locale) — kept for callers that only need zh defaults */
export const BEONE_PRIMARY_NAV = getBeOnePrimaryNav('zh')
