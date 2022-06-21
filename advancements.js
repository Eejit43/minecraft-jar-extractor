import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { getMinecraftFiles } from './util/get-minecraft-files.js';

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const versions = process.argv[2].split(',');

versions.forEach(async (version) => {
    const outputDir = resolve(`advancements/${version}`);
    const versionDataDir = resolve(`version-data/${version}`);

    if (!existsSync(versionDataDir)) await getMinecraftFiles(version, resolve('version-data'));

    mkdirSync(outputDir, { recursive: true });
    copyLang(versionDataDir, outputDir);
    parseLang(outputDir);
    createAdvancements(outputDir);

    console.log(`Successfully extracted advancement file for ${version} to ${outputDir}`);
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
    readFileSync(outputDir + '/en_us.lang', 'utf8')
        .split('\n')
        .forEach((line) => {
            const c = line.split(/=(.+)/);
            if (c.length === 3) lang[c[0]] = c[1];
        });
    writeFileSync(outputDir + '/en_us.json', JSON.stringify(lang, null, 2));
}

/**
 * Parses the language file into an advancements file
 * @param {string} outputDir the path to the output directory
 */
function createAdvancements(outputDir) {
    const advancements = [];
    const lang = JSON.parse(readFileSync(outputDir + '/en_us.json', 'utf8'));
    for (const key in lang) {
        const value = lang[key];
        if (key.startsWith('advancements.')) {
            const advancement = key.split('.').slice(1).join('.');
            if (advancement === 'empty' || advancement === 'sad_label' || advancement.startsWith('toast') || !advancement.endsWith('.title')) continue;

            advancements.push({
                id: advancement.split('.')[1],
                name: value,
                description: lang[`advancements.${advancement.split('.').slice(0, -1).join('.')}.description`] || null,
                category: advancement.split('.')[0],
            });
        }
    }
    writeFileSync(outputDir + '/advancements.json', JSON.stringify(advancements, null, 2));

    rmSync(outputDir + '/en_us.json');
}
