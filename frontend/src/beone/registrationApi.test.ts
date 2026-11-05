import {
    OTHER_HOSPITAL_VALUE,
    cityOptionsFromRegions,
    hospitalSelectOptions,
    optionsOfKind,
    provinceOptionsFromRegions,
} from './registrationApi'

describe('registrationApi helpers', () => {
    const regions = [
        {
            value: '33',
            label: '浙江省',
            children: [
                { value: '3301', label: '杭州市' },
                { value: '3302', label: '宁波市' },
            ],
        },
        { value: '11', label: '北京市', children: [{ value: '1101', label: '北京市' }] },
    ]

    const options = [
        { kind: 'hospital_level', code: 'level_3_a', label: '三级甲等', parent_code: '' },
        { kind: 'teaching_title', code: 'professor', label: '教授', parent_code: '' },
        { kind: 'clinical_title', code: 'chief', label: '主任医师', parent_code: '' },
        { kind: 'city', code: '3301', label: '杭州市', parent_code: '33' },
    ]

    it('maps regions to province options', () => {
        expect(provinceOptionsFromRegions(regions)).toEqual([
            { value: '33', label: '浙江省' },
            { value: '11', label: '北京市' },
        ])
    })

    it('maps city children for the selected province only', () => {
        expect(cityOptionsFromRegions(regions, '')).toEqual([])
        expect(cityOptionsFromRegions(regions, '33')).toEqual([
            { value: '3301', label: '杭州市' },
            { value: '3302', label: '宁波市' },
        ])
    })

    it('filters dictionary options by kind', () => {
        expect(optionsOfKind(options, 'hospital_level')).toEqual([{ value: 'level_3_a', label: '三级甲等' }])
        expect(optionsOfKind(options, 'teaching_title')).toEqual([{ value: 'professor', label: '教授' }])
    })

    it('builds hospital typeahead options and keeps other', () => {
        expect(
            hospitalSelectOptions(
                {
                    count: 1,
                    can_enter_other: true,
                    results: [
                        {
                            code: 'c45181f23abda62e4213',
                            name: '浙江大学医学院附属邵逸夫医院',
                            province: '33',
                            city: '3301',
                        },
                    ],
                },
                '其他／手动填写'
            )
        ).toEqual([
            { value: '浙江大学医学院附属邵逸夫医院', label: '浙江大学医学院附属邵逸夫医院' },
            { value: OTHER_HOSPITAL_VALUE, label: '其他／手动填写' },
        ])
    })
})
