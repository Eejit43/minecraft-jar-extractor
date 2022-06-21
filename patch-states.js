import { readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import extractData from './util/extract-data-from-minecraft.js';

if (process.argv.length < 3) {
    console.log('Must provide a version and JSON file location!');
    process.exit(1);
} else if (process.argv.length < 4) {
    console.log('Must provide a JSON file location!');
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
    await extractData(version);
    const extractedData = JSON.parse(readFileSync(resolve(`extracted-data/${version}/generated-blocks.json`), 'utf-8'));

    if (!extractedData) {
        console.log('No api for ' + version);
        return;
    }
    for (const block of blocks) {
        const apiBlock = extractedData['minecraft:' + block.name];
        if (!apiBlock) {
            console.log('Missing block in api: ' + block.name);
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
    rmSync(join('extracted-data', version), { recursive: true });
    if (readdirSync('extracted-data').length === 0) rmSync('extracted-data', { recursive: true });
}
