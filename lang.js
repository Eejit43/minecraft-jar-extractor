import fsExtra from 'fs-extra';
import { resolve } from 'path';
import { getMinecraftFiles } from './util/get-minecraft-files.js';

const { copySync, existsSync, mkdirpSync, readFileSync, writeFileSync } = fsExtra;

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const minecraftVersions = process.argv[2].split(',');
const outputDir = resolve('lang');
const temporaryDir = resolve('version-data');

minecraftVersions.forEach((minecraftVersion) => {
    extract(minecraftVersion, outputDir + '/' + minecraftVersion, temporaryDir, (err) => {
        if (err) return console.log(err.stack);

        console.log(`Successfully extracted lang files for ${minecraftVersion} to ${outputDir}/${minecraftVersion}`);
    });
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

/**
 * Extracts all language files
 * @param {string} minecraftVersion the Minecraft version
 * @param {string} outputDir the path to the output directory
 * @param {string} temporaryDir the path to the temporary directory
 * @param {Function} callback the callback function
 */
function extract(minecraftVersion, outputDir, temporaryDir, callback) {
    getMinecraftFiles(minecraftVersion, temporaryDir, (err, unzippedFilesDir) => {
        if (err) return callback(err);
        mkdirpSync(outputDir);
        copyLang(unzippedFilesDir, outputDir);
        parseLang(outputDir);
        callback();
    });
}
