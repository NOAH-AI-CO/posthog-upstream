import { urls } from 'scenes/urls'

import { ActivityTab } from '~/types'

import { beoneCopy } from './copy.zh'

export type BeOneNavId = 'home' | 'activity' | 'insights' | 'settings'

export const BEONE_PRIMARY_NAV: ReadonlyArray<{
    id: BeOneNavId
    label: string
    path: () => string
}> = [
    { id: 'home', label: beoneCopy.nav.home, path: () => urls.projectRoot() },
    { id: 'activity', label: beoneCopy.nav.activity, path: () => urls.activity(ActivityTab.ExploreEvents) },
    { id: 'insights', label: beoneCopy.nav.insights, path: () => urls.insights() },
    { id: 'settings', label: beoneCopy.nav.settings, path: () => urls.settings('project') },
]
