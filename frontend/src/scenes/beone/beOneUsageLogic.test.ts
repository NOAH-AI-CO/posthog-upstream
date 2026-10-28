import { expectLogic } from 'kea-test-utils'

import api from 'lib/api'

import { initKeaTests } from '~/test/init'

import { beOneUsageLogic } from './beOneUsageLogic'

describe('beOneUsageLogic', () => {
    it('keeps previous values without re-showing skeletons when a poll fails', async () => {
        const querySpy = jest.spyOn(api, 'queryHogQL').mockResolvedValue({ results: [[1, 2, 3, 4]] } as any)
        initKeaTests()
        const logic = beOneUsageLogic()

        await expectLogic(logic, () => logic.mount())
            .toMatchValues({ kpisInitialLoading: true })
            .toFinishAllListeners()
        await expectLogic(logic).toMatchValues({
            kpis: { todayActive: 1, periodActive: 2, todayEvents: 3, periodEvents: 4 },
            kpisLoaded: true,
        })

        querySpy.mockRejectedValue(new Error('clickhouse down'))
        await expectLogic(logic, () => logic.actions.reloadOverview())
            .toMatchValues({ kpisLoading: true, kpisInitialLoading: false })
            .toDispatchActions(['loadKpisSuccess'])
            .toNotHaveDispatchedActions(['loadKpisFailure'])
            .toMatchValues({ kpis: { todayActive: 1, periodActive: 2, todayEvents: 3, periodEvents: 4 } })

        logic.unmount()
    })
})
