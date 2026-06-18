import { StockSearchParseError, StockSearchResult } from '../../types';

const NAVER_ITEM_CODE_PATTERN = /[?&]code=(\d{6})/;
const NAVER_DIRECT_ITEM_PATTERN =
	/parent\.location\.href\s*=\s*['"]\/item\/main\.naver\?code=(\d{6})['"]/i;
const KOSPI_PATTERN = /\bKOSPI\b|ico_KOSPI|코스피/i;
const KOSDAQ_PATTERN = /\bKOSDAQ\b|ico_KOSDAQ|코스닥/i;

interface ParsedNaverSearchResult {
	asset_name: string;
	symbol: string;
	market?: 'KOSPI' | 'KOSDAQ';
}

interface ParsedNaverItemSummary {
	asset_name: string;
	market: 'KOSPI' | 'KOSDAQ';
}

export function parseNaverFinanceDirectItemSymbol(
	html: string,
): string | null {
	return NAVER_DIRECT_ITEM_PATTERN.exec(html)?.[1] ?? null;
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
	const itemHeaderMarket = parseMarketFromText(getItemHeaderText(document));

	if (itemHeaderMarket) {
		return itemHeaderMarket;
	}

	const bodyText = normalizeText(document.body.textContent ?? html);
	const imageAlts = Array.from(document.querySelectorAll<HTMLImageElement>('img'))
		.map((image) => `${image.alt} ${image.src}`)
		.join(' ');
	const combinedText = `${bodyText} ${imageAlts}`;

	return parseMarketFromText(combinedText) ?? null;
}

export function parseNaverFinanceItemSummary(
	html: string,
): ParsedNaverItemSummary | null {
	const document = new DOMParser().parseFromString(html, 'text/html');
	const assetName = normalizeText(
		document.querySelector('.wrap_company h2 a')?.textContent ?? '',
	);
	const market = parseNaverFinanceMarket(html);

	if (!assetName || !isSupportedKrMarket(market)) {
		return null;
	}

	return {
		asset_name: assetName,
		market,
	};
}

function extractSymbol(href: string): string | null {
	return NAVER_ITEM_CODE_PATTERN.exec(href)?.[1] ?? null;
}

function parseMarketFromText(text: string): 'KOSPI' | 'KOSDAQ' | undefined {
	const hasKosdaq = KOSDAQ_PATTERN.test(text);
	const hasKospi = KOSPI_PATTERN.test(text);

	if (hasKosdaq && !hasKospi) {
		return 'KOSDAQ';
	}

	if (hasKospi && !hasKosdaq) {
		return 'KOSPI';
	}

	return undefined;
}

function getItemHeaderText(document: Document): string {
	const companyHeaderEl = document.querySelector('.wrap_company');

	if (!companyHeaderEl) {
		return '';
	}

	const imageTexts = Array.from(
		companyHeaderEl.querySelectorAll<HTMLImageElement>('img'),
	)
		.map((image) => `${image.alt} ${image.src}`)
		.join(' ');

	return `${companyHeaderEl.textContent ?? ''} ${imageTexts}`;
}

function isSupportedKrMarket(
	market: StockSearchResult['market'] | null,
): market is 'KOSPI' | 'KOSDAQ' {
	return market === 'KOSPI' || market === 'KOSDAQ';
}

function normalizeText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}
