# japan-cultural-properties-db

[国指定文化財等データベース](https://kunishitei.bunka.go.jp/bsys/index)から取得したデータをもとにデータベースを構築し、REST API として提供するプロジェクト。

## 技術スタック

| 領域               | 採用技術                                   |
| ------------------ | ------------------------------------------ |
| 言語               | TypeScript 6                               |
| データベース       | Cloudflare D1 (SQLite)                     |
| ORM                | Drizzle ORM / drizzle-kit                  |
| API フレームワーク | Hono                                       |
| バリデーション     | Valibot                                    |
| API ドキュメント   | hono-openapi / Swagger UI / Scalar         |
| 実行環境           | Cloudflare Workers                         |
| Lint / Format      | ESLint (typescript-eslint) / Prettier      |
| テスト             | Vitest + `@cloudflare/vitest-pool-workers` |
| CI/CD              | GitHub Actions                             |
| パッケージ管理     | pnpm                                       |

## セットアップ

### 前提

- Node.js 24 以上（`.node-version` 参照）
- pnpm 10 以上（`corepack enable pnpm` で有効化可）

ローカルで動かすだけなら Cloudflare アカウントは不要。デプロイする場合のみ「Cloudflare を使う場合の準備」を参照。

### ローカル環境の構築

```sh
git clone <this-repo>
cd japan-cultural-properties-db

make setup
```

`make setup` は依存関係のインストールからローカル D1 の作成、`data/` の CSV 投入までを行う。完了後 `make dev` で API が起動する。

ローカル D1 は CSV から再生成されるため、`make setup` は何度実行しても問題なく、既存のローカル D1 は削除される。

#### make が使えない環境の場合

Windows など `make` が入っていない環境では、同じ内容を pnpm のコマンドで実行できる。下記のコマンドを順に実行する。

```sh
pnpm install
pnpm db:migrate:local
pnpm etl:build
pnpm etl:apply
```

2 回目以降はローカル D1 を先に削除する。

```sh
# PowerShell
Remove-Item -Recurse -Force .wrangler\state\v3\d1

# コマンドプロンプト
rmdir /s /q .wrangler\state\v3\d1
```

### Cloudflare を使う場合の準備

デプロイやリモート D1 の操作を行う場合のみ必要。利用者側で以下を用意する。

1. Cloudflare アカウント
2. `wrangler` でのログイン

   ```sh
   pnpm wrangler login
   ```

3. D1 データベースの作成

   ```sh
   pnpm wrangler d1 create japan-cultural-properties-db
   ```

   `wrangler.jsonc` にコミットされている `database_id` は元の開発環境のものなので、出力された ID で `d1_databases[0].database_id` を置き換える。置き換え後に型を再生成する。

   ```sh
   pnpm cf-typegen
   ```

4. リモート D1 へのマイグレーションとデータ投入

   ```sh
   pnpm db:migrate:remote
   pnpm etl:build
   pnpm etl:apply -- --remote
   ```

5. デプロイ

   ```sh
   pnpm run deploy
   ```

   `deploy` は pnpm 組み込みのコマンドと名前が衝突するため `pnpm run` を付ける。

`.env` は Drizzle Studio を使う場合にのみ必要。設定すると wrangler がアカウントの指定に使うため、値が誤っているとリモート D1 の操作が認可エラーになる。

### 元データ（CSV）

元データは `data/` 配下にリポジトリへ含めている。ファイルの一覧と件数、取得日は `data/data.md` を参照。
更新する場合は[国指定文化財等データベース](https://kunishitei.bunka.go.jp/bsys/index)の各分類の検索結果画面から CSV をダウンロードして差し替える。

## 開発

| コマンド       | 内容                                                  |
| -------------- | ----------------------------------------------------- |
| `make help`    | 利用できるターゲットの一覧                            |
| `make setup`   | 依存関係のインストールとローカル D1 の構築            |
| `make db`      | ローカル D1 を作り直してデータを投入                  |
| `make migrate` | ローカル D1 にマイグレーションを適用                  |
| `make seed`    | CSV からローカル D1 へデータを投入                    |
| `make dev`     | 開発サーバーを起動                                    |
| `make check`   | 整形・Lint・型・OpenAPI・テスト・ビルドをまとめて検証 |

個別の pnpm コマンドは以下。

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

### API

| コマンド                | 内容                          |
| ----------------------- | ----------------------------- |
| `pnpm openapi:generate` | `openapi.json` を生成         |
| `pnpm openapi:check`    | `openapi.json` が最新かを確認 |

`openapi.json` は `src/` のスキーマから生成し、リポジトリにコミットする。ルートを変更したら `pnpm openapi:generate` を実行する。

| エンドポイント                | 内容                   |
| ----------------------------- | ---------------------- |
| `GET /`                       | API の情報と出典       |
| `GET /openapi.json`           | OpenAPI 仕様           |
| `GET /docs`                   | Swagger UI             |
| `GET /reference`              | Scalar                 |
| `GET /properties`             | 文化財の一覧           |
| `GET /properties/:id`         | 文化財の詳細           |
| `GET /registers`              | 台帳                   |
| `GET /heritage-types`         | 文化財種類             |
| `GET /designation-categories` | 指定・登録区分         |
| `GET /category-schemes`       | 分類体系               |
| `GET /categories`             | 分類語彙               |
| `GET /prefectures`            | 所在地の都道府県と件数 |

件数は管理対象（棟・個体）単位。指定単位の件数は元データに識別子がないため提供しない。所在地の絞り込みは都道府県のみ。

### データベース操作

| コマンド                     | 内容                                        |
| ---------------------------- | ------------------------------------------- |
| `pnpm db:generate`           | スキーマ定義からマイグレーション SQL を生成 |
| `pnpm db:migrate:local`      | ローカル D1 へマイグレーションを適用        |
| `pnpm db:migrate:remote`     | リモート（本番）D1 へマイグレーションを適用 |
| `pnpm db:studio`             | Drizzle Studio（`.env` の設定が必要）       |
| `pnpm etl:build`             | CSV から投入用 SQL を `.seed/` に生成       |
| `pnpm etl:apply`             | `.seed/` をローカル D1 へ投入               |
| `pnpm etl:apply -- --remote` | `.seed/` をリモート D1 へ投入               |

スキーマ定義は `src/db/schema.ts`、生成されたマイグレーションは `drizzle/` に置かれ、リポジトリにコミットする。

## CI/CD

- **CI**（`.github/workflows/ci.yml`）: `main` への push と全 PR で、format / lint / typecheck / openapi / test / build を実行。
- **Deploy**（`.github/workflows/deploy.yml`）: `workflow_dispatch` による手動実行のみ。
  `apply_migrations` を有効にすると、デプロイ前にリモート D1 へマイグレーションを適用する。

デプロイには GitHub リポジトリの Secrets（Settings > Secrets and variables > Actions）に以下が必要。

| Secret                  | 取得方法                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Cloudflare ダッシュボード > My Profile > API Tokens（`Edit Cloudflare Workers` + `D1 Edit` 権限） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare ダッシュボード > Workers & Pages のアカウント ID                                       |

## 出典とライセンス

本プロジェクトは文化庁が作成・提供するものではありません。 有志による非公式のデータベース／API です。

### データ

出典: [国指定文化財等データベース](https://kunishitei.bunka.go.jp/bsys/index)（文化庁）2026年8月4日取得

同データベースの文字情報は[文部科学省ウェブサイト利用規約](https://www.mext.go.jp/b_menu/1351168.htm)に基づき、出典記載の上で自由に利用できます。同規約は政府標準利用規約（第2.0版）に準拠し、CC BY 4.0 と互換です。

本プロジェクトでは元データに対し、重複行の除去・識別子の正規化・関係の分割といった加工を行っています。

API のレスポンスにも出典情報を含めています。

### コード

Apache-2.0（`LICENSE` 参照）。このライセンスはコードにのみ適用され、データには適用されません。
