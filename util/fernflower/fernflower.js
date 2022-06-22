import { join } from 'path';
import { spawn } from 'child_process';
import { mkdirSync } from 'fs';
import { promisify } from 'util';
import extractZip from 'extract-zip';

const extract = promisify(extractZip);

/**
 * Runs the fernflower decompiler on the given file
 * @param {string} inputDir the input directory
 * @param {string} outputDir the output directory
 * @param {boolean} showProgress whether or not to show progress
 * @returns {Promise<void>} a promise that resolves when the fernflower process is complete
 */
function runFernflower(inputDir, outputDir, showProgress) {
    const fernflowerProcess = spawn('java', ['-jar', join(__dirname, 'fernflower.jar'), inputDir, outputDir], { stdio: 'pipe' });

    let buffer = '';

    ['stdout', 'stderr'].forEach((stream) => {
        fernflowerProcess[stream].setEncoding('utf-8');

        fernflowerProcess[stream].on('data', (data) => {
            buffer += data;
            const lines = buffer.split('\n');
            const len = lines.length - 1;
            for (let i = 0; i < len; ++i) if (showProgress) console.log(lines[i]);

            buffer = lines[lines.length - 1];
        });
    });

    return new Promise((resolve) => fernflowerProcess.on('exit', resolve()));
}

/**
 * Decompiles the given version of Minecraft
 * @param {string} inputJar the input jar file
 * @param {string} outputDir the output directory
 * @param {boolean} showProgress whether or not to show progress
 * @returns {Promise} a promise that resolves when the decompilation is complete
 */
export default function (inputJar, outputDir, showProgress) {
    const compiledDir = join(outputDir, 'compiled');
    const decompiledDir = join(outputDir, 'decompiled');
    mkdirSync(compiledDir, { recursive: true });
    mkdirSync(decompiledDir, { recursive: true });

    extract(inputJar, { dir: compiledDir });
    return runFernflower(compiledDir, decompiledDir, showProgress);
}
