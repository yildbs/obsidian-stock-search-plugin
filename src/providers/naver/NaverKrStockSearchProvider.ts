import { requestUrl, RequestUrlResponse } from 'obsidian';
import {
	StockSearchParseError,
	StockSearchProvider,
	StockSearchResult,
} from '../../types';
import {
	parseNaverFinanceMarket,
	parseNaverFinanceSearchResults,
} from './naverFinanceParser';

const NAVER_FINANCE_SOURCE = 'NAVER_FINANCE';
const KR_STOCK_ASSET_CLASS = 'KR_STOCK';
const NAVER_SEARCH_URL = 'https://finance.naver.com/search/search.naver';
const NAVER_ITEM_URL = 'https://finance.naver.com/item/main.naver';
const REQUEST_HEADERS = {
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	'User-Agent':
		'Mozilla/5.0 (compatible; Obsidian Stock Search; +https://obsidian.md)',
};

export class NaverKrStockSearchProvider implements StockSearchProvider {
	readonly assetClass = KR_STOCK_ASSET_CLASS;

	async search(query: string): Promise<StockSearchResult[]> {
		const normalizedQuery = query.trim();

		if (!normalizedQuery) {
			return [];
		}

		const searchHtml = await this.fetchText(buildSearchUrl(normalizedQuery));
		const parsedResults = parseNaverFinanceSearchResults(searchHtml);
		const results: StockSearchResult[] = [];

		for (const parsedResult of parsedResults) {
			const market =
				parsedResult.market ??
				(await this.fetchMarketForSymbol(parsedResult.symbol));

			if (!market) {
				continue;
			}

			results.push({
				asset_class: KR_STOCK_ASSET_CLASS,
				asset_name: parsedResult.asset_name,
				symbol: parsedResult.symbol,
				market,
				source: NAVER_FINANCE_SOURCE,
			});
		}

		if (parsedResults.length > 0 && results.length === 0) {
			throw new StockSearchParseError(
				'Unable to detect market for parsed Naver Finance results.',
			);
		}

		return results;
	}

	private async fetchMarketForSymbol(
		symbol: string,
	): Promise<StockSearchResult['market'] | null> {
		const detailHtml = await this.fetchText(buildItemUrl(symbol));
		return parseNaverFinanceMarket(detailHtml);
	}

	private async fetchText(url: string): Promise<string> {
		const response = await requestUrl({
			url,
			method: 'GET',
			headers: REQUEST_HEADERS,
		});

		if (response.status < 200 || response.status >= 300) {
			throw new Error(`Naver Finance request failed: ${response.status}`);
		}

		return decodeNaverFinanceResponse(response);
	}
}

function buildSearchUrl(query: string): string {
	const params = new URLSearchParams({
		query,
		endUrl: '',
		encoding: 'UTF-8',
	});

	return `${NAVER_SEARCH_URL}?${params.toString()}`;
}

function buildItemUrl(symbol: string): string {
	const params = new URLSearchParams({ code: symbol });

	return `${NAVER_ITEM_URL}?${params.toString()}`;
}

function decodeNaverFinanceResponse(response: RequestUrlResponse): string {
	try {
		return new TextDecoder('euc-kr').decode(response.arrayBuffer);
	} catch {
		return response.text;
	}
}
