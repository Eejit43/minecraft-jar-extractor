import chalk from 'chalk';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { getMinecraftFiles } from './util/get-minecraft-files.js';
import { copyLang, parseLang } from './util/lang.js';

if (process.argv.length < 3) {
    console.log(chalk.red('Must provide a version!'));
    process.exit(1);
}

const versions = process.argv[2].split(',');

versions.forEach(async (version) => {
    const outputDir = resolve(`lang/${version}`);
    const versionDataDir = resolve(`version-data/${version}`);

    if (!existsSync(versionDataDir)) await getMinecraftFiles(version);

    mkdirSync(outputDir, { recursive: true });

    copyLang(versionDataDir, outputDir);
    parseLang(outputDir);

    console.log(chalk.green(`Successfully extracted lang file for ${version} to ${outputDir}/en_us.json`));
});
