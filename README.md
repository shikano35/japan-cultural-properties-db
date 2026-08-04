# japan-cultural-properties-db

[国指定文化財等データベース](https://kunishitei.bunka.go.jp/bsys/index)から取得したデータをもとにデータベースを構築し、REST API として提供するプロジェクト。

## 技術スタック

| 領域               | 採用技術                                   |
| ------------------ | ------------------------------------------ |
| 言語               | TypeScript 6                               |
| データベース       | Cloudflare D1 (SQLite)                     |
| ORM                | Drizzle ORM / drizzle-kit                  |
| API フレームワーク | Hono                                       |
| バリデーション     | Valibot (`@hono/valibot-validator`)        |
| 実行環境           | Cloudflare Workers                         |
| Lint / Format      | ESLint (typescript-eslint) / Prettier      |
| テスト             | Vitest + `@cloudflare/vitest-pool-workers` |
| CI/CD              | GitHub Actions                             |
| パッケージ管理     | pnpm                                       |

## セットアップ

### 前提

- Node.js 24 以上（`.node-version` 参照）
- pnpm 10 以上（`corepack enable pnpm` で有効化可）
- Cloudflare アカウント

### 手順

```sh
git clone <this-repo>
cd japan-cultural-properties-db

pnpm install
```

### D1 データベースの作成

`wrangler.jsonc` の `database_id` はプレースホルダのため、各環境で自分のデータベースを作成して差し替える。

```sh
pnpm wrangler login
pnpm wrangler d1 create japan-cultural-properties-db
```

出力された `database_id` を `wrangler.jsonc` の `d1_databases[0].database_id` に設定し、型を再生成する。

```sh
pnpm cf-typegen
```

### 元データ（CSV）

元データは `data/` 配下にリポジトリへ含めている。ファイルの一覧と件数、取得日は `data/data.md` を参照。
更新する場合は[国指定文化財等データベース](https://kunishitei.bunka.go.jp/bsys/index)の各分類の検索結果画面から CSV をダウンロードして差し替える。

## 開発

| コマンド            | 内容                                                       |
| ------------------- | ---------------------------------------------------------- |
| `pnpm dev`          | ローカル開発サーバー（`wrangler dev`）                     |
| `pnpm test`         | Vitest（Workers ランタイム上で実行）                       |
| `pnpm test:watch`   | Vitest ウォッチモード                                      |
| `pnpm lint`         | ESLint                                                     |
| `pnpm lint:fix`     | ESLint 自動修正                                            |
| `pnpm format`       | Prettier 整形                                              |
| `pnpm format:check` | Prettier 差分チェック                                      |
| `pnpm typecheck`    | 型チェック（src / node / test の 3 プロジェクト）          |
| `pnpm build`        | `wrangler deploy --dry-run`（ビルド検証）                  |
| `pnpm check`        | 上記の検証をまとめて実行（コミット前に推奨）               |
| `pnpm cf-typegen`   | `wrangler.jsonc` から `worker-configuration.d.ts` を再生成 |

### データベース操作

| コマンド                 | 内容                                        |
| ------------------------ | ------------------------------------------- |
| `pnpm db:generate`       | スキーマ定義からマイグレーション SQL を生成 |
| `pnpm db:migrate:local`  | ローカル D1 へマイグレーションを適用        |
| `pnpm db:migrate:remote` | リモート（本番）D1 へマイグレーションを適用 |
| `pnpm db:studio`         | Drizzle Studio（`.env` の設定が必要）       |

スキーマ定義は `src/db/schema.ts`、生成されたマイグレーションは `drizzle/` に置かれ、リポジトリにコミットする。

## CI/CD

- **CI**（`.github/workflows/ci.yml`）: `main` への push と全 PR で、format / lint / typecheck / test / build を実行。
- **Deploy**（`.github/workflows/deploy.yml`）: `workflow_dispatch` による手動実行のみ。
  `apply_migrations` を有効にすると、デプロイ前にリモート D1 へマイグレーションを適用する。

デプロイには GitHub リポジトリの Secrets（Settings > Secrets and variables > Actions）に以下が必要。

| Secret                  | 取得方法                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare ダッシュボード > My Profile > API Tokens（`Edit Cloudflare Workers` + `D1 Edit` 権限） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare ダッシュボード > Workers & Pages のアカウント ID                                       |

## ライセンス

Apache-2.0（`LICENSE` 参照）。元データの利用条件は文化庁の[国指定文化財等データベース](https://kunishitei.bunka.go.jp/bsys/index)の規定に従うこと。
