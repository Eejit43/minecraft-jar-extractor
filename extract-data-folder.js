import fsExtra from 'fs-extra';
import { basename, join, resolve } from 'path';
import { getMinecraftFiles } from './get-minecraft-files.js';

const { existsSync, lstatSync, mkdirpSync, mkdirSync, readdirSync, readFileSync, rename, writeFileSync } = fsExtra;

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const minecraftVersions = process.argv[2].split(',');
const outputDir = resolve('data');
const versionDir = resolve('version-data');

minecraftVersions.forEach((minecraftVersion) => {
    extract(minecraftVersion, outputDir, versionDir, (err) => {
        if (err) return console.log(err.stack);
        console.log(`Extracted data folder for ${minecraftVersion} to ${outputDir}/${minecraftVersion}`);
    });
});

/**
 * Copies a file from source to target
 * @param {string} source the source file
 * @param {string} target the target file destination
 */
function copyFileSync(source, target) {
    let targetFile = target;

    if (existsSync(target) && lstatSync(target).isDirectory()) targetFile = join(target, basename(source));

    writeFileSync(targetFile, readFileSync(source));
}

/**
 * Recursively copies a folder from source to target
 * @param {string} source the source folder
 * @param {string} target the target folder destination
 */
function copyFolderRecursiveSync(source, target) {
    let files = [];

    const targetFolder = join(target, basename(source));
    if (!existsSync(targetFolder)) {
        mkdirSync(targetFolder);
    }

    if (lstatSync(source).isDirectory()) {
        files = readdirSync(source);
        files.forEach((file) => {
            const curSource = join(source, file);
            if (lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, targetFolder);
            } else {
                copyFileSync(curSource, targetFolder);
            }
        });
    }
}

/**
 * Extracts the data folder for a given version
 * @param {number} minecraftVersion the Minecraft version to extract
 * @param {string} outputDir the output directory
 * @param {string} temporaryDir the temporary directory
 * @param {Function} callback the callback function
 */
function extract(minecraftVersion, outputDir, temporaryDir, callback) {
    getMinecraftFiles(minecraftVersion, temporaryDir, (err, unzippedFilesDir) => {
        if (err) return callback(err);
        mkdirpSync(outputDir);
        copyFolderRecursiveSync(join(unzippedFilesDir, 'data', 'minecraft'), outputDir);
        rename(join(outputDir, 'minecraft'), join(outputDir, minecraftVersion));

        callback();
    });
}
