import { App, MarkdownView, Notice, TFile } from 'obsidian';
import { StockSearchResult } from '../types';

const FRONTMATTER_KEYS = [
	'asset_class',
	'asset_name',
	'symbol',
	'market',
] as const;

export async function updateStockFrontmatter(
	app: App,
	result: StockSearchResult,
): Promise<boolean> {
	const file = getActiveMarkdownFile(app);

	if (!file) {
		new Notice('활성화된 Markdown 노트가 없습니다.');
		return false;
	}

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		const stockFrontmatter = frontmatter as Record<string, unknown>;

		stockFrontmatter.asset_class = result.asset_class;
		stockFrontmatter.asset_name = result.asset_name;
		stockFrontmatter.symbol = result.symbol;
		stockFrontmatter.market = result.market;
	});

	new Notice(`${result.asset_name} 종목 정보를 frontmatter에 입력했습니다.`);
	return true;
}

function getActiveMarkdownFile(app: App): TFile | null {
	const markdownView = app.workspace.getActiveViewOfType(MarkdownView);
	const file = markdownView?.file;

	if (!file || file.extension !== 'md') {
		return null;
	}

	return file;
}

export function getStockFrontmatterKeys(): readonly string[] {
	return FRONTMATTER_KEYS;
}
