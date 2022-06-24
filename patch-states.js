import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { extractData } from './util/extract-data-from-minecraft.js';

if (process.argv.length < 3) {
    console.log(chalk.red('Must provide a version and JSON file location!'));
    process.exit(1);
} else if (process.argv.length < 4) {
    console.log(chalk.red('Must provide a JSON file location!'));
    process.exit(1);
}

patchStates(process.argv[2], process.argv[3]);

/**
 * Handles the patching of the block loot tables
 * @param {string} version the version to patch
 * @param {string} outPath the path to the output directory
 */
async function patchStates(version, outPath) {
    const blockFile = resolve(outPath);
    const blocks = JSON.parse(readFileSync(blockFile, 'utf-8'));
    const extractedDataDir = resolve(`extracted-data/${version}/reports/blocks.json`);

    if (!existsSync(extractedDataDir)) await extractData(version);

    const extractedData = JSON.parse(readFileSync(extractedDataDir, 'utf-8'));

    for (const block of blocks) {
        const apiBlock = extractedData['minecraft:' + block.name];
        if (!apiBlock) {
            console.log(chalk.yellow(`Missing block in extracted data: ${block.name}`));
            continue;
        }

        // Update states
        block.states = [];
        if (apiBlock.properties) {
            for (const [prop, values] of Object.entries(apiBlock.properties)) {
                let type = 'enum';
                if (values[0] === 'true') type = 'bool';
                if (values[0] === '0') type = 'int';
                const state = {
                    name: prop,
                    type,
                    num_values: values.length, // eslint-disable-line camelcase
                };
                if (type === 'enum') state.values = values;

                block.states.push(state);
            }
        }

        block.minStateId = apiBlock.states[0].id;
        block.maxStateId = apiBlock.states[apiBlock.states.length - 1].id;
        block.defaultState = block.minStateId;
        for (const state of apiBlock.states) {
            if (state.default) {
                block.defaultState = state.id;
                break;
            }
        }
        block.drops = block.drops.filter((drop) => drop !== null);
    }

    writeFileSync(blockFile, JSON.stringify(blocks, null, 2));

    console.log(chalk.green(`Successfully patched states for ${version} in ${blockFile}`));
}
