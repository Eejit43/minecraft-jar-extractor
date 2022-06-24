import chalk from 'chalk';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import minecraftData from 'minecraft-data';
import { join, resolve } from 'path';
import { getMinecraftServerFiles } from './get-minecraft-files.js';

/**
 * Extracts data from the given version of Minecraft
 * @param {string} version the Minecraft version to download
 */
export async function extractData(version) {
    const jarPath = resolve(`server-data/${version}.jar`);
    const outputDirectory = resolve(`extracted-data/${version}`);

    mkdirSync(outputDirectory, { recursive: true });

    if (!existsSync(jarPath)) await getMinecraftServerFiles(version);

    const isNewerThan118 = minecraftData(version).isNewerOrEqualTo('1.18');
    const cliStartCommand = isNewerThan118 ? `java -DbundlerMainClass=net.minecraft.data.Main -jar ${jarPath}` : `java -cp ${jarPath} net.minecraft.data.Main`; // cSpell:disable-line

    console.log(`Starting server for ${version}`);

    const output = execSync(`${cliStartCommand} --output ${outputDirectory} --reports`).toString();

    if (!output.includes('All providers took:')) {
        console.log(chalk.red('Server dumping failed, check output:'));
        console.log(output);
    } else {
        console.log(chalk.blue(`Successfully dumped server files for ${version} to ${outputDirectory}`));
    }

    rmSync(join(outputDirectory, '.cache'), { recursive: true, force: true });
    rmSync('libraries', { recursive: true, force: true });
    rmSync('logs', { recursive: true, force: true });
}
