import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import mcData from 'minecraft-data';
import minecraftWrap from 'minecraft-wrap';
import { join } from 'path';
import { promisify } from 'util';
const downloadServer = promisify(minecraftWrap.downloadServer);

const outputDirectory = 'minecraft-extracted-data';
const rm = (path) => fs.rm(path, { force: true, recursive: true });

/**
 * Extracts the given version of Minecraft
 * @param {string} version the Minecraft version to download
 */
export async function extractData(version) {
    try {
        await fs.mkdir(outputDirectory);
    } catch (e) {} // eslint-disable-line no-empty
    try {
        await rm('server.jar');
    } catch (e) {} // eslint-disable-line no-empty
    await downloadServer(version, join(outputDirectory, 'server.jar'));
    const isNewerThan118 = mcData(version).isNewerOrEqualTo('1.18');
    const cliStartCommand = isNewerThan118 ? `java -DbundlerMainClass=net.minecraft.data.Main -jar ${join(outputDirectory, 'server.jar')}` : `java -cp ${join(outputDirectory, 'server.jar')} net.minecraft.data.Main`; // cSpell:disable-line
    const output = execSync(`${cliStartCommand} --reports`).toString();
    if (!output.includes('All providers took:')) {
        console.log('Server dumping failed, output printed:');
        console.log(output);
    }
    try {
        await fs.rename(join('generated', 'reports', 'blocks.json'), join(outputDirectory, 'minecraft_generated_blocks.json'));
        await rm('generated');
        await rm('libraries');
        await rm('logs');
        await rm(join(outputDirectory, 'server.jar'));
    } catch (e) {} // eslint-disable-line no-empty
}
