import { existsSync, mkdirSync } from 'fs';
import minecraftWrap from 'minecraft-wrap';
import { resolve } from 'path';
import { promisify } from 'util';
import fernflower from './fernflower/fernflower.js';

const downloadServer = promisify(minecraftWrap.downloadServer);

/**
 * Downloads and decompiles the server
 * @param {string} minecraftVersion the Minecraft version
 */
export default async function (minecraftVersion) {
    const outputDir = resolve('decompiled/' + minecraftVersion);

    const jarPath = resolve(`version-data/${minecraftVersion}.jar`);

    if (!existsSync(`version-data/${minecraftVersion}.jar`)) await downloadServer(minecraftVersion, jarPath);

    mkdirSync(outputDir, { recursive: true });

    const decompiledDir = await fernflower(jarPath, outputDir, false);

    console.log(`Successfully decompiled ${minecraftVersion} to ${decompiledDir}`);
}
