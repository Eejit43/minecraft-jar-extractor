import { execSync } from 'child_process';
import { mkdirSync, renameSync, rmSync } from 'fs';
import minecraftData from 'minecraft-data';
import minecraftWrap from 'minecraft-wrap';
import { join } from 'path';
import { promisify } from 'util';
const downloadServer = promisify(minecraftWrap.downloadServer);

/**
 * Extracts the given version of Minecraft
 * @param {string} version the Minecraft version to download
 */
export default async function (version) {
    const outputDirectory = `extracted-data/${version}`;

    mkdirSync(outputDirectory, { recursive: true });
    try {
        rmSync('server.jar');
    } catch (e) {} // eslint-disable-line no-empty
    await downloadServer(version, join(outputDirectory, 'server.jar'));
    const isNewerThan118 = minecraftData(version).isNewerOrEqualTo('1.18');
    const cliStartCommand = isNewerThan118 ? `java -DbundlerMainClass=net.minecraft.data.Main -jar ${join(outputDirectory, 'server.jar')}` : `java -cp ${join(outputDirectory, 'server.jar')} net.minecraft.data.Main`; // cSpell:disable-line
    const output = execSync(`${cliStartCommand} --reports`).toString();
    if (!output.includes('All providers took:')) {
        console.log('Server dumping failed, output printed:');
        console.log(output);
    }
    try {
        renameSync(join('generated', 'reports', 'blocks.json'), join(outputDirectory, 'generated-blocks.json'));
        rmSync('generated', { recursive: true });
        rmSync('libraries', { recursive: true });
        rmSync('logs', { recursive: true });
        rmSync(join(outputDirectory, 'server.jar'), { recursive: true });
    } catch (e) {} // eslint-disable-line no-empty
}
