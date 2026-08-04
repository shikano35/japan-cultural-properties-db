/** CSVに現れない語彙とコード体系の定義。 */

export const SOURCE = {
  name: '国指定文化財等データベース',
  publisher: '文化庁',
  url: 'https://kunishitei.bunka.go.jp/bsys/index',
  termsUrl: 'https://www.mext.go.jp/b_menu/1351168.htm',
  licenseNote:
    '文部科学省ウェブサイト利用規約（政府標準利用規約 第2.0版準拠 / CC BY 4.0 互換）に基づき、出典記載の上で文字情報を自由に利用可',
  retrievedOn: '2026-08-04',
  processingNote:
    '完全重複行の除去、管理対象IDのゼロ埋め正規化、複数ファイルに跨る同一物件の統合、種別1/種別2 の分類体系への振り分け、指定年月日の指定エンティティへの展開、不正な座標の除外を行った加工済みデータ',
} as const

export const REGISTERS: readonly { code: string; name: string }[] = [
  { code: '101', name: '登録有形文化財（建造物）台帳' },
  { code: '102', name: '国宝・重要文化財（建造物）台帳' },
  { code: '103', name: '重要伝統的建造物群保存地区台帳' },
  { code: '201', name: '美術工芸品台帳' },
  { code: '202', name: '登録美術品台帳' },
  { code: '301', name: '有形民俗文化財台帳' },
  { code: '302', name: '無形民俗文化財台帳' },
  { code: '303', name: '無形文化財台帳' },
  { code: '304', name: '選定保存技術台帳' },
  { code: '401', name: '記念物・文化的景観台帳' },
  { code: '901', name: '世界遺産台帳' },
]

export type HeritageGroup = 'building' | 'art_craft' | 'folk' | 'intangible' | 'monument' | 'other'

// nameはCSVの文化財種類の値と一致させる
export const HERITAGE_TYPES: readonly {
  code: string
  name: string
  groupName: HeritageGroup
}[] = [
  {
    code: 'national_treasure_and_icp_building',
    name: '国宝・重要文化財（建造物）',
    groupName: 'building',
  },
  {
    code: 'registered_tangible_building',
    name: '登録有形文化財(建造物)',
    groupName: 'building',
  },
  {
    code: 'ipds',
    name: '重要伝統的建造物群保存地区',
    groupName: 'building',
  },
  {
    code: 'national_treasure_and_icp_art_craft',
    name: '国宝・重要文化財（美術工芸品）',
    groupName: 'art_craft',
  },
  {
    code: 'registered_tangible_art_craft',
    name: '登録有形文化財（美術工芸品）',
    groupName: 'art_craft',
  },
  { code: 'registered_art_object', name: '登録美術品', groupName: 'art_craft' },
  { code: 'important_tangible_folk', name: '重要有形民俗文化財', groupName: 'folk' },
  { code: 'registered_tangible_folk', name: '登録有形民俗文化財', groupName: 'folk' },
  { code: 'important_intangible_folk', name: '重要無形民俗文化財', groupName: 'folk' },
  { code: 'registered_intangible_folk', name: '登録無形民俗文化財', groupName: 'folk' },
  {
    code: 'recorded_intangible_folk',
    name: '記録作成等の措置を講ずべき無形の民俗文化財',
    groupName: 'folk',
  },
  { code: 'important_intangible', name: '重要無形文化財', groupName: 'intangible' },
  { code: 'registered_intangible', name: '登録無形文化財', groupName: 'intangible' },
  {
    code: 'recorded_intangible',
    name: '記録作成等の措置を講ずべき無形文化財',
    groupName: 'intangible',
  },
  {
    code: 'selected_conservation_technique',
    name: '選定保存技術',
    groupName: 'intangible',
  },
  { code: 'monument', name: '史跡名勝天然記念物', groupName: 'monument' },
  { code: 'registered_monument', name: '登録記念物', groupName: 'monument' },
  { code: 'important_cultural_landscape', name: '重要文化的景観', groupName: 'monument' },
  { code: 'world_heritage', name: '世界遺産', groupName: 'other' },
]

export type DesignationTier = 'designated' | 'registered' | 'selected' | 'recorded'

