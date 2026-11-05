# BeOne 注册与输入联想接口文档

文档版本：1.0  
核对日期：2026-11-03（北京时间）  
适用环境：BeOne 国内线上环境，管理员审核注册流程  
接口实现版本：Backend `9cc14393`，Frontend `5bb99ab1`，Platform `c57913e`

## 1. 环境与约定

- Base URL：`https://beonemed.ruosheng.bio`
- 请求及响应：JSON，UTF-8。
- POST 请求头：`Content-Type: application/json`。
- URL 末尾保留 `/`，尤其是 POST；不要依赖重定向转发请求体。
- 中文错误信息可通过查询参数 `lang=zh` 请求；错误文案可能因语言配置变化，客户端应按状态码和字段名处理。
- 可加 `format=json`，不是必需参数。
- 所有枚举、省市、医院与模块编码均使用字符串。展示用 `label`/`name`，提交用 `code`/`value`，不要自行推导编码。
- `user_type` 固定为 `customer`（客户）或 `employee`（员工），这是业务资料类别，不是权限角色。

线上页面：

- 注册：<https://beonemed.ruosheng.bio/signup>
- 管理员审核：<https://beonemed.ruosheng.bio/admin/accounts?tab=registrations>

## 2. 接口总览

| 编号 | 方法 | 路径                                                    | 用途                               | 鉴权                     | 成功状态 |
| ---- | ---- | ------------------------------------------------------- | ---------------------------------- | ------------------------ | -------- |
| R01  | GET  | `/api/registration/options/`                            | 公开字典、省市二级树、医院数据说明 | 无需登录                 | 200      |
| R02  | GET  | `/api/registration/hospitals/`                          | 医院输入联想                       | 无需登录                 | 200      |
| R03  | POST | `/api/registration/`                                    | 提交注册申请                       | 无需登录                 | 202      |
| R04  | GET  | `/api/directory/registrations/`                         | 管理员查看申请及可授权模块         | 本企业管理员或平台管理员 | 200      |
| R05  | POST | `/api/directory/registrations/{application_id}/review/` | 管理员通过或拒绝申请               | 本企业管理员或平台管理员 | 200      |

公开注册页面只使用 R01、R02、R03，不需要管理员 Token。

管理员接口使用已有登录 Token，注意前缀是 `Token`，不是 `Bearer`：

```http
Authorization: Token <ADMIN_TOKEN>
```

不要在前端源码、公开注册页面、示例文件或埋点中写死真实 Token、密码或用户身份资料。

## 3. R01：获取字典和省市二级树

```http
GET /api/registration/options/
```

### cURL

```bash
curl -sS 'https://beonemed.ruosheng.bio/api/registration/options/?lang=zh' \
  -H 'Accept: application/json'
```

### 响应结构

```json
{
  "approval_required": true,
  "options": [
    {
      "kind": "department",
      "code": "sales",
      "label": "销售",
      "parent_code": ""
    },
    {
      "kind": "sales_region",
      "code": "east",
      "label": "华东大区",
      "parent_code": ""
    }
  ],
  "regions": [
    {
      "value": "33",
      "label": "浙江省",
      "children": [
        {
          "value": "3301",
          "label": "杭州市"
        }
      ]
    }
  ],
  "hospitals": {
    "count": 23488,
    "source": "https://github.com/YichuanAlex/Public_Hospital_Data_Crawler",
    "notice": "公开历史参考名单，非官方实时名录，也非全国全量；名称与机构状态可能有变化。未收录或名称不符请选其他手动填写。仅采用原始名称及可精确匹配的省市，不采用电话、地址或推测补全数据，不推断医院等级。"
  }
}
```

上例的 `options` 和 `regions` 是节选；实际返回全部已启用字典和省市。

### `options.kind` 对应表

