.DEFAULT_GOAL := help

D1_STATE := .wrangler/state/v3/d1

help: ## このヘルプを表示する
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

setup: install db ## ローカル環境を構築する

install: ## 依存関係をインストールする
	pnpm install

db: ## ローカル D1 を作り直してデータを投入する
	rm -rf $(D1_STATE)
	pnpm db:migrate:local
	pnpm etl:build
	pnpm etl:apply

migrate: ## ローカル D1 にマイグレーションを適用する
	pnpm db:migrate:local

seed: ## CSV からローカル D1 へデータを投入する
	pnpm etl:build
	pnpm etl:apply

dev: ## 開発サーバーを起動する
	pnpm dev

check: ## 整形・Lint・型・OpenAPI・テスト・ビルドを検証する
	pnpm check

.PHONY: help setup install db migrate seed dev check