export const DESIGNATION_CATEGORIES: readonly {
  code: string
  name: string
  tier: DesignationTier
}[] = [
  { code: 'national_treasure', name: '国宝', tier: 'designated' },
  { code: 'important_cultural_property', name: '重要文化財', tier: 'designated' },
  { code: 'registered_tangible', name: '登録有形文化財', tier: 'registered' },
  { code: 'registered_art_object', name: '登録美術品', tier: 'registered' },
  { code: 'important_tangible_folk', name: '重要有形民俗文化財', tier: 'designated' },
  { code: 'registered_tangible_folk', name: '登録有形民俗文化財', tier: 'registered' },
  { code: 'important_intangible_folk', name: '重要無形民俗文化財', tier: 'designated' },
  { code: 'registered_intangible_folk', name: '登録無形民俗文化財', tier: 'registered' },
  {
    code: 'recorded_intangible_folk',
    name: '記録作成等の措置を講ずべき無形の民俗文化財',
    tier: 'recorded',
  },
  { code: 'important_intangible', name: '重要無形文化財', tier: 'designated' },
  { code: 'registered_intangible', name: '登録無形文化財', tier: 'registered' },
  {
    code: 'recorded_intangible',
    name: '記録作成等の措置を講ずべき無形文化財',
    tier: 'recorded',
  },
  { code: 'selected_conservation_technique', name: '選定保存技術', tier: 'selected' },
  { code: 'historic_site', name: '史跡', tier: 'designated' },
  { code: 'place_of_scenic_beauty', name: '名勝', tier: 'designated' },
  { code: 'natural_monument', name: '天然記念物', tier: 'designated' },
  { code: 'special_historic_site', name: '特別史跡', tier: 'designated' },
  { code: 'special_place_of_scenic_beauty', name: '特別名勝', tier: 'designated' },
  { code: 'special_natural_monument', name: '特別天然記念物', tier: 'designated' },
  {
    code: 'registered_monument_scenic',
    name: '登録記念物（名勝地関係）',
    tier: 'registered',
  },
  { code: 'registered_monument_site', name: '登録記念物（遺跡関係）', tier: 'registered' },
  {
    code: 'registered_monument_natural',
    name: '登録記念物（動物植物地質鉱物関係）',
    tier: 'registered',
  },
  {
    code: 'important_cultural_landscape',
    name: '重要文化的景観',
    tier: 'designated',
  },
  { code: 'ipds', name: '重要伝統的建造物群保存地区', tier: 'selected' },
]

export const CATEGORY_SCHEMES: readonly {
  code: string
  name: string
  appliesTo: string
}[] = [
  {
    code: 'building_typology',
    name: '建造物の類型',
    appliesTo: '国宝・重要文化財（建造物）の種別2',
  },
  {
    code: 'registered_building_use',
    name: '登録建造物の用途',
    appliesTo: '登録有形文化財(建造物)の種別1',
  },
  {
    code: 'registered_building_structure',
    name: '登録建造物の構造種別',
    appliesTo: '登録有形文化財(建造物)の種別2',
  },
  {
    code: 'art_craft_field',
    name: '美術工芸品の分野',
    appliesTo: '国宝・重要文化財（美術工芸品）および登録有形文化財（美術工芸品）の種別2・種別1',
  },
  {
    code: 'registered_art_field',
    name: '登録美術品の分野',
    appliesTo: '登録美術品の種別1',
  },
  {
    code: 'folk_tangible_use',
    name: '有形民俗文化財の用途',
    appliesTo: '重要有形民俗文化財・登録有形民俗文化財の種別1',
  },
  {
    code: 'folk_intangible_major',
    name: '無形民俗文化財の大分類',
    appliesTo: '無形民俗文化財系の種別1',
  },
  {
    code: 'folk_intangible_minor',
    name: '無形民俗文化財の中分類',
    appliesTo: '無形民俗文化財系の種別2',
  },
  {
    code: 'intangible_major',
    name: '無形文化財の大分類',
    appliesTo: '無形文化財系の種別1',
  },
  {
    code: 'intangible_minor',
    name: '無形文化財の中分類',
    appliesTo: '無形文化財系の種別2',
  },
  {
    code: 'conservation_technique_kind',
    name: '選定保存技術の区分',
    appliesTo: '選定保存技術の種別1',
  },
  {
    code: 'ipds_town_type',
    name: '伝統的建造物群の町の類型',
    appliesTo: '重要伝統的建造物群保存地区の種別1・種別2（順不同・多値）',
  },
]

export const PREFECTURES: readonly string[] = [
  '北海道',
  '青森県',
  '岩手県',
  '宮城県',
  '秋田県',
  '山形県',
  '福島県',
  '茨城県',
  '栃木県',
  '群馬県',
  '埼玉県',
  '千葉県',
  '東京都',
  '神奈川県',
  '新潟県',
  '富山県',
  '石川県',
  '福井県',
  '山梨県',
  '長野県',
  '岐阜県',
  '静岡県',
  '愛知県',
  '三重県',
  '滋賀県',
  '京都府',
  '大阪府',
  '兵庫県',
  '奈良県',
  '和歌山県',
  '鳥取県',
  '島根県',
  '岡山県',
  '広島県',
  '山口県',
  '徳島県',
  '香川県',
  '愛媛県',
  '高知県',
  '福岡県',
  '佐賀県',
  '長崎県',
  '熊本県',
  '大分県',
  '宮崎県',
  '鹿児島県',
  '沖縄県',
]
