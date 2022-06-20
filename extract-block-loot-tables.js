import { existsSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Gets the item id from an item name
 * @param {object} data the data to get the item id from
 * @param {string} name the name of the item
 * @returns {number} the item id
 */
function getItemId(data, name) {
    for (const prop in data) {
        const item = data[prop];
        if (`minecraft:${item.name}` === name) return item.id;
    }
}

/**
 * Extracts the item drop ids from a loot table
 * @param {object} itemData the item data
 * @param {object} lootTable the loot table
 * @returns {Array} the item drop ids
 */
function extractDropIds(itemData, lootTable) {
    const dropIds = [];

    /**
     * Recursively extracts the item drop ids from a loot table
     * @param {object} object the object to extract from
     */
    function recursiveDropSearch(object) {
        for (const prop in object) {
            const info = object[prop];
            if (typeof info === 'string') {
                const block = getItemId(itemData, info);
                if (block !== undefined && dropIds.indexOf(block) === -1) {
                    dropIds.push(block);
                }

                continue;
            }

            recursiveDropSearch(object[prop]);
        }
    }

    recursiveDropSearch(lootTable);

    return dropIds;
}
/**
 * Adds drops to a blocks.json
 * @param {string} jsonPath path to folder with blocks.json & items.json
 * @param {string} version Minecraft version
 */
async function handle(jsonPath, version) {
    const outPathResolved = resolve(jsonPath);
    const dataFolder = join('data', version, 'loot_tables', 'blocks');

    const blocksFilePath = join(outPathResolved, 'blocks.json');
    const itemDataPath = join(outPathResolved, 'items.json');

    const blockData = await import(blocksFilePath);
    const itemData = await import(itemDataPath);

    for (const prop in blockData) {
        const block = blockData[prop];

        const inputPath = join(dataFolder, block.name + '.json');
        if (!existsSync(inputPath)) {
            block.drops = [];
            continue;
        }

        const lootTable = await import(inputPath); // eslint-disable-line no-await-in-loop
        block.drops = extractDropIds(itemData, lootTable);
    }

    writeFileSync(blocksFilePath, JSON.stringify(blockData, null, 2));
}

if (process.argv.length < 3) {
    console.log('Must provide a version and JSON path!');
    process.exit(1);
}

handle(process.argv[2], process.argv[3]);
