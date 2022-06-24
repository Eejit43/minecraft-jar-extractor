import chalk from 'chalk';
import extractZip from 'extract-zip';
import { mkdirSync } from 'fs';
import minecraftWrap from 'minecraft-wrap';
import { resolve } from 'path';

const { downloadClient, downloadServer } = minecraftWrap;

/**
 * Downloads the Minecraft client and extracts it
 * @param {string} version the version of Minecraft to download
 */
export function getMinecraftFiles(version) {
    const jarPath = resolve(`version-data/${version}.jar`);
    const unzippedFilesDir = resolve(`version-data/${version}`);
    mkdirSync(unzippedFilesDir, { recursive: true });
    return new Promise((resolve) => {
        downloadClient(version, jarPath, async (err) => {
            if (err) throw err;

            await extractZip(jarPath, { dir: unzippedFilesDir });

            console.log(chalk.blue(`Successfully downloaded client files for ${version} to ${unzippedFilesDir}`));
            return resolve();
        });
    });
}

/**
 * Downloads the Minecraft server and extracts it
 * @param {string} version the version of Minecraft to download
 */
export function getMinecraftServerFiles(version) {
    const jarPath = resolve(`server-data/${version}.jar`);
    const unzippedFilesDir = resolve(`server-data/${version}`);
    mkdirSync(unzippedFilesDir, { recursive: true });
    return new Promise((resolve) => {
        downloadServer(version, jarPath, async (err) => {
            if (err) throw err;

            await extractZip(jarPath, { dir: unzippedFilesDir });

            console.log(chalk.blue(`Successfully downloaded server files for ${version} to ${unzippedFilesDir}`));
            return resolve();
        });
    });
}
