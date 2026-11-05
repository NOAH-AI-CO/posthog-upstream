import { urls } from 'scenes/urls'

import { ActivityTab } from '~/types'

import { beoneCopyZh } from './copy.zh'

export type BeOneNavId = 'home' | 'activity' | 'insights' | 'settings'

export const BEONE_PRIMARY_NAV: ReadonlyArray<{
    id: BeOneNavId
    label: string
    path: () => string
}> = [
    { id: 'home', label: beoneCopyZh.nav.home, path: () => urls.projectRoot() },
    { id: 'activity', label: beoneCopyZh.nav.activity, path: () => urls.activity(ActivityTab.ExploreEvents) },
    { id: 'insights', label: beoneCopyZh.nav.insights, path: () => urls.insights() },
    { id: 'settings', label: beoneCopyZh.nav.settings, path: () => urls.settings('project') },
]
