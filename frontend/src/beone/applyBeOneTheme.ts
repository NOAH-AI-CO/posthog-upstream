import './theme.css'

let applied = false

export function applyBeOneTheme(): void {
    if (typeof document === 'undefined') {
        return
    }
    document.documentElement.classList.add('beone')
    applied = true
}

export function isBeOneThemeApplied(): boolean {
    if (applied) {
        return true
    }
    if (typeof document === 'undefined') {
        return false
    }
    return document.documentElement.classList.contains('beone')
}
