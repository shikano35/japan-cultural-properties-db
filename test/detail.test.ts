import { describe, expect, it } from 'vitest'
import { parseDetail, parseDetailDate, parseHectares, parseYearRange } from '../scripts/crawl/parse'
import { enrich } from '../scripts/etl/detail-merge'
import type { ParsedDetail } from '../scripts/crawl/parse'
import type { Property } from '../scripts/etl/types'

function row(label: string, value: string): string {
  return `<tr>
    <td width="130" align="right" class="detail-td" valign="top">${label}</td>
    <td style="width:5px">：</td>
    <td width="310" class="detail-td">${value}</td>
  </tr>`
}

function relationRow(label: string, value: string): string {
  return `<tr>
    <td width="125" align="right" class="cont">${label}</td>
    <td>:</td>
    <td width="*" class="cont">${value}</td>
  </tr>`
}

interface PageOptions {
  rows: string
  detailText?: string
  summaryText?: string
  relations?: string
  photo?: boolean
  attachment?: 'あり' | 'なし'
}

function buildPage(options: PageOptions): string {
  const explanation = (title: string, text: string): string =>
    `<div id="detail_explanation">
       <td class="resulttitle00" bgcolor="#F5F5F5">${title}</td>
       <textarea rows=35 readonly>${text}</textarea>
     </div>`
  return `<html><body>
<!-- heritage_detail START -->
<table id="heritage_detail">${options.rows}</table>
<!-- heritage_detail END -->
<table id="relatedinformation">
  <tr><td class="cont" width="120">添付ファイル</td><td class="cont" width="572">${options.attachment ?? 'なし'}</td></tr>
</table>
<div id="curtain">
${options.photo === true ? '<div id="detail_photolist"><div class="photo_print"></div></div>' : ''}
${options.summaryText === undefined ? '' : explanation('解説文', options.summaryText)}
${options.detailText === undefined ? '' : explanation('詳細解説', options.detailText)}
${options.relations ?? ''}
</div>
</body></html>`
}

describe('parseDetailDate', () => {
  it('和暦付きの日付を分解する', () => {
    expect(parseDetailDate('1897.12.28(明治30.12.28)')).toEqual({
      iso: '1897-12-28',
      precision: 'day',
      eraText: '明治30.12.28',
      sourceText: '1897.12.28(明治30.12.28)',
    })
  })

  it('日が00のときは月精度として月初に丸める', () => {
    expect(parseDetailDate('1960.03.00(昭和35.03.00)')).toMatchObject({
      iso: '1960-03-01',
      precision: 'month',
    })
  })

  it('月が00のときは日付を持たない', () => {
    expect(parseDetailDate('1960.00.00(昭和35.00.00)')).toMatchObject({
      iso: null,
      precision: 'unknown',
    })
  })

  it('空欄はnullを返す', () => {
    expect(parseDetailDate('')).toBeNull()
  })
})

describe('parseYearRange', () => {
  it('単一の西暦を範囲として扱う', () => {
    expect(parseYearRange('1124')).toEqual({ from: 1124, to: 1124 })
  })

  it('範囲表記を解析する', () => {
    expect(parseYearRange('1868-1911')).toEqual({ from: 1868, to: 1911 })
  })

  it('全角チルダの範囲を解析する', () => {
    expect(parseYearRange('1830～1868')).toEqual({ from: 1830, to: 1868 })
  })

  it('概数と年の接尾辞を許容する', () => {
    expect(parseYearRange('1628頃')).toEqual({ from: 1628, to: 1628 })
    expect(parseYearRange('1883年頃')).toEqual({ from: 1883, to: 1883 })
    expect(parseYearRange('１８９８年')).toEqual({ from: 1898, to: 1898 })
  })

  it('増改築が続く表記は先頭の区間を建造期とする', () => {
    expect(parseYearRange('1868-1911／1926-1988改修')).toEqual({ from: 1868, to: 1911 })
    expect(parseYearRange('1880／1910移築')).toEqual({ from: 1880, to: 1880 })
  })

  it('数値でない表記は解析しない', () => {
    expect(parseYearRange('19世紀半ば')).toEqual({ from: null, to: null })
    expect(parseYearRange('1911以前')).toEqual({ from: null, to: null })
    expect(parseYearRange(null)).toEqual({ from: null, to: null })
  })
})

