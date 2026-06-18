import { StockSearchParseError, StockSearchResult } from '../../types';

const NAVER_ITEM_CODE_PATTERN = /[?&]code=(\d{6})/;
const KOSPI_PATTERN = /\bKOSPI\b|ico_KOSPI|코스피/i;
const KOSDAQ_PATTERN = /\bKOSDAQ\b|ico_KOSDAQ|코스닥/i;

interface ParsedNaverSearchResult {
	asset_name: string;
	symbol: string;
	market?: 'KOSPI' | 'KOSDAQ';
}

export function parseNaverFinanceSearchResults(
	html: string,
): ParsedNaverSearchResult[] {
	const document = new DOMParser().parseFromString(html, 'text/html');
	const anchors = Array.from(
		document.querySelectorAll<HTMLAnchorElement>(
			'a[href*="item/main.naver"], a[href*="item/sise.naver"]',
		),
	);
	const results: ParsedNaverSearchResult[] = [];
	const seenSymbols = new Set<string>();

	for (const anchor of anchors) {
		const symbol = extractSymbol(anchor.href);
		const assetName = normalizeText(anchor.textContent ?? '');

		if (!symbol || !assetName || seenSymbols.has(symbol)) {
			continue;
		}

		seenSymbols.add(symbol);
		const rowEl = anchor.closest('tr');

		results.push({
			asset_name: assetName,
			symbol,
			market: parseMarketFromText(rowEl?.innerHTML ?? ''),
		});
	}

	if (results.length === 0) {
		const hasEmptyResultMessage =
			html.includes('검색결과가 없습니다') ||
			html.includes('검색 결과가 없습니다');

		if (hasEmptyResultMessage) {
			return [];
		}

		throw new StockSearchParseError();
	}

	return results;
}

export function parseNaverFinanceMarket(
	html: string,
): StockSearchResult['market'] | null {
	const document = new DOMParser().parseFromString(html, 'text/html');
	const bodyText = normalizeText(document.body.textContent ?? html);
	const imageAlts = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
		.map((image) => `${image.alt} ${image.src}`)
		.join(' ');
	const combinedText = `${bodyText} ${imageAlts}`;

	return parseMarketFromText(combinedText) ?? null;
}

function extractSymbol(href: string): string | null {
	return NAVER_ITEM_CODE_PATTERN.exec(href)?.[1] ?? null;
}

function parseMarketFromText(text: string): 'KOSPI' | 'KOSDAQ' | undefined {
	if (KOSDAQ_PATTERN.test(text)) {
		return 'KOSDAQ';
	}

	if (KOSPI_PATTERN.test(text)) {
		return 'KOSPI';
	}

	return undefined;
}

function normalizeText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}
