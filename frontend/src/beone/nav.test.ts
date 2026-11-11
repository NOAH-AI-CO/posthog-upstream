import { getBeOnePrimaryNav } from './nav'

describe('getBeOnePrimaryNav', () => {
    it('has primary entries in order including settings', () => {
        expect(getBeOnePrimaryNav('zh').map((i) => i.id)).toEqual(['home', 'activity', 'insights', 'settings'])
        expect(getBeOnePrimaryNav('zh').map((i) => i.label)).toEqual(['用量总览', '实时动态', '分析洞察', '设置'])
    })

    it('switches labels for English locale', () => {
        expect(getBeOnePrimaryNav('en').map((i) => i.label)).toEqual([
            'Usage overview',
            'Live activity',
            'Insights',
            'Settings',
        ])
    })
})
