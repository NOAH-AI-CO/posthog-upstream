import { BEONE_PRIMARY_NAV } from './nav'

describe('BEONE_PRIMARY_NAV', () => {
    it('has primary entries in order including settings', () => {
        expect(BEONE_PRIMARY_NAV.map((i) => i.id)).toEqual(['home', 'activity', 'insights', 'settings'])
        expect(BEONE_PRIMARY_NAV.map((i) => i.label)).toEqual(['用量总览', '实时动态', '分析洞察', '设置'])
    })
})
