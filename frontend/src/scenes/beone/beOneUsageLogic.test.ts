import { expectLogic } from 'kea-test-utils'

import api from 'lib/api'

import { initKeaTests } from '~/test/init'

import { beOneUsageLogic } from './beOneUsageLogic'
import { DEFAULT_BEONE_FILTERS, DEFAULT_HIDDEN_WIDGETS } from './beOneUsageQueries'

describe('beOneUsageLogic', () => {
    beforeEach(() => {
        jest.spyOn(api, 'get').mockResolvedValue({ tabs: [], homepage: null })
        jest.spyOn(api, 'update').mockResolvedValue({ tabs: [], homepage: { beone: {} } })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    it('keeps previous values without re-showing skeletons when a poll fails', async () => {
        const querySpy = jest.spyOn(api, 'queryHogQL').mockResolvedValue({ results: [[1, 2, 3, 4]] } as any)
        initKeaTests()
        const logic = beOneUsageLogic()

        await expectLogic(logic, () => logic.mount()).toFinishAllListeners()
        await expectLogic(logic).toMatchValues({
            kpis: { todayActive: 1, periodActive: 2, todayEvents: 3, periodEvents: 4 },
            kpisLoaded: true,
            kpisInitialLoading: false,
        })

        querySpy.mockRejectedValue(new Error('clickhouse down'))
        await expectLogic(logic, () => logic.actions.reloadOverview())
            .toMatchValues({ kpisLoading: true, kpisInitialLoading: false })
            .toDispatchActions(['loadKpisSuccess'])
            .toNotHaveDispatchedActions(['loadKpisFailure'])
            .toMatchValues({ kpis: { todayActive: 1, periodActive: 2, todayEvents: 3, periodEvents: 4 } })

        logic.unmount()
    })

    it('applies session drilldown into queryFilters and clears on refresh path via clearDrilldown', async () => {
        jest.spyOn(api, 'queryHogQL').mockResolvedValue({ results: [] } as any)
        initKeaTests()
        const logic = beOneUsageLogic()
        await expectLogic(logic, () => logic.mount()).toFinishAllListeners()

        await expectLogic(logic, () => {
            logic.actions.setDrilldown({ dimension: 'province', value: '110000', label: '北京' })
        }).toFinishAllListeners()

        expect(logic.values.drilldown).toEqual({ dimension: 'province', value: '110000', label: '北京' })
        expect(logic.values.queryFilters.province).toBe('110000')
        expect(logic.values.filters.province).toBe('')

        await expectLogic(logic, () => logic.actions.clearDrilldown()).toFinishAllListeners()
        expect(logic.values.drilldown).toBeNull()
        expect(logic.values.queryFilters.province).toBe('')

        logic.unmount()
    })

    it('hides duration by default and persists filters/widgets/locale via home settings', async () => {
        jest.spyOn(api, 'queryHogQL').mockResolvedValue({ results: [] } as any)
        const updateSpy = jest.spyOn(api, 'update').mockResolvedValue({ homepage: {} } as any)
        initKeaTests()
        const logic = beOneUsageLogic()
        await expectLogic(logic, () => logic.mount()).toFinishAllListeners()

        expect(logic.values.hiddenWidgets).toEqual(DEFAULT_HIDDEN_WIDGETS)
        expect(logic.values.filters.dateFrom).toBe(DEFAULT_BEONE_FILTERS.dateFrom)

        logic.actions.setLocale('en')
        logic.actions.hideWidget('hourly')
        logic.actions.setFilters({ ...DEFAULT_BEONE_FILTERS, userType: 'customer' })
        await expectLogic(logic, () => logic.actions.saveDefault()).toFinishAllListeners()

        expect(updateSpy).toHaveBeenCalled()
        const body = updateSpy.mock.calls[0]?.[1] as { homepage: { beone: Record<string, unknown> } }
        expect(body.homepage.beone).toMatchObject({
            locale: 'en',
            filters: expect.objectContaining({ userType: 'customer' }),
            hiddenWidgets: expect.arrayContaining(['duration', 'hourly']),
        })

        logic.unmount()
    })
})