| kind             | 注册字段                                         | 适用类别 |
| ---------------- | ------------------------------------------------ | -------- |
| `customer_usage` | `profile.customer_usage`，使用对象               | 客户     |
| `province`       | `profile.province`，省份                         | 客户     |
| `city`           | `profile.city`，城市，`parent_code` 为所属省编码 | 客户     |
| `hospital_level` | `profile.hospital_level`，医院等级               | 客户     |
| `teaching_title` | `profile.teaching_title`，教学职称               | 客户     |
| `clinical_title` | `profile.clinical_title`，临床职称               | 客户     |
| `department`     | `profile.department`，员工部门                   | 员工     |
| `sales_region`   | `profile.sales_region`，销售大区                 | 员工     |

`user_type` 的两个固定值不在 `options` 中。姓名、邮箱、手机号、医院自由文本、详细部门和备注不是字典选项。

### Type-ahead 接法

1. 页面进入时加载一次 R01。
2. 省市直接使用 `regions` 的 `value/label/children` 渲染二级菜单；输入省或市名称时，在前端过滤路径。
3. 其他字典按 `kind` 分组，转换为 `{ value: code, label }`，在前端输入过滤。
4. R01 不提供 `q` 服务端搜索，也没有独立的 `/provinces/`、`/cities/` 或 `/departments/search/` 接口。
5. 销售大区等由管理员配置，不能在前端写死。只提交接口返回的有效编码。
6. 选择浙江省／杭州市时提交 `province: "33"`、`city: "3301"`；不要自行补成六位编码。

## 4. R02：医院输入联想

```http
GET /api/registration/hospitals/?q=邵逸夫&province=33&city=3301
```

### 查询参数

| 参数       | 类型   | 必填 | 长度上限 | 说明                                                             |
| ---------- | ------ | ---- | -------- | ---------------------------------------------------------------- |
| `q`        | string | 否   | 80       | 医院名称子串搜索，不区分英文大小写；空值返回当前范围内的前 30 条 |
| `province` | string | 否   | 64       | 省编码，精确过滤                                                 |
| `city`     | string | 否   | 64       | 市编码，精确过滤                                                 |

### cURL

```bash
curl -sS --get 'https://beonemed.ruosheng.bio/api/registration/hospitals/' \
  --data-urlencode 'q=邵逸夫' \
  --data-urlencode 'province=33' \
  --data-urlencode 'city=3301' \
  --data-urlencode 'lang=zh' \
  -H 'Accept: application/json'
```

### 响应示例

```json
{
  "count": 2,
  "results": [
    {
      "code": "c45181f23abda62e4213",
      "name": "浙江大学医学院附属邵逸夫医院",
      "province": "33",
      "city": "3301"
    },
    {
      "code": "af978f79ab11411307e6",
      "name": "浙医附属邵逸夫医院",
      "province": "33",
      "city": "3301"
    }
  ],
  "can_enter_other": true
}
```

- `count` 是当前条件的全部匹配记录数；`results` 最多 30 条，无分页参数。
- `code` 是不透明标识，请直接使用返回值，不要根据名称自行生成。
- 同一机构的不同历史名称可能对应多条记录，不能把匹配数量当作独立在营医院数量。
- 无结果时仍返回 `200`、`count: 0`、`results: []`、`can_enter_other: true`。
- “其他／手动填写”是前端额外提供的选项，不在 `results` 中；选择值为字符串 `other`。
- 推荐约 250ms 防抖，并取消或忽略过期请求，避免旧搜索覆盖新结果。
- 变更省／市时清空已选医院与手填医院，要求重新选择，防止地区错配。
- 查询失败时仍保留“其他／手动填写”，不要阻塞整张注册表单。

## 5. R03：提交注册申请

```http
POST /api/registration/
Content-Type: application/json
```

### 顶层字段