describe('parseHectares', () => {
  it('面積を数値にする', () => {
    expect(parseHectares('40917.5 ha')).toBe(40917.5)
    expect(parseHectares('14.5 ha')).toBe(14.5)
  })

  it('面積がないときはnullを返す', () => {
    expect(parseHectares(null)).toBeNull()
    expect(parseHectares('')).toBeNull()
  })
})

describe('parseDetail', () => {
  it('建造物の項目と附指定を取り出す', () => {
    const html = buildPage({
      rows: [
        row('名称', '中尊寺金色堂'),
        row('ふりがな', 'ちゅうそんじこんじきどう'),
        row('員数', '1棟'),
        row('種別', '近世以前／寺院'),
        row('時代', '平安後期'),
        row('年代', '天治元'),
        row('西暦', '1124'),
        row('構造及び形式等', '桁行三間、梁間三間、一重、宝形造、本瓦形板葺'),
        row('指定番号', '00001'),
        row('国宝・重文区分', '国宝'),
        row('重文指定年月日', '1897.12.28(明治30.12.28)'),
        row('国宝指定年月日', '1951.06.09(昭和26.06.09)'),
        row('重文指定基準１', '重要文化財のうち極めて優秀で，かつ，文化史的意義の特に深いもの'),
      ].join(''),
      detailText: '中尊寺金色堂　一棟\n\n　中尊寺は、藤原清衡が…',
      relations: `<div id="detail_rellist_1"><span class="reltitle02">附指定</span></div>
        <div id="detail_rellist_1_0">${relationRow('附名称', '棟札')}${relationRow('附員数', '2枚')}</div>
        <div id="detail_rellist_1_1">${relationRow('附名称', '納札')}${relationRow('附員数', '1枚')}</div>`,
    })

    const detail = parseDetail(html, '102', '109')

    expect(detail.nameKana).toBe('ちゅうそんじこんじきどう')
    expect(detail.quantityText).toBe('1棟')
    expect(detail.eraText).toBe('天治元')
    expect(detail.yearText).toBe('1124')
    expect(detail.designationNumber).toBe('00001')
    expect(detail.dates.icp).toMatchObject({ iso: '1897-12-28' })
    expect(detail.dates.national_treasure).toMatchObject({ iso: '1951-06-09' })
    expect(detail.detailText).toContain('藤原清衡')
    expect(detail.summaryText).toBeNull()
    expect(detail.criteria).toEqual([
      {
        kind: 'designation',
        slot: 1,
        text: '重要文化財のうち極めて優秀で，かつ，文化史的意義の特に深いもの',
      },
    ])
    expect(detail.details).toEqual([
      { fieldCode: 'structure', value: '桁行三間、梁間三間、一重、宝形造、本瓦形板葺' },
      { fieldCode: 'treasure_class', value: '国宝' },
    ])
    expect(detail.attachments).toEqual([
      { name: '棟札', quantityText: '2枚' },
      { name: '納札', quantityText: '1枚' },
    ])
    expect(detail.hasPhoto).toBe(false)
    expect(detail.unknownLabels).toEqual([])
  })

  it('記念物の特別指定年月日と措置を取り出す', () => {
    const html = buildPage({
      rows: [
        row('名称', '五稜郭跡'),
        row('ふりがな', 'ごりょうかくあと'),
        row('種別１', '特別史跡'),
        row('特別区分', '特別'),
        row('告示番号', '270'),
        row('指定年月日', '1922.10.12(大正11.10.12)'),
        row('特別指定年月日', '1952.03.29(昭和27.03.29)'),
        row('追加年月日', '1929.04.02(昭和4.04.02)'),
        row('指定基準', '二．都城跡、国郡庁跡、城跡、官公庁、戦跡その他政治に関する遺跡'),
      ].join(''),
      photo: true,
      relations: `<div id="detail_rellist_1"><span class="reltitle02">指定等後に行った措置</span></div>
        <div id="detail_rellist_1_0">${relationRow('異動年月日', '1929.04.02(昭和4.04.02)')}${relationRow('異動種別1', '追加指定')}</div>`,
    })

    const detail = parseDetail(html, '401', '7')

    expect(detail.dates.designated).toMatchObject({ iso: '1922-10-12' })
    expect(detail.dates.special).toMatchObject({ iso: '1952-03-29' })
    expect(detail.dates.added).toMatchObject({ iso: '1929-04-02' })
    expect(detail.notificationNumber).toBe('270')
    expect(detail.details).toEqual([{ fieldCode: 'special_kind', value: '特別' }])
    expect(detail.hasPhoto).toBe(true)
    expect(detail.changes).toEqual([
      {
        changedOn: {
          iso: '1929-04-02',
          precision: 'day',
          eraText: '昭和4.04.02',
          sourceText: '1929.04.02(昭和4.04.02)',
        },
        typeNames: ['追加指定'],
        content: null,
      },
    ])
    expect(detail.unknownLabels).toEqual([])
  })

  it('1つのセルに並ぶ複数の指定基準を分ける', () => {
    const html = buildPage({
      rows: [
        row('名称', '松島'),
        row('指定基準', '八．砂丘、砂嘴、海浜、島嶼,十一．展望地点'),
      ].join(''),
    })

    expect(parseDetail(html, '401', '182').criteria).toEqual([
      { kind: 'designation', slot: 1, text: '八．砂丘、砂嘴、海浜、島嶼' },
      { kind: 'designation', slot: 1, text: '十一．展望地点' },
    ])
  })

  it('同じ基準が複数の欄に入っていても1件にする', () => {
    const html = buildPage({
      rows: [
        row('名称', '旧朝香宮邸'),
        row('重文指定基準１', '(一）意匠的に優秀なもの'),
        row('重文指定基準２', '(一）意匠的に優秀なもの'),
      ].join(''),
    })

    expect(parseDetail(html, '102', '4796').criteria).toEqual([
      { kind: 'designation', slot: 1, text: '(一）意匠的に優秀なもの' },
    ])
  })

  it('世界遺産の登録基準は語彙にせず固有項目にする', () => {
    const html = buildPage({
      rows: [
        row('名称', '平泉'),
        row('構成資産', '中尊寺、毛越寺'),
        row('登録基準２', '平泉の寺院と浄土庭園は…'),
        row('登録基準６', '平泉の浄土庭園は…'),
      ].join(''),
    })

    const detail = parseDetail(html, '901', '13')

    expect(detail.criteria).toEqual([])
    expect(detail.details).toEqual([
      { fieldCode: 'components', value: '中尊寺、毛越寺' },
      { fieldCode: 'world_heritage_criterion_2', value: '平泉の寺院と浄土庭園は…' },
      { fieldCode: 'world_heritage_criterion_6', value: '平泉の浄土庭園は…' },
    ])
  })

  it('解説文と詳細解説を区別する', () => {
    const html = buildPage({
      rows: row('名称', 'アイヌ古式舞踊'),
      summaryText: '北海道各地のアイヌによって受け継がれてきた歌舞',
      detailText: '詳しい解説の本文',
    })

    const detail = parseDetail(html, '302', '1')

    expect(detail.summaryText).toBe('北海道各地のアイヌによって受け継がれてきた歌舞')
    expect(detail.detailText).toBe('詳しい解説の本文')
  })
})

