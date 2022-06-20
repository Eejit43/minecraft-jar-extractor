import extract from 'extract-zip';
import { mkdirSync } from 'fs';
import minecraftWrap from 'minecraft-wrap';

const { downloadClient } = minecraftWrap;

/**
 * Downloads minecraft files
 * @param {number} minecraftVersion the version of minecraft to download
 * @param {string} versionDataDir the directory to download to
 */
export function getMinecraftFiles(minecraftVersion, versionDataDir) {
    const jarPath = `${versionDataDir}/${minecraftVersion}.jar`;
    const unzippedFilesDir = `${versionDataDir}/${minecraftVersion}`;
    mkdirSync(unzippedFilesDir, { recursive: true });
    return new Promise((resolve) => {
        downloadClient(minecraftVersion, jarPath, async (err) => {
            if (err) throw err;

            await extract(jarPath, { dir: unzippedFilesDir });
            return resolve();
        });
    });
}
