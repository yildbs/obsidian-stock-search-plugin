import { constants } from 'node:fs';
import { access, copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const releaseDir = path.join('output', 'obsidian-stock-search-plugin');
const releaseFiles = ['main.js', 'manifest.json', 'styles.css'];

await rm(releaseDir, { force: true, recursive: true });
await mkdir(releaseDir, { recursive: true });

for (const file of releaseFiles) {
	if (!(await fileExists(file))) {
		continue;
	}

	await copyFile(file, path.join(releaseDir, file));
}

console.log(`Copied release files to ${releaseDir}`);

async function fileExists(file) {
	try {
		await access(file, constants.R_OK);
		return true;
	} catch {
		return false;
	}
}
