export type AssetClass = string;
export type Market = string;
export type StockSearchSource = string;

export interface StockSearchResult {
	asset_class: AssetClass;
	asset_name: string;
	symbol: string;
	market: Market;
	source: StockSearchSource;
}

export interface StockSearchProvider {
	assetClass: AssetClass;
	search(query: string): Promise<StockSearchResult[]>;
}

export class StockSearchParseError extends Error {
	constructor(message = 'Unable to parse stock search results.') {
		super(message);
		this.name = 'StockSearchParseError';
	}
}
