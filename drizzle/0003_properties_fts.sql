CREATE VIRTUAL TABLE `properties_fts` USING fts5(
	`name`,
	`name_kana`,
	`summary_text`,
	`detail_text`,
	content='properties',
	content_rowid='id',
	tokenize='trigram'
);
