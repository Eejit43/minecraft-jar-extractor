import { existsSync, mkdirSync, renameSync } from 'fs';
import { join, resolve } from 'path';
import { copyFolderRecursiveSync } from './functions.js';
import { getMinecraftFiles } from './get-minecraft-files.js';

/**
 * Extracts the data folder for a given version
 * @param {string} minecraftVersion the Minecraft version
 */
export default async function (minecraftVersion) {
    const outputDir = resolve('data');

    await getMinecraftFiles(minecraftVersion);

    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
    copyFolderRecursiveSync(join(resolve('version-data'), minecraftVersion, 'data', 'minecraft'), outputDir);
    renameSync(join(outputDir, 'minecraft'), join(outputDir, minecraftVersion));

    return console.log(`Extracted data folder for ${minecraftVersion} to ${outputDir}/${minecraftVersion}`);
}
