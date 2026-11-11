import { actions, kea, listeners, path, reducers, selectors } from 'kea'

import { getBeOneCopy, type BeOneCopy, type BeOneLocale } from './copy'

const STORAGE_KEY = 'beone-locale'

function readStoredLocale(): BeOneLocale {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'zh'
    } catch {
        return 'zh'
    }
}

function writeStoredLocale(locale: BeOneLocale): void {
    try {
        localStorage.setItem(STORAGE_KEY, locale)
    } catch {
        // ignore quota / private mode
    }
}

export const beOneLocaleLogic = kea([
    path(['beone', 'beOneLocaleLogic']),
    actions({
        setLocale: (locale: BeOneLocale) => ({ locale }),
    }),
    reducers({
        locale: [
            readStoredLocale() as BeOneLocale,
            {
                setLocale: (_: BeOneLocale, { locale }: { locale: BeOneLocale }) => locale,
            },
        ],
    }),
    selectors({
        copy: [(s): [BeOneLocale] => [s.locale], (locale: BeOneLocale): BeOneCopy => getBeOneCopy(locale)],
    }),
    listeners({
        setLocale: ({ locale }: { locale: BeOneLocale }) => {
            writeStoredLocale(locale)
        },
    }),
])
