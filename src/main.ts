import { Plugin } from 'obsidian';
import { registerCommands } from './commands/registerCommands';
import { updateStockFrontmatter } from './frontmatter/updateStockFrontmatter';
import { NaverKrStockSearchProvider } from './providers/naver/NaverKrStockSearchProvider';
import { StockSearchModal } from './ui/StockSearchModal';

export default class StockSearchPlugin extends Plugin {
	async onload() {
		const provider = new NaverKrStockSearchProvider();
		const openSearchModal = () => {
			new StockSearchModal(
				this.app,
				provider,
				async (result) => updateStockFrontmatter(this.app, result),
			).open();
		};

		this.addRibbonIcon('search', 'Search stock', openSearchModal);
		registerCommands(this, openSearchModal);
	}

	onunload() {}
}