| 字段            | 类型   | 必填 | 约束                                                                      |
| --------------- | ------ | ---- | ------------------------------------------------------------------------- |
| `email`         | string | 是   | 有效邮箱，最多 150 字符；服务端去除首尾空白并转小写，作为审核后的登录账号 |
| `password`      | string | 是   | 8～128 字符；不得为常见密码或纯数字；不要 trim 密码                       |
| `profile`       | object | 是   | 见下表                                                                    |
| `hospital_code` | string | 否   | 最多 32 字符；R02 返回的医院 code，或固定值 `other`；只适用于客户         |

### `profile` 字段

除姓名和类别外，其余资料均为选填。可选字符串不填写时建议直接省略；不要传 `null`。

| 字段                | 类型   | 必填 | 长度上限 | 适用类别 | 说明                                                 |
| ------------------- | ------ | ---- | -------- | -------- | ---------------------------------------------------- |
| `full_name`         | string | 是   | 100      | 全部     | 姓名，不能为纯空白                                   |
| `user_type`         | string | 是   | 16       | 全部     | `customer` 或 `employee`                             |
| `phone`             | string | 否   | 40       | 全部     | 手机号；当前流程不做短信验证码验证                   |
| `remark`            | string | 否   | 2000     | 全部     | 备注，不填写患者等敏感信息                           |
| `customer_usage`    | string | 否   | 64       | 客户     | 使用对象，取 R01 code                                |
| `province`          | string | 否   | 64       | 客户     | 省编码                                               |
| `city`              | string | 否   | 64       | 客户     | 城市编码，必须与省匹配                               |
| `hospital`          | string | 否   | 200      | 客户     | 仅“其他”时填写医院名称；目录选择时由服务端取标准名称 |
| `hospital_level`    | string | 否   | 64       | 客户     | 医院等级，取 R01 code，不从历史医院名录自动推断      |
| `teaching_title`    | string | 否   | 64       | 客户     | 教学职称，取 R01 code                                |
| `clinical_title`    | string | 否   | 64       | 客户     | 临床职称，取 R01 code                                |
| `department`        | string | 否   | 64       | 员工     | 员工部门，取 R01 code                                |
| `sales_region`      | string | 否   | 64       | 员工     | 可配置销售大区，取 R01 code                          |
| `department_detail` | string | 否   | 200      | 员工     | 详细部门，自由输入                                   |

### 客户：从目录选择医院

以下 POST 样例会创建真实的待审申请。联调前替换测试邮箱和密码，不要直接使用正式用户资料。

```bash
curl -sS -i -X POST 'https://beonemed.ruosheng.bio/api/registration/?lang=zh' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "email": "replace-with-test-email@example.com",
    "password": "<替换为测试强密码>",
    "hospital_code": "c45181f23abda62e4213",
    "profile": {
      "full_name": "合成联调客户",
      "user_type": "customer",
      "customer_usage": "individual",
      "province": "33",
      "city": "3301",
      "hospital_level": "level_3_a",
      "teaching_title": "professor",
      "clinical_title": "chief"
    }
  }'
```

医院 code 仅作结构示例，实际提交应取本次 R02 搜索的返回值。选中的医院与已填写省市不一致时返回 `400`。

### 客户：其他医院，手动填写

```bash
curl -sS -i -X POST 'https://beonemed.ruosheng.bio/api/registration/?lang=zh' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "email": "replace-with-other-test-email@example.com",
    "password": "<替换为测试强密码>",
    "hospital_code": "other",
    "profile": {
      "full_name": "合成联调客户",
      "user_type": "customer",
      "province": "33",
      "city": "3301",
      "hospital": "合成联调医院（非真实机构）"
    }
  }'
```

`hospital_code: "other"` 时，`profile.hospital` 必须有内容。未填写医院时，同时省略 `hospital_code` 和 `profile.hospital`。

### 员工

```bash
curl -sS -i -X POST 'https://beonemed.ruosheng.bio/api/registration/?lang=zh' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "email": "replace-with-employee-test-email@example.com",
    "password": "<替换为测试强密码>",
    "profile": {
      "full_name": "合成联调员工",
      "user_type": "employee",
      "department": "sales",
      "sales_region": "east",
      "department_detail": "合成联调部门"
    }
  }'
```

