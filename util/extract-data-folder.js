import { existsSync, mkdirSync, renameSync } from 'fs';
import { join, resolve } from 'path';
import { copyFolderRecursiveSync } from './functions.js';
import { getMinecraftFiles } from './get-minecraft-files.js';

/**
 * Extracts the data folder for a given version
 * @param {string} version the Minecraft version
 */
export default async function (version) {
    const outputDir = resolve('data');
    const versionDataDir = resolve(`version-data/${version}`);

    if (!existsSync(versionDataDir)) await getMinecraftFiles(version);

    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    if (!isNaN(Number(version)) && Number(version) >= 1.13) {
        copyFolderRecursiveSync(join(versionDataDir, 'data', 'minecraft'), outputDir);
        renameSync(join(outputDir, 'minecraft'), join(outputDir, version));
    } else if (!isNaN(Number(version)) && Number(version) < 1.13) {
        copyFolderRecursiveSync(join(versionDataDir, 'assets', 'minecraft', 'advancements'), join(outputDir, version));
        copyFolderRecursiveSync(join(versionDataDir, 'assets', 'minecraft', 'loot_tables'), join(outputDir, version));
        copyFolderRecursiveSync(join(versionDataDir, 'assets', 'minecraft', 'recipes'), join(outputDir, version));
        copyFolderRecursiveSync(join(versionDataDir, 'assets', 'minecraft', 'structures'), join(outputDir, version));
    }

    return console.log(`Successfully extracted data folder for ${version} to ${outputDir}/${version}`);
}
