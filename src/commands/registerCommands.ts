import { Plugin } from 'obsidian';

export function registerCommands(
	plugin: Plugin,
	openSearchModal: () => void,
): void {
	plugin.addCommand({
		id: 'search-stock',
		name: 'Search stock',
		callback: openSearchModal,
	});
}
