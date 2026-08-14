/**
 * テスト用の最小データ。
 * 国宝への昇格、記念物の複数指定、座標の除外、月精度の日付を再現できる件数だけを持つ。
 */

const STATEMENTS = [
  `INSERT INTO sources (id, name, publisher, url, terms_url, license_note, retrieved_on, processing_note)
   VALUES (1, '国指定文化財等データベース', '文化庁', 'https://kunishitei.bunka.go.jp/bsys/index',
           'https://www.mext.go.jp/b_menu/1351168.htm', '出典記載の上で自由に利用可', '2026-08-04', '加工済み')`,

  `INSERT INTO registers (code, name) VALUES
     ('102', '国宝・重要文化財（建造物）台帳'),
     ('201', '美術工芸品台帳'),
     ('401', '記念物・文化的景観台帳')`,

  `INSERT INTO heritage_types (code, name, group_name) VALUES
     ('national_treasure_and_icp_building', '国宝・重要文化財（建造物）', 'building'),
     ('national_treasure_and_icp_art_craft', '国宝・重要文化財（美術工芸品）', 'art_craft'),
     ('monument', '史跡名勝天然記念物', 'monument')`,

  `INSERT INTO designation_categories (code, name, tier) VALUES
     ('important_cultural_property', '重要文化財', 'designated'),
     ('national_treasure', '国宝', 'designated'),
     ('historic_site', '史跡', 'designated'),
     ('place_of_scenic_beauty', '名勝', 'designated')`,

  `INSERT INTO category_schemes (code, name, applies_to) VALUES
     ('building_typology', '建造物の類型', '国宝・重要文化財（建造物）の種別2'),
     ('art_craft_field', '美術工芸品の分野', '国宝・重要文化財（美術工芸品）の種別2')`,

  `INSERT INTO categories (id, scheme_code, name) VALUES
     (1, 'building_typology', '近世以前／神社'),
     (2, 'art_craft_field', '考古資料')`,

  `INSERT INTO places (id, prefecture, address_text, raw) VALUES
     (1, '青森県', '青森県弘前市百沢', '青森県青森県弘前市百沢'),
     (2, '奈良県', NULL, '奈良県'),
     (3, '宮城県', '大崎市', '宮城県大崎市'),
     (4, '栃木県', '日光市山内', '栃木県日光市山内')`,

  `INSERT INTO actors (id, name) VALUES
     (1, '岩木山神社'),
     (2, '国（文化庁保管）'),
     (3, '東照宮')`,

  `INSERT INTO properties (id, source_id, register_code, target_id, source_target_id, heritage_type_code,
                           name, unit_name, period_text, origin_country, facility_name, location_text,
                           latitude, longitude, coordinate_note) VALUES
     (1, 1, '102', '85', '85', 'national_treasure_and_icp_building', '岩木山神社', '中門', '江戸中期', NULL, NULL, '青森県弘前市百沢', 40.5876, 140.3021, NULL),
     (2, 1, '201', '9986', '9986', 'national_treasure_and_icp_art_craft', '太安萬侶銅板墓誌', NULL, '奈良', '日本', NULL, NULL, NULL, NULL, NULL),
     (3, 1, '401', '185', '185', 'monument', '旧有備館および庭園', NULL, NULL, NULL, NULL, '大崎市', 38.7211, 140.9812, NULL),
     (4, 1, '102', '308', '308', 'national_treasure_and_icp_building', '東照宮', '御旅所本殿', '江戸前期', NULL, NULL, '栃木県日光市山内', 36.7580, 139.5986, NULL),
     (5, 1, '201', '9987', '0009987', 'national_treasure_and_icp_art_craft', '硬玉製大珠', NULL, '縄文', '日本', NULL, NULL, NULL, NULL, '座標が日本の範囲外のため除外: 20.578136, 154.32952751')`,

  `INSERT INTO designations (property_id, category_code, designated_on, date_precision, source_date) VALUES
     (1, 'important_cultural_property', '1936-09-18', 'day', '19360918'),
     (2, 'important_cultural_property', '1981-06-09', 'day', '19810609'),
     (2, 'national_treasure', '2025-09-26', 'day', '20250926'),
     (3, 'historic_site', '1933-02-28', 'day', '19330228'),
     (3, 'place_of_scenic_beauty', '1933-02-28', 'day', '19330228'),
     (4, 'important_cultural_property', '1908-04-23', 'day', '19080423'),
     (5, 'important_cultural_property', '1960-03-01', 'month', '19600300')`,

  `INSERT INTO property_categories (property_id, category_id) VALUES
     (1, 1), (2, 2), (4, 1), (5, 2)`,

  `INSERT INTO property_places (property_id, place_id, role) VALUES
     (1, 1, 'location'),
     (2, 2, 'owner_address'),
     (3, 3, 'location'),
     (4, 4, 'location')`,

  `INSERT INTO property_actors (property_id, actor_id, role) VALUES
     (1, 1, 'owner'),
     (2, 2, 'owner'),
     (4, 3, 'owner')`,

  `UPDATE properties SET name_kana = 'いわきやまじんじゃ', quantity_text = '1棟',
     era_text = '寛文7', year_text = '1667', year_from = 1667, year_to = 1667,
     summary_text = '津軽の総鎮守として知られる神社', detail_text = '桜門は寛文年間の造営で、藤原氏の影響を受けた意匠を持つ',
     has_photo = 1, has_attachment = 0, designation_number = '00123', detail_retrieved_on = '2026-08-14'
     WHERE id = 1`,
  `UPDATE properties SET name_kana = 'おおのやすまろどうばんぼし', quantity_text = '1枚',
     year_text = '19世紀半ば', has_photo = 0, has_attachment = 0, detail_retrieved_on = '2026-08-14'
     WHERE id = 2`,
  `UPDATE properties SET name_kana = 'きゅうゆうびかんおよびていえん', area_text = '12.5 ha',
     area_hectares = 12.5, summary_text = '仙台藩の学問所と庭園', has_photo = 1,
     notification_number = '270', added_on = '1935-06-07', detail_retrieved_on = '2026-08-14'
     WHERE id = 3`,

  `INSERT INTO detail_fields (code, name, applies_to, display_order) VALUES
     ('structure', '構造及び形式等', '建造物', 20),
     ('author', '作者', '美術工芸品', 50)`,

  `INSERT INTO property_details (property_id, field_code, value) VALUES
     (1, 'structure', '桁行三間、梁間二間、一重、入母屋造'),
     (2, 'author', '太安萬侶')`,

  `INSERT INTO designation_criteria (id, kind, text) VALUES
     (1, 'designation', '(一）意匠的に優秀なもの'),
     (2, 'designation', '一．貝塚、集落跡、古墳その他この類の遺跡')`,

  `INSERT INTO property_designation_criteria (property_id, criterion_id, slot) VALUES
     (1, 1, 1),
     (3, 2, 1)`,

  `INSERT INTO property_attachments (id, property_id, name, quantity_text, ordinal) VALUES
     (1, 1, '棟札', '2枚', 1),
     (2, 1, '旧組高欄', '6組', 2)`,

  `INSERT INTO actors (id, name, name_kana) VALUES (4, '岩木山神社保存会', 'いわきやまじんじゃほぞんかい')`,

  `INSERT INTO property_holders (id, property_id, kind, actor_id, certified_on, date_precision, certification_round, ordinal) VALUES
     (1, 1, 'group', 4, '1993-04-15', 'day', NULL, 1),
     (2, 1, 'individual', NULL, '2002-07-08', 'day', '第3次', 2)`,

  `INSERT INTO change_types (id, name) VALUES (1, '追加指定'), (2, '名称変更')`,

  `INSERT INTO property_changes (id, property_id, changed_on, date_precision, source_date, content, ordinal) VALUES
     (1, 3, '1935-06-07', 'day', '1935.06.07(昭和10.06.07)', NULL, 1)`,

  `INSERT INTO property_change_types (change_id, type_id) VALUES (1, 1), (1, 2)`,

  `INSERT INTO properties_fts(properties_fts) VALUES('rebuild')`,
]

export const FIXTURE_COUNTS = {
  properties: 5,
  registers: 3,
  heritageTypes: 3,
  designationCategories: 4,
  categorySchemes: 2,
  categories: 2,
  prefectures: 3,
  designationCriteria: 2,
  detailFields: 2,
} as const

export async function seed(db: D1Database): Promise<void> {
  await db.batch(STATEMENTS.map((sql) => db.prepare(sql)))
}
