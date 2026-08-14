import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { FIXTURE_COUNTS } from './fixtures'
import type {
  ErrorResponse,
  ItemResponse,
  ListResponse,
  OpenApiDocument,
  PropertyDetail,
  PropertySummary,
  RootResponse,
  VocabularyResponse,
} from './types'

const worker = exports.default

async function get<T>(path: string) {
  const res = await worker.fetch(new Request(`https://example.com${path}`))
  return { res, body: await res.json<T>() }
}

const getList = (path: string) => get<ListResponse<PropertySummary>>(path)
const getDetail = (path: string) => get<ItemResponse<PropertyDetail>>(path)
const getError = (path: string) => get<ErrorResponse>(path)

describe('GET /', () => {
  it('API情報と出典を返す', async () => {
    const { res, body } = await get<RootResponse>('/')

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      documentation: { openapi: '/openapi.json', swaggerUi: '/docs', scalar: '/reference' },
      source: { publisher: '文化庁' },
    })
  })
})

describe('GET /openapi.json', () => {
  it('主要なパスを含む仕様を返す', async () => {
    const { res, body } = await get<OpenApiDocument>('/openapi.json')

    expect(res.status).toBe(200)
    expect(Object.keys(body.paths)).toEqual(
      expect.arrayContaining(['/properties', '/properties/{id}', '/heritage-types'])
    )
  })

  it('レスポンススキーマが展開されている', async () => {
    const { body } = await get<OpenApiDocument>('/openapi.json')
    const schema = body.paths['/properties'].get.responses['200'].content['application/json'].schema

    expect(schema.properties.data.type).toBe('array')
    expect(schema.properties.meta.properties.total.type).toBe('number')
  })

  it('クエリパラメータが列挙されている', async () => {
    const { body } = await get<OpenApiDocument>('/openapi.json')
    const names = body.paths['/properties'].get.parameters.map((p) => p.name)

    expect(names).toEqual(
      expect.arrayContaining(['q', 'heritageType', 'designation', 'prefecture', 'bbox', 'limit'])
    )
  })
})

describe('GET /properties', () => {
  it('全件と出典を返す', async () => {
    const { res, body } = await getList('/properties')

    expect(res.status).toBe(200)
    expect(body.data).toHaveLength(FIXTURE_COUNTS.properties)
    expect(body.meta).toMatchObject({ total: FIXTURE_COUNTS.properties, limit: 20, offset: 0 })
    expect(body.meta.source.publisher).toBe('文化庁')
  })

  it('名称で部分一致検索できる', async () => {
    const { body } = await getList('/properties?q=東照宮')

    expect(body.meta.total).toBe(1)
    expect(body.data[0].name).toBe('東照宮')
  })

  it('指定区分で絞り込める', async () => {
    const { body } = await getList('/properties?designation=national_treasure')

    expect(body.meta.total).toBe(1)
    expect(body.data[0].name).toBe('太安萬侶銅板墓誌')
  })

  it('指定区分をカンマ区切りで複数指定できる', async () => {
    const { body } = await getList('/properties?designation=historic_site,place_of_scenic_beauty')

    expect(body.meta.total).toBe(1)
    expect(body.data[0].designations).toHaveLength(2)
  })

  it('文化財種類の大分類で絞り込める', async () => {
    const { body } = await getList('/properties?group=building')

    expect(body.meta.total).toBe(2)
  })

  it('都道府県で絞り込める', async () => {
    const { body } = await getList('/properties?prefecture=青森県')

    expect(body.meta.total).toBe(1)
    expect(body.data[0].prefectures).toContain('青森県')
  })

  it('所有者住所は既定の都道府県検索に含まれない', async () => {
    const { body: asLocation } = await getList('/properties?prefecture=奈良県')
    const { body: asOwner } = await getList('/properties?prefecture=奈良県&placeRole=owner_address')

    expect(asLocation.meta.total).toBe(0)
    expect(asOwner.meta.total).toBe(1)
  })

  it('分類で絞り込める', async () => {
    const { body } = await getList('/properties?category=1')

    expect(body.meta.total).toBe(2)
  })

  it('指定年月日の範囲で絞り込める', async () => {
    const { body } = await getList('/properties?designatedFrom=2000-01-01')

    expect(body.meta.total).toBe(1)
    expect(body.data[0].name).toBe('太安萬侶銅板墓誌')
  })

  it('座標の有無で絞り込める', async () => {
    const { body: withCoords } = await getList('/properties?hasCoordinates=true')
    const { body: without } = await getList('/properties?hasCoordinates=false')

    expect(withCoords.meta.total).toBe(3)
    expect(without.meta.total).toBe(2)
  })

  it('bboxで矩形範囲を絞り込める', async () => {
    const { body } = await getList('/properties?bbox=140,40,141,41')

    expect(body.meta.total).toBe(1)
    expect(body.data[0].name).toBe('岩木山神社')
  })

  it('名称でソートできる', async () => {
    const { body } = await getList('/properties?sort=name&order=asc')
    const names = body.data.map((d) => d.name)

    expect([...names].sort()).toEqual(names)
  })

  it('指定年月日でソートできる', async () => {
    const { body } = await getList('/properties?sort=designatedOn&order=asc')

    expect(body.data[0].name).toBe('東照宮')
  })

  it('limitとoffsetでページングできる', async () => {
    const { body: first } = await getList('/properties?limit=2&offset=0')
    const { body: second } = await getList('/properties?limit=2&offset=2')

    expect(first.data).toHaveLength(2)
    expect(second.data).toHaveLength(2)
    expect(first.data[0].id).not.toBe(second.data[0].id)
  })

  it('月精度の指定日はdatePrecisionで区別できる', async () => {
    const { body } = await getList('/properties?q=硬玉製大珠')

    expect(body.data[0].designations[0]).toMatchObject({
      designatedOn: '1960-03-01',
      datePrecision: 'month',
    })
  })

  it.each([
    ['limit=101', 'limitが上限超過'],
    ['limit=0', 'limitが下限未満'],
    ['group=unknown', 'groupが不正'],
    ['designatedFrom=2020', '日付形式が不正'],
    ['bbox=1,2,3', 'bboxの要素数が不足'],
    ['bbox=140,41,141,40', 'bboxの上下が逆'],
    ['placeRole=unknown', 'placeRoleが不正'],
  ])('%s は400を返す: %s', async (query) => {
    const { res, body } = await getError(`/properties?${query}`)

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_query')
  })
})

