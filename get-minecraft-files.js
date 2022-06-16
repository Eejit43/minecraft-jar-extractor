import extract from 'extract-zip';
import fsExtra from 'fs-extra';
import minecraftWrap from 'minecraft-wrap';

const { mkdirpSync } = fsExtra;
const { downloadClient } = minecraftWrap;

/**
 * Downloads minecraft files
 * @param {number} minecraftVersion the version of minecraft to download
 * @param {string} versionDataDir the temporary directory to download to
 * @param {Function} callback the callback function
 */
export function getMinecraftFiles(minecraftVersion, versionDataDir, callback) {
    const jarPath = versionDataDir + '/' + minecraftVersion + '.jar';
    const unzippedFilesDir = versionDataDir + '/' + minecraftVersion;
    mkdirpSync(unzippedFilesDir);
    downloadClient(minecraftVersion, jarPath, async (err) => {
        if (err) return callback(err);
        try {
            await extract(jarPath, { dir: unzippedFilesDir });
            callback(null, unzippedFilesDir);
        } catch (err) {
            callback(err);
        }
    });
}
