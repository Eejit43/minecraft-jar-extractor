import fsExtra from 'fs-extra';
import { resolve } from 'path';
import { getMinecraftFiles } from './util/get-minecraft-files.js';

const { copySync, existsSync, mkdirpSync, readFileSync, writeFileSync } = fsExtra;

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const versions = process.argv[2].split(',');

versions.forEach(async (version) => {
    const outputDir = resolve(`lang/${version}`);
    const versionDataDir = resolve(`version-data/${version}`);

    if (!existsSync(versionDataDir)) await getMinecraftFiles(version, resolve('version-data'));

    mkdirpSync(outputDir);
    copyLang(versionDataDir, outputDir);
    parseLang(outputDir);

    console.log(`Successfully extracted lang files for ${version} to ${outputDir}/${version}`);
});

/**
 * Copies the language files
 * @param {string} unzippedFilesDir the path to the unzipped files directory
 * @param {string} outputDir the path to the output directory
 */
function copyLang(unzippedFilesDir, outputDir) {
    try {
        copySync(unzippedFilesDir + '/assets/minecraft/lang/en_US.lang', outputDir + '/en_us.lang');
    } catch (err) {
        try {
            copySync(unzippedFilesDir + '/assets/minecraft/lang/en_us.lang', outputDir + '/en_us.lang');
        } catch (err) {
            copySync(unzippedFilesDir + '/assets/minecraft/lang/en_us.json', outputDir + '/en_us.json');
        }
    }
}

/**
 * Parses the language files
 * @param {string} outputDir the path to the output directory
 */
function parseLang(outputDir) {
    if (existsSync(outputDir + '/en_us.json')) return;

    const lang = {};
    readFileSync(outputDir + '/en_us.lang', 'utf8')
        .split('\n')
        .forEach((l) => {
            const c = l.split(/=(.+)/);
            if (c.length === 3) lang[c[0]] = c[1];
        });

    writeFileSync(outputDir + '/en_us.json', JSON.stringify(lang, null, 2));
}
