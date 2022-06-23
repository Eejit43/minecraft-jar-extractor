import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { getMinecraftFiles } from './util/get-minecraft-files.js';

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const versions = process.argv[2].split(',');

versions.forEach(async (version) => {
    const outputDir = resolve(`lang/${version}`);
    const versionDataDir = resolve(`version-data/${version}`);

    if (!existsSync(versionDataDir)) await getMinecraftFiles(version);

    mkdirSync(outputDir, { recursive: true });
    copyLang(versionDataDir, outputDir);
    parseLang(outputDir);

    console.log(`Successfully extracted lang file for ${version} to ${outputDir}`);
});

/**
 * Copies the language files
 * @param {string} unzippedFilesDir the path to the unzipped files directory
 * @param {string} outputDir the path to the output directory
 */
function copyLang(unzippedFilesDir, outputDir) {
    try {
        copyFileSync(unzippedFilesDir + '/assets/minecraft/lang/en_US.lang', outputDir + '/en_us.lang');
    } catch (err) {
        try {
            copyFileSync(unzippedFilesDir + '/assets/minecraft/lang/en_us.lang', outputDir + '/en_us.lang');
        } catch (err) {
            copyFileSync(unzippedFilesDir + '/assets/minecraft/lang/en_us.json', outputDir + '/en_us.json');
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
    readFileSync(outputDir + '/en_us.lang', 'utf-8')
        .split('\n')
        .forEach((line) => {
            const c = line.split(/=(.+)/);
            if (c.length === 3) lang[c[0]] = c[1];
        });

    writeFileSync(outputDir + '/en_us.json', JSON.stringify(lang, null, 2));
}
