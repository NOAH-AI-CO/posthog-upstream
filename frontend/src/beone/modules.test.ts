import { labelForModule } from './modules'

describe('labelForModule', () => {
    it('maps known BeOne modules to Chinese', () => {
        expect(labelForModule('thesis')).toBe('论文')
        expect(labelForModule('conference')).toBe('会议')
        expect(labelForModule('reader')).toBe('阅读器')
        expect(labelForModule('home')).toBe('首页')
    })

    it('returns unknown keys as-is', () => {
        expect(labelForModule('custom_mod')).toBe('custom_mod')
        expect(labelForModule(null)).toBe('未知模块')
        expect(labelForModule(undefined)).toBe('未知模块')
    })
})