### 受理响应：HTTP 202

```json
{
  "status": "pending_review",
  "message": "申请已受理，请联系管理员审核。若该邮箱已有账号或待审申请，请勿重复提交。"
}
```

前端必须按以下语义处理：

- `202` 不是登录成功；不返回 Token、用户 ID 或申请 ID，不能直接跳到已登录首页。
- 显示受理成功页，提示联系管理员，提供“返回登录”。不要自动调用登录接口。
- 为防邮箱枚举，已有账号邮箱或已有待审邮箱也返回同样的 `202`；不会覆盖原申请密码、资料。
- 账号审核通过后才创建并启用，登录账号为小写邮箱；密码为注册时提交的密码。
- 当前没有公开的“按邮箱查询审核状态”接口，也没有新增自动审核通知邮件／短信；请勿自行拼接不存在的状态查询接口。

### 不允许提交的字段

不要发送 `username`、`password_confirm`、`email_verified`、`is_active`、`is_staff`、`is_superuser`、`enterprise_id`、`module_codes`、`account_kind`、`permissions_managed`、`console_permissions_managed` 或并发登录策略等字段。

`password_confirm` 只在前端校验两次密码一致，不传后端。类别切换时移除另一类别的字段；员工不要携带医院、省市、职称，客户不要携带员工部门和销售大区。未知字段或不适用的非空字段返回 `400`。

旧 `POST /api/users/` 和旧邮件激活入口在 BeOne 审核模式下返回 `403`，不能用于本次注册。

## 6. R04：管理员申请列表

```http
GET /api/directory/registrations/?status=pending&page=1
Authorization: Token <ADMIN_TOKEN>
```

### 查询参数

| 参数            | 必填 | 说明                                                                                                 |
| --------------- | ---- | ---------------------------------------------------------------------------------------------------- |
| `status`        | 否   | 默认 `pending`；允许 `pending`、`approved`、`rejected`、`all`。不要传公开提交响应的 `pending_review` |
| `page`          | 否   | 从 1 开始，固定每页 30 条，没有 `page_size` 参数                                                     |
| `enterprise_id` | 否   | 可省略；当前注册固定归属 BeOne，不能传其他企业以跨企业查看                                           |

### cURL

用自己已有的管理员登录 Token 替换 `<ADMIN_TOKEN>`，不要转发真实 Token：

```bash
curl -sS --get 'https://beonemed.ruosheng.bio/api/directory/registrations/' \
  -H 'Authorization: Token <ADMIN_TOKEN>' \
  --data-urlencode 'status=pending' \
  --data-urlencode 'page=1' \
  --data-urlencode 'lang=zh'
```

### 响应结构示例

```json
{
  "count": 1,
  "page": 1,
  "results": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "email": "synthetic@example.com",
      "profile": {
        "full_name": "合成联调员工",
        "user_type": "employee",
        "department": "sales",
        "sales_region": "east"
      },
      "status": "pending",
      "time_created": "2026-11-03T17:00:00+08:00",
      "reviewed_at": null,
      "review_note": "",
      "user_id": null
    }
  ],
  "modules": [
    {
      "code": "llm_qa",
      "name": "智能助手（通用问答）",
      "ends_at": null
    }
  ]
}
```

UUID、时间及资料为合成结构示例，不是可直接操作的申请。`modules` 仅示意结构，实际可授权列表以实时响应为准。接口不返回申请密码或密码哈希。

## 7. R05：管理员审核

```http
POST /api/directory/registrations/{application_id}/review/
Authorization: Token <ADMIN_TOKEN>
Content-Type: application/json
```

`application_id` 必须取 R04 的 `results[].id`，不是用户 ID。

### 请求字段

