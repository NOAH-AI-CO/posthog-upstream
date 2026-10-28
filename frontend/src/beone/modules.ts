const MODULE_LABELS: Record<string, string> = {
    home: '首页',
    thesis: '论文',
    conference: '会议',
    reader: '阅读器',
    medical_qa: '医学问答',
    medical_qa_v2: '医学问答',
    academic_workshop: '学术写作',
    drawing: '绘图',
    protocol_summary: '方案摘要',
    document_translation: '文档翻译',
    nsfc_writing: '基金写作',
    iit_review: 'IIT 评审',
    clinical_trials: '临床试验',
    academic_achievements: '学术成果',
    mdt: 'MDT',
    analytics: '分析',
    settings: '设置',
    authentication: '登录',
    knowledge_base: '知识库',
    tools: '工具',
    literature_search: '文献检索',
    shared_view: '分享页',
    document_preview: '文档预览',
    workflow: '工作流',
    other: '其他',
}

export function labelForModule(module: string | null | undefined): string {
    if (module == null || module === '') {
        return '未知模块'
    }
    return MODULE_LABELS[module] ?? module
}

export function moduleFilterOptions(): { value: string; label: string }[] {
    return Object.entries(MODULE_LABELS).map(([value, label]) => ({ value, label }))
}
