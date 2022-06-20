import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, join } from 'path';

/**
 * Copies a file from source to target
 * @param {string} source the source file
 * @param {string} target the target file destination
 */
export function copyFileSync(source, target) {
    let targetFile = target;

    if (existsSync(target) && lstatSync(target).isDirectory()) targetFile = join(target, basename(source));

    writeFileSync(targetFile, readFileSync(source));
}

/**
 * Recursively copies a folder from source to target
 * @param {string} source the source folder
 * @param {string} target the target folder destination
 */
export function copyFolderRecursiveSync(source, target) {
    let files = [];

    const targetFolder = join(target, basename(source));

    if (!existsSync(targetFolder)) mkdirSync(targetFolder, { recursive: true });

    if (lstatSync(source).isDirectory()) {
        files = readdirSync(source);
        files.forEach((file) => {
            const curSource = join(source, file);
            if (lstatSync(curSource).isDirectory()) copyFolderRecursiveSync(curSource, targetFolder);
            else copyFileSync(curSource, targetFolder);
        });
    }
}