| 字段                 | 类型                   | 必填            | 说明                                                                                                |
| -------------------- | ---------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `action`             | string                 | 是              | `approve` 或 `reject`                                                                               |
| `identity_confirmed` | boolean                | 通过时必须 true | 管理员已通过可信渠道核实申请人身份与邮箱归属；不能在 UI 自动勾选                                    |
| `module_codes`       | string[]               | 通过时必填      | 至少一个；只取 R04 `modules[].code`，不能使用展示名称                                               |
| `valid_to`           | ISO 8601 string / null | 否              | 例如 `2026-12-01T00:00:00+08:00`；时间必须晚于当前。null 按企业许可策略，不会绕过企业／模块许可限制 |
| `note`               | string                 | 否              | 最多 500 字符，审核说明                                                                             |

### 通过并启用：cURL

以下请求会真正创建、启用账号并授权，必须先核实申请，替换 ID、Token 和模块，再手动执行。

```bash
curl -sS -i -X POST \
  'https://beonemed.ruosheng.bio/api/directory/registrations/<APPLICATION_ID>/review/?lang=zh' \
  -H 'Authorization: Token <ADMIN_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "action": "approve",
    "identity_confirmed": true,
    "module_codes": ["<R04返回的模块code>"],
    "valid_to": null,
    "note": "已核实申请信息"
  }'
```

### 拒绝：cURL

```bash
curl -sS -i -X POST \
  'https://beonemed.ruosheng.bio/api/directory/registrations/<APPLICATION_ID>/review/?lang=zh' \
  -H 'Authorization: Token <ADMIN_TOKEN>' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "action": "reject",
    "note": "申请信息需补充，请重新提交"
  }'
```

### 成功响应：HTTP 200

返回 R04 单条申请的同一结构，不额外套 `data`：

- 通过：`status: "approved"`，`user_id` 为新用户公开 UUID，`reviewed_at` 有值。
- 拒绝：`status: "rejected"`，未创建用户，`user_id: null`，`reviewed_at` 有值。
- 通过或拒绝后，申请中的密码哈希被清除。

权限与失败语义：

- 新账号为 BeOne 普通成员，只获得所选模块使用权；员工类别不自动获得管理员／组长角色。
- `operations` 运维权限不允许通过注册审核授予。
- 企业／模块有效期、模块撤销、席位和资料字典会再次校验；失败不会留下半创建账号或部分授权。
- 超过 30 天的申请不能直接通过，需拒绝后由申请人重新提交。
- 对已经审核的申请重复审核返回 `400`；前端应刷新列表，不应自动重试批准操作。
- 本次人工核实不等同于邮箱验证码认证，不要根据审核成功显示“已通过邮箱验证码认证”。

## 8. 状态码与错误结构

| 状态码 | 含义                                             | 前端处理                                                         |
| ------ | ------------------------------------------------ | ---------------------------------------------------------------- |
| 200    | 查询或审核成功                                   | 按实际 JSON 结构读取                                             |
| 202    | 注册申请受理                                     | 显示待审提示，不做自动登录                                       |
| 400    | 必填、格式、字典、地区、审核状态、席位等校验失败 | 显示字段或表单错误；保留可修改的输入                             |
| 401    | 管理员 Token 缺失、无效或失效                    | 管理端要求重新登录；不要使用空 Token 继续请求                    |
| 403    | 无审核权限、跨企业、当前关闭注册或调用旧注册入口 | 显示权限／注册开放状态提示，不能通过重试绕过                     |
| 404    | 对当前企业不可见或不存在的申请 ID                | 刷新申请列表                                                     |
| 429    | 触发限流                                         | 遵守 `Retry-After`，暂缓重试                                     |
| 5xx    | 服务异常                                         | 提示重试或联系运维，不判为申请成功；不要打印完整请求对象中的密码 |

缺少必填字段的线上实测响应：

```json
{
  "email": ["该字段是必填项。"],
  "password": ["该字段是必填项。"],
  "profile": ["该字段是必填项。"]
}
```

管理员未登录的线上实测响应：

```json
{
  "detail": "身份认证信息未提供。"
}
```

