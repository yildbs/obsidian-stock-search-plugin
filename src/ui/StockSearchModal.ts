import { App, ButtonComponent, Modal, Notice, Setting } from 'obsidian';
import {
	StockSearchParseError,
	StockSearchProvider,
	StockSearchResult,
} from '../types';

type ApplyStockResult = (result: StockSearchResult) => Promise<boolean>;

export class StockSearchModal extends Modal {
	private readonly provider: StockSearchProvider;
	private readonly applyStockResult: ApplyStockResult;
	private queryInputEl!: HTMLInputElement;
	private statusEl!: HTMLElement;
	private resultsEl!: HTMLElement;
	private searchButton!: ButtonComponent;
	private results: StockSearchResult[] = [];

	constructor(
		app: App,
		provider: StockSearchProvider,
		applyStockResult: ApplyStockResult,
	) {
		super(app);
		this.provider = provider;
		this.applyStockResult = applyStockResult;
	}

	onOpen(): void {
		this.titleEl.setText('주식 종목 검색');
		this.render();
		this.queryInputEl.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		this.contentEl.empty();
		this.contentEl.addClass('stock-search-modal');

		new Setting(this.contentEl)
			.setName('검색어')
			.setDesc('종목명 또는 종목코드를 입력하세요.')
			.addText((text) => {
				text.setPlaceholder('예: 삼성전자 또는 005930');
				this.queryInputEl = text.inputEl;
				this.queryInputEl.addEventListener('keydown', (event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						void this.search();
					}
				});
			})
			.addButton((button) => {
				this.searchButton = button;
				button.setButtonText('검색').setCta().onClick(() => {
					void this.search();
				});
			});

		this.statusEl = this.contentEl.createDiv({
			cls: 'stock-search-status',
		});
		this.resultsEl = this.contentEl.createDiv({
			cls: 'stock-search-results',
		});
	}

	private async search(): Promise<void> {
		const query = this.queryInputEl.value.trim();

		if (!query) {
			this.setStatus('검색어를 입력하세요.');
			this.resultsEl.empty();
			return;
		}

		this.setSearching(true);
		this.setStatus('검색 중입니다...');
		this.resultsEl.empty();

		try {
			this.results = await this.provider.search(query);
			this.renderResults();
		} catch (error) {
			this.results = [];
			this.resultsEl.empty();

			if (error instanceof StockSearchParseError) {
				this.setStatus('네이버 금융 검색 결과를 해석하지 못했습니다.');
				return;
			}

			console.error(error);
			this.setStatus('네이버 금융 검색 요청에 실패했습니다.');
		} finally {
			this.setSearching(false);
		}
	}

	private renderResults(): void {
		this.resultsEl.empty();

		if (this.results.length === 0) {
			this.setStatus('검색 결과가 없습니다.');
			return;
		}

		if (this.results.length === 1) {
			this.setStatus('검색 결과 1개를 찾았습니다. 선택하면 적용됩니다.');
		} else {
			this.setStatus(`검색 결과 ${this.results.length}개를 찾았습니다.`);
		}

		const listEl = this.resultsEl.createEl('ul', {
			cls: 'stock-search-result-list',
		});

		for (const result of this.results) {
			const itemEl = listEl.createEl('li');
			const buttonEl = itemEl.createEl('button', {
				cls: 'stock-search-result-button',
				text: `${result.asset_name} / ${result.symbol} / ${result.market}`,
			});

			buttonEl.addEventListener('click', () => {
				void this.applyResult(result);
			});
		}
	}

	private async applyResult(result: StockSearchResult): Promise<void> {
		const applied = await this.applyStockResult(result);

		if (applied) {
			this.close();
			return;
		}

		new Notice('종목 정보를 입력하지 못했습니다.');
	}

	private setSearching(isSearching: boolean): void {
		this.searchButton.setDisabled(isSearching);
		this.queryInputEl.disabled = isSearching;
	}

	private setStatus(message: string): void {
		this.statusEl.setText(message);
	}
}
