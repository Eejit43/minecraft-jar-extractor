import deepEqual from 'deep-equal';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { getPotentialDrops } from './prismarine-loottable.js'; // cSpell:disable-line

/**
 * Removes the `minecraft` namespace from a string
 * @param {string} name the string to remove the namespace from
 * @returns {string} the string without the namespace
 */
function removeNamespace(name) {
    if (name.startsWith('minecraft:')) name = name.substring(10);
    return name;
}

/**
 * Extracts block loot data
 * @param {Array} lootData the loot data
 * @param {object} lootTable the loot table
 * @param {string} name the name of the block
 */
function extractBlockTable(lootData, lootTable, name) {
    const obj = {};
    obj.block = removeNamespace(name);
    extractTable(obj, lootTable);
    lootData.push(obj);
}

/**
 * Extracts entity loot data
 * @param {Array} lootData the loot data
 * @param {object} lootTable the loot table
 * @param {string} name the name of the entity
 */
function extractEntityTable(lootData, lootTable, name) {
    const obj = {};
    obj.entity = removeNamespace(name);
    extractTable(obj, lootTable);
    lootData.push(obj);
}

/**
 * Removes duplicates from a list of drops
 * @param {Array} list the list to remove duplicates from
 */
function removeDuplicates(list) {
    for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
            if (deepEqual(list[i], list[j])) {
                list.splice(j, 1);
                removeDuplicates(list);
                return;
            }
        }
    }
}

/**
 * Extracts loot tables and inserts into an object
 * @param {object} object the object to insert drops into
 * @param {object} lootTable the loot table
 */
function extractTable(object, lootTable) {
    const drops = getPotentialDrops(lootTable);

    object.drops = [];
    for (const drop of drops) {
        const dropInfo = {};
        object.drops.push(dropInfo);

        dropInfo.item = removeNamespace(drop.itemType);
        dropInfo.dropChance = drop.estimateDropChance();
        dropInfo.stackSizeRange = drop.getStackSizeRange();

        if (object.block !== undefined) {
            dropInfo.silkTouch = drop.requiresSilkTouch() || undefined;
            dropInfo.noSilkTouch = drop.requiresNoSilkTouch() || undefined;
            dropInfo.blockAge = drop.getRequiredBlockAge() || undefined;
        } else {
            dropInfo.playerKill = drop.requiresPlayerKill() || undefined;
        }
    }

    removeDuplicates(object.drops);
}

/**
 * Generates loot tables from a folder
 * @param {string} inputDir the input directory
 * @param {string} outputFile the output file
 * @param {Function} handlerFunction the function to handle the loot table
 * @returns {number} the number of entries processed
 */
function generate(inputDir, outputFile, handlerFunction) {
    const lootData = [];

    const lootFiles = readdirSync(inputDir);
    for (const loot of lootFiles) {
        const fullPath = join(inputDir, loot);
        if (statSync(fullPath).isDirectory()) continue;

        const name = loot.substring(0, loot.length - 5);
        handlerFunction(lootData, JSON.parse(readFileSync(fullPath, 'utf-8')), name);
    }

    writeFileSync(outputFile, JSON.stringify(lootData, null, 2));
    return lootFiles.length;
}

/**
 * Handles the loot tables
 * @param {string} dataFolder the folder with loot tables
 * @param {string} mcDataFolder the folder with mc data
 * @param {string} version the Minecraft version
 */
function handle(dataFolder, mcDataFolder, version) {
    dataFolder += '/' + version;

    const raw = resolve(dataFolder + '/loot_tables');
    const dataPath = resolve(`${mcDataFolder}/${version}`);
    mkdirSync(dataPath, { recursive: true });

    let entryCount = 0;
    entryCount += generate(join(raw, 'blocks'), join(dataPath, 'blockLoot.json'), extractBlockTable);
    entryCount += generate(join(raw, 'entities'), join(dataPath, 'entityLoot.json'), extractEntityTable);

    console.log(`Version ${version} finished (${entryCount} entries processed)`);
}

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const versions = process.argv[2].split(',');
const dataFolder = resolve('data');
const mcDataFolder = resolve('loot-tables');

for (const version of versions) handle(dataFolder, mcDataFolder, version);
