import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { copyFileSync } from './functions.js';

/**
 * Copies the language files
 * @param {string} unzippedFilesDir the path to the unzipped files directory
 * @param {string} outputDir the path to the output directory
 */
export function copyLang(unzippedFilesDir, outputDir) {
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
 * Parses the language files from `.lang` to `.json` if needed
 * @param {string} outputDir the path to the output directory
 */
export function parseLang(outputDir) {
    if (existsSync(outputDir + '/en_us.json')) return;

    const lang = {};
    readFileSync(outputDir + '/en_us.lang', 'utf-8')
        .split('\n')
        .forEach((line) => {
            const c = line.split(/=(.+)/);
            if (c.length === 3) lang[c[0]] = c[1];
        });

    writeFileSync(outputDir + '/en_us.json', JSON.stringify(lang, null, 2));
    rmSync(outputDir + '/en_us.lang');
}
