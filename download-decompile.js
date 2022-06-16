import fernflower from 'fernflower';
import minecraftWrap from 'minecraft-wrap';
import mkdirp from 'mkdirp';
import { join, resolve } from 'path';
import { promisify } from 'util';
const downloadServer = promisify(minecraftWrap.downloadServer);

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const minecraftVersion = process.argv[2];
const outputDir = resolve('decompiled/' + minecraftVersion);

const jarPath = join(outputDir, minecraftVersion + '.jar');

mkdirp(outputDir)
    .then(() => downloadServer(minecraftVersion, jarPath))
    .then(() => fernflower(jarPath, outputDir, false))
    .then((decompiledDir) => {
        console.log(`Successfully decompiled ${minecraftVersion} to ${decompiledDir}`);
    });