describe('GET /properties の検索と並び替え', () => {
  it('解説文の語で全文検索できる', async () => {
    const { body } = await getList('/properties?q=' + encodeURIComponent('藤原氏'))

    expect(body.meta.total).toBe(1)
    expect(body.data[0]?.id).toBe(1)
  })

  it('2文字以下は名称とふりがなの部分一致になる', async () => {
    const { body } = await getList('/properties?q=' + encodeURIComponent('東照'))

    expect(body.meta.total).toBe(1)
    expect(body.data[0]?.name).toBe('東照宮')
  })

  it('ふりがなの前方一致で絞り込める', async () => {
    const { body } = await getList('/properties?kana=' + encodeURIComponent('いわき'))

    expect(body.meta.total).toBe(1)
    expect(body.data[0]?.nameKana).toBe('いわきやまじんじゃ')
  })

  it('一覧にふりがなを含む', async () => {
    const { body } = await getList('/properties?limit=100')

    expect(body.data.find((p) => p.id === 1)?.nameKana).toBe('いわきやまじんじゃ')
  })

  it('西暦の範囲で絞り込める', async () => {
    const inRange = await getList('/properties?yearFrom=1600&yearTo=1700')
    const outOfRange = await getList('/properties?yearFrom=1800')

    expect(inRange.body.meta.total).toBe(1)
    expect(outOfRange.body.meta.total).toBe(0)
  })

  it('解説文の有無で絞り込める', async () => {
    const withText = await getList('/properties?hasDescription=true')
    const without = await getList('/properties?hasDescription=false')

    expect(withText.body.meta.total).toBe(2)
    expect(without.body.meta.total).toBe(FIXTURE_COUNTS.properties - 2)
  })

  it('指定基準で絞り込める', async () => {
    const { body } = await getList('/properties?criterion=1')

    expect(body.meta.total).toBe(1)
    expect(body.data[0]?.id).toBe(1)
  })

  it('ふりがな順では値を持たないものが末尾に並ぶ', async () => {
    const { body } = await getList('/properties?sort=nameKana&limit=100')
    const kanaValues = body.data.map((p) => p.nameKana)
    const firstNull = kanaValues.indexOf(null)

    expect(kanaValues[0]).not.toBeNull()
    expect(kanaValues.slice(firstNull).every((v) => v === null)).toBe(true)
  })

  it('西暦順でも値を持たないものが末尾に並ぶ', async () => {
    const { body } = await getList('/properties?sort=year&order=desc&limit=100')

    expect(body.data[0]?.id).toBe(1)
  })
})

