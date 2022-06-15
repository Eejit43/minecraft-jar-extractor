const fs = require('fs');
const path = require('path');
const extractDataFromMC = require('./extract-data-from-minecraft');

/**
 * Adds/fixes state information to blocks.json
 * @param {string} inFile path to the blocks.json
 */

async function handle(version, outPath) {
    const blockFile = path.resolve(outPath);
    const blocks = require(blockFile);
    await extractDataFromMC(version);
    const data = require('./minecraft-extracted-data/minecraft-generated-blocks.json');

    if (!data) {
        console.log('No api for ' + version);
        return;
    }
    for (const block of blocks) {
        const apiBlock = data['minecraft:' + block.name];
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
                if (type === 'enum') {
                    state.values = values;
                }
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
        block.drops = block.drops.filter((x) => x !== null);
    }

    fs.writeFileSync(blockFile, JSON.stringify(blocks, null, 2));
    await fs.promises.rm(path.join('minecraft-extracted-data', 'minecraft-generated-blocks.json'));
}

if (!process.argv[2] || !process.argv[3]) {
    console.log('Usage: patch-states.js <version> <inFile>');
    process.exit(1);
}

handle(process.argv[2], process.argv[3]);
