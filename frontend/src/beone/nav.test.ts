import { BEONE_PRIMARY_NAV } from './nav'

describe('BEONE_PRIMARY_NAV', () => {
    it('has exactly three primary entries in order', () => {
        expect(BEONE_PRIMARY_NAV.map((i) => i.id)).toEqual(['home', 'activity', 'insights'])
        expect(BEONE_PRIMARY_NAV.map((i) => i.label)).toEqual(['用量总览', '实时动态', '分析洞察'])
    })
})