describe('GET /properties/:id', () => {
  it('詳細を返す', async () => {
    const { res, body } = await getDetail('/properties/1')

    expect(res.status).toBe(200)
    expect(body.data).toMatchObject({
      id: 1,
      name: '岩木山神社',
      unitName: '中門',
      targetId: '85',
      period: '江戸中期',
      register: { code: '102' },
    })
    expect(body.data.categories).toEqual([
      { scheme: { code: 'building_typology', name: '建造物の類型' }, name: '近世以前／神社' },
    ])
    expect(body.data.places).toEqual([
      { role: 'location', prefecture: '青森県', addressText: '青森県弘前市百沢' },
    ])
    expect(body.data.actors).toEqual([{ role: 'owner', name: '岩木山神社' }])
  })

  it('国宝へ昇格した重要文化財は指定を2件持つ', async () => {
    const { body } = await getDetail('/properties/2')
    const codes = body.data.designations.map((d) => d.code)

    expect(codes).toEqual(
      expect.arrayContaining(['important_cultural_property', 'national_treasure'])
    )
  })

  it('除外した座標は理由を返す', async () => {
    const { body } = await getDetail('/properties/5')

    expect(body.data.coordinates).toBeNull()
    expect(body.data.coordinateNote).toContain('日本の範囲外')
  })

  it('詳細ページ由来の項目を返す', async () => {
    const { body } = await getDetail('/properties/1')

    expect(body.data).toMatchObject({
      nameKana: 'いわきやまじんじゃ',
      quantityText: '1棟',
      eraText: '寛文7',
      yearText: '1667',
      yearFrom: 1667,
      yearTo: 1667,
      designationNumber: '00123',
      hasPhoto: true,
      hasAttachment: false,
    })
    expect(body.data.summaryText).toContain('津軽')
    expect(body.data.details).toEqual([
      {
        field: { code: 'structure', name: '構造及び形式等' },
        value: '桁行三間、梁間二間、一重、入母屋造',
      },
    ])
    expect(body.data.criteria).toEqual([
      { id: 1, kind: 'designation', slot: 1, text: '(一）意匠的に優秀なもの' },
    ])
    expect(body.data.attachments).toEqual([
      { name: '棟札', quantityText: '2枚' },
      { name: '旧組高欄', quantityText: '6組' },
    ])
  })

  it('元データの詳細ページURLを返す', async () => {
    const { body } = await getDetail('/properties/1')

    expect(body.data.sourceUrl).toBe('https://kunishitei.bunka.go.jp/bsys/maindetails/102/85')
  })

  it('保持者は団体のみ名称を持ち、個人は氏名を持たない', async () => {
    const { body } = await getDetail('/properties/1')
    const group = body.data.holders.find((h) => h.kind === 'group')
    const individual = body.data.holders.find((h) => h.kind === 'individual')

    expect(group).toMatchObject({
      name: '岩木山神社保存会',
      nameKana: 'いわきやまじんじゃほぞんかい',
    })
    expect(individual).toMatchObject({ name: null, nameKana: null, certificationRound: '第3次' })
  })

  it('指定等後に行った措置は異動種別をまとめて返す', async () => {
    const { body } = await getDetail('/properties/3')

    const [change] = body.data.changes

    expect(change).toMatchObject({ changedOn: '1935-06-07', datePrecision: 'day', content: null })
    expect([...change.types].sort()).toEqual(['名称変更', '追加指定'])
    expect(body.data.areaHectares).toBe(12.5)
  })

  it('指定には和暦を含む', async () => {
    const { body } = await getDetail('/properties/1')

    expect(body.data.designations[0]).toHaveProperty('japaneseEraDate')
  })

  it('存在しないidは404を返す', async () => {
    const { res, body } = await getError('/properties/99999999')

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })

  it('数値でないidは400を返す', async () => {
    const { res } = await getError('/properties/abc')

    expect(res.status).toBe(400)
  })
})

describe('語彙エンドポイント', () => {
  it.each([
    ['/registers', FIXTURE_COUNTS.registers],
    ['/heritage-types', FIXTURE_COUNTS.heritageTypes],
    ['/designation-categories', FIXTURE_COUNTS.designationCategories],
    ['/category-schemes', FIXTURE_COUNTS.categorySchemes],
    ['/designation-criteria', FIXTURE_COUNTS.designationCriteria],
    ['/detail-fields', FIXTURE_COUNTS.detailFields],
    ['/categories', FIXTURE_COUNTS.categories],
    ['/prefectures', FIXTURE_COUNTS.prefectures],
  ])('%s は %i 件を返す', async (path, total) => {
    const { res, body } = await get<VocabularyResponse<unknown>>(path)

    expect(res.status).toBe(200)
    expect(body.meta.total).toBe(total)
  })

  it('/categories は体系で絞り込める', async () => {
    const { body } = await get<VocabularyResponse<{ scheme: string }>>(
      '/categories?scheme=art_craft_field'
    )

    expect(body.meta.total).toBe(1)
    expect(body.data[0].scheme).toBe('art_craft_field')
  })

  it('/prefectures は所在地の件数を返す', async () => {
    const { body } = await get<VocabularyResponse<{ name: string; count: number }>>('/prefectures')

    expect(body.data).toContainEqual({ name: '青森県', count: 1 })
  })
})

describe('指定基準と記述項目の語彙', () => {
  it('指定基準は紐づく文化財の件数を返す', async () => {
    const { body } =
      await get<VocabularyResponse<{ id: number; text: string; count: number }>>(
        '/designation-criteria'
      )

    expect(body.data.find((c) => c.id === 1)).toMatchObject({
      text: '(一）意匠的に優秀なもの',
      count: 1,
    })
  })

  it('記述項目は適用範囲と件数を返す', async () => {
    const { body } =
      await get<VocabularyResponse<{ code: string; appliesTo: string; count: number }>>(
        '/detail-fields'
      )

    expect(body.data.find((f) => f.code === 'structure')).toMatchObject({
      appliesTo: '建造物',
      count: 1,
    })
  })
})

describe('エラー', () => {
  it('未定義のパスは404を返す', async () => {
    const { res, body } = await get<ErrorResponse>('/__not_found__')

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })
})
