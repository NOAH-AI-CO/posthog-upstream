import { beoneCopyEn } from './copy.en'
import { beoneCopyZh } from './copy.zh'

export type BeOneLocale = 'zh' | 'en'
export type BeOneCopy = typeof beoneCopyZh

export function getBeOneCopy(locale: BeOneLocale = 'zh'): BeOneCopy {
    return locale === 'en' ? beoneCopyEn : beoneCopyZh
}

export { beoneCopyZh, beoneCopyEn }
