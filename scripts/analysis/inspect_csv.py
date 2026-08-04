"""data/のCSVの構造と品質を調査し、結果をMarkdownで出力する。

    python3 scripts/analysis/inspect_csv.py [出力先.md]
"""

from __future__ import annotations

import csv
import re
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[2] / "data"

REGION_COLUMN_INDEX = 11

DATE_COLUMNS = ("重文指定年月日", "国宝指定年月日")


def load(path: Path) -> tuple[list[str], list[list[str]]]:
    with path.open(encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))
    if not rows:
        return [], []
    return rows[0], [r for r in rows[1:] if any(cell.strip() for cell in r)]


def parse_date(value: str) -> date | None:
    if not re.fullmatch(r"\d{8}", value):
        return None
    try:
        return date(int(value[:4]), int(value[4:6]), int(value[6:8]))
    except ValueError:
        return None


def main() -> int:
    files = sorted(DATA_DIR.glob("*.csv"))
    if not files:
        print(f"CSV が見つかりません: {DATA_DIR}", file=sys.stderr)
        return 1

    out: list[str] = []

    def w(line: str = "") -> None:
        out.append(line)

    w("## 1. スキーマ")
    w()
    header_groups: dict[tuple[str, ...], list[str]] = defaultdict(list)
    data: dict[str, tuple[list[str], list[list[str]]]] = {}
    for path in files:
        header, rows = load(path)
        data[path.name] = (header, rows)
        header_groups[tuple(header)].append(path.name)

    w(f"- ファイル数: {len(files)}")
    w(f"- 列数: {sorted({len(h) for h, _ in data.values()})}")
    w(f"- ヘッダーのバリエーション: {len(header_groups)} 種類")
    w()
    for header, names in sorted(header_groups.items(), key=lambda kv: -len(kv[1])):
        w(f"  - 12列目 `{header[REGION_COLUMN_INDEX]}` … {len(names)} ファイル")
    w()

    normalized = {tuple(h[:REGION_COLUMN_INDEX] + h[REGION_COLUMN_INDEX + 1 :]) for h, _ in data.values()}
    w(f"- 12列目を除いた列名は{'完全に一致' if len(normalized) == 1 else '不一致あり'}")
    w()

    w("## 2. 件数")
    w()
    total = sum(len(rows) for _, rows in data.values())
    w(f"- 全ファイル合計（行ベース）: {total:,} 行")
    w()
    w("| ファイル | 行数 |")
    w("| --- | ---: |")
    for path in files:
        w(f"| {path.name} | {len(data[path.name][1]):,} |")
    w()

    w("## 3. 主キー候補と重複")
    w()
    header = next(iter(data.values()))[0]
    idx = {name: i for i, name in enumerate(header)}
    LEDGER, TARGET, NAME, UNIT = (
        idx["台帳ID"],
        idx["管理対象ID"],
        idx["名称"],
        idx["棟名"],
    )

    global_pairs: dict[tuple[str, str], list[str]] = defaultdict(list)
    w("| ファイル | 行数 | (台帳ID,管理対象ID) ユニーク | +棟名 ユニーク | 完全重複行 |")
    w("| --- | ---: | ---: | ---: | ---: |")
    for path in files:
        _, rows = data[path.name]
        pair = Counter((r[LEDGER], r[TARGET]) for r in rows)
        triple = Counter((r[LEDGER], r[TARGET], r[UNIT]) for r in rows)
        exact = Counter(tuple(r) for r in rows)
        for k in pair:
            global_pairs[k].append(path.name)
        dup_exact = sum(c - 1 for c in exact.values() if c > 1)
        w(f"| {path.name} | {len(rows):,} | {len(pair):,} | {len(triple):,} | {dup_exact} |")
    w()

    cross = {k: v for k, v in global_pairs.items() if len(set(v)) > 1}
    w(f"- 複数ファイルに跨って同一の (台帳ID, 管理対象ID) を持つ組: **{len(cross):,} 件**")
    if cross:
        combos = Counter(tuple(sorted(set(v))) for v in cross.values())
        w()
        w("| 跨っているファイルの組み合わせ | 件数 |")
        w("| --- | ---: |")
        for combo, n in combos.most_common(15):
            w(f"| {' + '.join(combo)} | {n:,} |")
    w()

    w("## 4. 管理対象ID / 台帳ID の表記")
    w()
    padded = Counter()
    id_by_ledger: dict[str, set[str]] = defaultdict(set)
    for path in files:
        _, rows = data[path.name]
        for r in rows:
            tid = r[TARGET]
            padded["ゼロ埋め" if tid.startswith("0") else "ゼロ埋めなし"] += 1
            id_by_ledger[r[LEDGER]].add(tid)
    w(f"- 管理対象IDの表記: {dict(padded)}")

    collisions = 0
    collision_samples: list[str] = []
    for ledger, ids in id_by_ledger.items():
        norm: dict[str, list[str]] = defaultdict(list)
        for i in ids:
            norm[i.lstrip("0") or "0"].append(i)
        for key, variants in norm.items():
            if len(variants) > 1:
                collisions += 1
                if len(collision_samples) < 5:
                    collision_samples.append(f"台帳ID={ledger}: {sorted(variants)}")
    w(f"- ゼロ埋めを除去したときに同一台帳ID内で衝突する管理対象ID: **{collisions} 件**")
    for s in collision_samples:
        w(f"  - {s}")
    w()
    w(f"- 台帳IDの一覧: {sorted(id_by_ledger)}")
    w()

    w("## 5. 欠損値（空文字）の割合")
    w()
    w("| 列 | 空の件数 | 割合 |")
    w("| --- | ---: | ---: |")
    missing = Counter()
    for path in files:
        _, rows = data[path.name]
        for r in rows:
            for i, cell in enumerate(r):
                if not cell.strip():
                    missing[i] += 1
    for i, name in enumerate(header):
        label = "地域系（列12）" if i == REGION_COLUMN_INDEX else name
        n = missing[i]
        w(f"| {label} | {n:,} | {n / total:.1%} |")
    w()

    w("## 6. 指定年月日の妥当性")
    w()
    for col in DATE_COLUMNS:
        ci = idx[col]
        empty = bad = ok = 0
        oldest: date | None = None
        newest: date | None = None
        bad_samples: list[str] = []
        for path in files:
            _, rows = data[path.name]
            for r in rows:
                v = r[ci].strip()
                if not v:
                    empty += 1
                    continue
                d = parse_date(v)
                if d is None:
                    bad += 1
                    if len(bad_samples) < 5:
                        bad_samples.append(f"{path.name}: {v!r}")
                else:
                    ok += 1
                    oldest = d if oldest is None or d < oldest else oldest
                    newest = d if newest is None or d > newest else newest
        w(f"- **{col}**: 有効 {ok:,} / 空 {empty:,} / 不正 {bad:,}")
        w(f"  - 範囲: {oldest} 〜 {newest}")
        for s in bad_samples:
            w(f"  - 不正例: {s}")
    w()

    w("## 7. 緯度経度")
    w()
    LAT, LON = idx["緯度"], idx["経度"]
    both = neither = partial = invalid = 0
    out_of_japan: list[str] = []
    for path in files:
        _, rows = data[path.name]
        for r in rows:
            la, lo = r[LAT].strip(), r[LON].strip()
            if la and lo:
                both += 1
                try:
                    f_la, f_lo = float(la), float(lo)
                except ValueError:
                    invalid += 1
                    continue
                if not (20 <= f_la <= 46 and 122 <= f_lo <= 154) and len(out_of_japan) < 10:
                    out_of_japan.append(f"{path.name}: {r[NAME][:30]} ({f_la}, {f_lo})")
            elif la or lo:
                partial += 1
            else:
                neither += 1
    w(f"- 両方あり: {both:,} ({both / total:.1%})")
    w(f"- 片方のみ: {partial:,}")
    w(f"- 両方なし: {neither:,} ({neither / total:.1%})")
    w(f"- 数値として解釈できない値: {invalid:,}")
    w(f"- 日本の範囲外（緯度20-46 / 経度122-154 の外）: {len(out_of_japan)} 件（最大10件表示）")
    for s in out_of_japan:
        w(f"  - {s}")
    w()

    w("## 8. 分類の語彙")
    w()
    for col in ("文化財種類", "種別1", "種別2", "国", "時代"):
        ci = idx[col]
        vals = Counter()
        for path in files:
            _, rows = data[path.name]
            for r in rows:
                vals[r[ci].strip()] += 1
        distinct = len([v for v in vals if v])
        w(f"- **{col}**: 異なり数 {distinct:,}（空 {vals.get('', 0):,}）")
        top = [f"{v}({n:,})" for v, n in vals.most_common(8) if v]
        w(f"  - 上位: {', '.join(top)}")
    w()

    w("## 9. 地域列（列12）の値")
    w()
    region_vals = Counter()
    for path in files:
        _, rows = data[path.name]
        for r in rows:
            region_vals[r[REGION_COLUMN_INDEX].strip()] += 1
    w(f"- 異なり数: {len([v for v in region_vals if v]):,}（空 {region_vals.get('', 0):,}）")
    multi = [v for v in region_vals if v and ("、" in v or "," in v)]
    w(f"- 複数地域が1セルに入っている値: {len(multi)} 種")
    for v in multi[:8]:
        w(f"  - {v}")
    w()

    text = "\n".join(out)
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(text + "\n", encoding="utf-8")
        print(f"書き出しました: {sys.argv[1]}")
    else:
        print(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
