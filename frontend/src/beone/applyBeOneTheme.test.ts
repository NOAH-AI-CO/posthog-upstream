import { applyBeOneTheme, isBeOneThemeApplied } from './applyBeOneTheme'

describe('applyBeOneTheme', () => {
    it('adds beone class on documentElement', () => {
        document.documentElement.classList.remove('beone')
        expect(isBeOneThemeApplied()).toBe(false)
        applyBeOneTheme()
        expect(document.documentElement.classList.contains('beone')).toBe(true)
        expect(isBeOneThemeApplied()).toBe(true)
        applyBeOneTheme()
        expect(document.documentElement.classList.contains('beone')).toBe(true)
    })
})