function property(overrides: Partial<Property>): Property {
  return {
    registerCode: '401',
    targetId: '7',
    sourceTargetId: '7',
    heritageTypeCode: 'monument',
    name: '五稜郭跡',
    unitName: null,
    periodText: null,
    originCountry: null,
    facilityName: null,
    locationText: '函館市五稜郭町本通',
    latitude: null,
    longitude: null,
    coordinateNote: null,
    designations: [],
    categories: [],
    places: [],
    actors: [],
    ...overrides,
  }
}

function detailRecord(overrides: Partial<ParsedDetail>): ParsedDetail {
  return {
    ledgerCode: '401',
    targetId: '7',
    nameKana: null,
    unitNameKana: null,
    quantityText: null,
    eraText: null,
    yearText: null,
    areaText: null,
    ownerKind: null,
    summaryText: null,
    detailText: null,
    hasPhoto: false,
    hasAttachment: false,
    designationNumber: null,
    branchNumber: null,
    notificationNumber: null,
    registrationRound: null,
    dates: {},
    criteria: [],
    details: [],
    attachments: [],
    holders: [],
    changes: [],
    unknownLabels: [],
    ...overrides,
  }
}

describe('enrich', () => {
  it('特別史跡を基の指定と特別指定の2件に分ける', () => {
    const properties = [
      property({
        designations: [
          {
            categoryCode: 'special_historic_site',
            designatedOn: '1922-10-12',
            datePrecision: 'day',
            sourceDate: '19221012',
          },
        ],
      }),
    ]
    const details = new Map([
      [
        '401/7',
        detailRecord({
          dates: {
            designated: {
              iso: '1922-10-12',
              precision: 'day',
              eraText: '大正11.10.12',
              sourceText: '1922.10.12(大正11.10.12)',
            },
            special: {
              iso: '1952-03-29',
              precision: 'day',
              eraText: '昭和27.03.29',
              sourceText: '1952.03.29(昭和27.03.29)',
            },
          },
        }),
      ],
    ])

    const [enriched] = enrich(properties, details, '2026-08-13')

    expect(enriched.designations).toHaveLength(2)
    expect(enriched.designations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          categoryCode: 'special_historic_site',
          designatedOn: '1952-03-29',
          japaneseEraDate: '昭和27.03.29',
        }),
        expect.objectContaining({
          categoryCode: 'historic_site',
          designatedOn: '1922-10-12',
        }),
      ])
    )
    expect(enriched.detailRetrievedOn).toBe('2026-08-13')
  })

  it('記録単位の番号と追加年月日は文化財に紐付ける', () => {
    const properties = [
      property({
        designations: [
          {
            categoryCode: 'special_historic_site',
            designatedOn: '1922-10-12',
            datePrecision: 'day',
            sourceDate: '19221012',
          },
        ],
      }),
    ]
    const details = new Map([
      [
        '401/7',
        detailRecord({
          notificationNumber: '270',
          dates: {
            designated: {
              iso: '1922-10-12',
              precision: 'day',
              eraText: '大正11.10.12',
              sourceText: '1922.10.12(大正11.10.12)',
            },
            special: {
              iso: '1952-03-29',
              precision: 'day',
              eraText: '昭和27.03.29',
              sourceText: '1952.03.29(昭和27.03.29)',
            },
            added: {
              iso: '1929-04-02',
              precision: 'day',
              eraText: '昭和4.04.02',
              sourceText: '1929.04.02(昭和4.04.02)',
            },
          },
        }),
      ],
    ])

    const [enriched] = enrich(properties, details, '2026-08-13')

    expect(enriched.notificationNumber).toBe('270')
    expect(enriched.addedOn).toBe('1929-04-02')
    for (const designation of enriched.designations) {
      expect(designation).not.toHaveProperty('addedOn')
      expect(designation).not.toHaveProperty('notificationNumber')
    }
  })

  it('詳細ページがない文化財はCSVの指定をそのまま残す', () => {
    const properties = [
      property({
        designations: [
          {
            categoryCode: 'historic_site',
            designatedOn: '1933-02-28',
            datePrecision: 'day',
            sourceDate: '19330228',
          },
        ],
      }),
    ]

    const [enriched] = enrich(properties, new Map(), '2026-08-13')

    expect(enriched.designations).toEqual([
      expect.objectContaining({ categoryCode: 'historic_site', designatedOn: '1933-02-28' }),
    ])
    expect(enriched.detailRetrievedOn).toBeNull()
    expect(enriched.nameKana).toBeNull()
    expect(enriched.hasPhoto).toBeNull()
  })

  it('西暦と面積を数値に変換する', () => {
    const properties = [property({ heritageTypeCode: 'important_cultural_landscape' })]
    const details = new Map([
      ['412/7', detailRecord({ ledgerCode: '412', yearText: '1868-1911', areaText: '40917.5 ha' })],
    ])

    const [enriched] = enrich(properties, details, '2026-08-13')

    expect(enriched.yearFrom).toBe(1868)
    expect(enriched.yearTo).toBe(1911)
    expect(enriched.areaHectares).toBe(40917.5)
  })
})