DRF 错误可能是字段数组、`profile` 嵌套字段对象、`non_field_errors` 或 `detail`，不是统一的 `{code, message, data}` 包装。具体中文文案不要作为业务分支条件。

当前新增公开接口限流：

- R03：每匿名客户端标识 20 次／小时。
- R01 与 R02：共享查询限流，每匿名客户端标识 180 次／分钟。

前端仍需禁用提交中的按钮；不要依靠服务端限流处理双击。

## 9. 联调验收清单

1. 匿名打开注册页，R01 成功，用户类别可切换，所有业务字典支持输入联想。
2. 输入“杭州”能选择“浙江省／杭州市”，提交编码为字符串 `33`、`3301`。
3. R02 输入“邵逸夫”有结果；更换省市后清空医院，旧搜索响应不能覆盖新搜索。
4. 无搜索结果或搜索异常时仍能选“其他”，手填空白医院时阻止提交。
5. 客户、员工分别提交；另一类别的残留字段不发送；密码确认只做前端校验。
6. 缺姓名／邮箱／类别／密码时校验失败；提交受理后显示“待审核”，不自动登录，不期待返回申请 ID。
7. 同邮箱重复提交不覆盖原申请；统一显示受理提示，不向用户暴露邮箱是否已注册。
8. 普通用户调用 R04/R05 被拒绝；管理员能列出申请、查看资料、选择 R04 返回的有效模块。
9. 管理员核实后通过，新账号能按邮箱和注册密码登录，只能使用获得授权的模块；拒绝不创建可登录账号。
10. 业务类别、地区、职称、部门等审核后的画像沿用现有 PostHog 同步；姓名、邮箱、手机号、医院自由文本、备注和密码不进入这批画像属性。

## 10. 医院数据来源

- 项目：[YichuanAlex/Public_Hospital_Data_Crawler](https://github.com/YichuanAlex/Public_Hospital_Data_Crawler)。
- 固定取用提交：`ae5eacf0760c2d33f320e04682006fc62ee7f09f`。
- 原始文件：[全国公立医院数据.xlsx](https://github.com/YichuanAlex/Public_Hospital_Data_Crawler/blob/ae5eacf0760c2d33f320e04682006fc62ee7f09f/%E5%85%A8%E5%9B%BD%E5%85%AC%E7%AB%8B%E5%8C%BB%E9%99%A2%E6%95%B0%E6%8D%AE.xlsx)。
- 原始文件 SHA-256：`506a15a6ef82e9c2863dc77ff27d884f80f005acf82637ba40ed80b1f670b0ae`。
- 来源 README 声明 MIT；这不是对原始记录准确性、时效性或完整性的官方背书。
- 本项目导入日期：2026-11-03；经筛选及按名称／省市去重后保留 23,488 条参考名称记录，覆盖 31 个省级地区、317 个城市。
- 仅采用原始名称与可精确匹配的省市，不使用推测补全表，不导入电话、地址，不推断医院等级。
- 不是卫健委官方实时接口，也不保证全国全量。可能有旧称和别名，因此前端必须保留“其他／手动填写”。
- 运行时查询 BeOne 本地随版本发布的 JSON，不会把用户搜索词发给来源网站，也不需要前端直连 Elasticsearch、医院数据网站或其他内部服务。

## 11. Postman Collection 使用

同目录的 `BeOne-注册与输入联想.postman_collection.json` 可导入 Postman。

1. 公共 GET 请求可以直接运行。
2. 注册前设置 Collection 变量 `registration_email`、`registration_password`，并根据 R01/R02 实际结果填编码；注册示例会创建真实待审申请。
3. 管理接口设置 `admin_token` 和从 R04 获得的 `application_id`；Token 不要转发或提交代码。
4. 通过审核样例默认 `identity_confirmed: false`，`module_code` 为空，防止导入后误启用账号。管理员核实后手动改为 true，并填有效模块 code。
5. Collection 不自动登录、不自动保存真实密码或 Token、不自动审核。
