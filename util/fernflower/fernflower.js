import { spawn } from 'child_process';
import { resolve } from 'path';

/**
 * Runs the fernflower decompiler on the given file
 * @param {string} inputDir the input directory
 * @param {string} outputDir the output directory
 * @param {boolean} showProgress whether or not to show progress
 * @returns {Promise<void>} a promise that resolves when the fernflower process is complete
 */
export function fernflower(inputDir, outputDir, showProgress) {
    const fernflowerProcess = spawn('java', ['-jar', resolve('util/fernflower/fernflower.jar'), inputDir, outputDir], { stdio: 'pipe' });

    let buffer = '';
    ['stdout', 'stderr'].forEach((stream) => {
        fernflowerProcess[stream].setEncoding('utf-8');

        fernflowerProcess[stream].on('data', (data) => {
            buffer += data;
            const lines = buffer.split('\n');
            if (showProgress) for (const line of lines) console.log(line);

            buffer = lines[lines.length - 1];
        });
    });

    return new Promise((resolve) => {
        fernflowerProcess.on('exit', () => resolve());
    });
}
