import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import minecraftData from 'minecraft-data';
import { resolve } from 'path';
import { blockMapping, itemMapping } from './mappings.js';
import { copyFolderRecursiveSync } from './util/functions.js';
import { getMinecraftFiles } from './util/get-minecraft-files.js';

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const versions = process.argv[2].split(',');

versions.forEach(async (version) => {
    const outputDir = resolve(`images/${version}`);
    const versionDataDir = resolve(`version-data/${version}`);

    if (!existsSync(versionDataDir)) await getMinecraftFiles(version);

    mkdirSync(outputDir, { recursive: true });

    getItems(versionDataDir, outputDir + '/items_textures.json', itemMapping[version], version);
    getBlocks(versionDataDir, outputDir + '/blocks_textures.json', blockMapping[version], version);
    getModels(versionDataDir, outputDir + '/blocks_states.json', outputDir + '/blocks_models.json', blockMapping[version], version);
    copyTextures(versionDataDir, outputDir);
    generateTextureContent(outputDir);

    console.log(`Successfully generated images for ${version} to ${outputDir}`);
});

/**
 * Extracts the block state from the block states file
 * @param {string} name the block to extract
 * @param {string} path the path to the block states file
 * @param {boolean} [full=false] Whether to return the full block state or just the model
 * @returns {string} The model name
 */
function extractBlockState(name, path, full = false) {
    if (name === null) return null;
    else {
        try {
            name = name.replace(/minecraft:/, '');
            const t = JSON.parse(readFileSync(path + name + '.json', 'utf-8'));
            if (full) return t;
            const firstVariant = t.variants[Object.keys(t.variants)[0]];
            return firstVariant.model || firstVariant[0].model;
        } catch (err) {
            return null;
        }
    }
}

/**
 * Extracts the model from the block states file
 * @param {string} name the block to extract
 * @param {string} path the path to the block states file
 * @param {boolean} [full=false] Whether to return the full block state or just the model
 * @returns {string} The model name
 */
function extractModel(name, path, full = false) {
    if (name === null) return null;
    else {
        try {
            name = name.replace(/^(?:block\/)?minecraft:/, '');
            const t = JSON.parse(readFileSync(path + name + '.json', 'utf-8'));
            if (full) return t;
            if (t.textures) return t.textures[Object.keys(t.textures)[0]];

            if (t.parent) {
                if (t.parent.startsWith('builtin/')) return null;

                return extractModel(t.parent, path);
            }
            return null;
        } catch (err) {
            console.log(err.stack);
            console.log(name);
        }
    }
}

/**
 * Gets the items for the given version
 * @param {string} unzippedFilesDir the path to the unzipped minecraft files
 * @param {string} itemsTexturesPath the path to the items textures file
 * @param {object} itemMapping the item mapping
 * @param {string} version the Minecraft version
 */
function getItems(unzippedFilesDir, itemsTexturesPath, itemMapping, version) {
    const mcData = minecraftData(version);
    const itemTextures = mcData.itemsArray.map((item) => {
        const model = (itemMapping !== undefined && itemMapping[item.name] ? itemMapping[item.name] : item.name).replace(/minecraft:/, '');
        const texture = extractModel('item/' + model, unzippedFilesDir + '/assets/minecraft/models/');
        return {
            name: item.name,
            model: model || null,
            texture: texture || null,
        };
    });
    writeFileSync(itemsTexturesPath, JSON.stringify(itemTextures, null, 2));
}

/**
 * Gets the blocks for the given version
 * @param {string} unzippedFilesDir the path to the unzipped minecraft files
 * @param {string} blocksTexturesPath the path to the blocks textures file
 * @param {object} blockMapping the block mapping
 * @param {string} version the Minecraft version
 */
function getBlocks(unzippedFilesDir, blocksTexturesPath, blockMapping, version) {
    const mcData = minecraftData(version);
    const blockModel = mcData.blocksArray.map((block) => {
        const blockState = (blockMapping !== undefined && blockMapping[block.name] ? blockMapping[block.name] : block.name).replace(/minecraft:/, '');
        const model = extractBlockState(blockState, unzippedFilesDir + '/assets/minecraft/blockstates/');
        const texture = extractModel(!model ? null : model.startsWith('block/') ? model : 'block/' + model, unzippedFilesDir + '/assets/minecraft/models/');
        return {
            name: block.name,
            blockState,
            model: model || null,
            texture: texture || null,
        };
    });
    writeFileSync(blocksTexturesPath, JSON.stringify(blockModel, null, 2));
}

/**
 * Gets the models for the given version
 * @param {string} unzippedFilesDir the path to the unzipped minecraft files
 * @param {string} blocksStatesPath the path to the blocks states file
 * @param {string} blocksModelsPath the path to the blocks models file
 * @param {object} blockMapping the block mapping
 * @param {string} version the Minecraft version
 */
function getModels(unzippedFilesDir, blocksStatesPath, blocksModelsPath, blockMapping, version) {
    const mcData = minecraftData(version);
    const blocksStates = {};
    for (const block of mcData.blocksArray) {
        const blockState = blockMapping !== undefined && blockMapping[block.name] ? blockMapping[block.name] : block.name;
        const state = extractBlockState(blockState, unzippedFilesDir + '/assets/minecraft/blockstates/', true);
        blocksStates[block.name] = state;
    }
    const modelsPath = unzippedFilesDir + '/assets/minecraft/models/block/';
    const modelFiles = readdirSync(modelsPath);
    const models = {};
    for (const name of modelFiles) {
        const model = JSON.parse(readFileSync(modelsPath + name, 'utf-8')); // eslint-disable-line no-await-in-loop
        models[name.split('.')[0]] = model;
    }
    writeFileSync(blocksStatesPath, JSON.stringify(blocksStates, null, 2));
    writeFileSync(blocksModelsPath, JSON.stringify(models, null, 2));
}

/**
 * Copies the textures
 * @param {string} unzippedFilesDir the path to the unzipped minecraft files
 * @param {string} outputDir the path to the output directory
 */
function copyTextures(unzippedFilesDir, outputDir) {
    const textures = unzippedFilesDir + '/assets/minecraft/textures/';
    for (const file of readdirSync(textures)) {
        copyFolderRecursiveSync(textures + file, outputDir);
    }
}

/**
 * Generates the texture content
 * @param {string} outputDir the path to the output directory
 */
function generateTextureContent(outputDir) {
    const allBlocksAndItems = JSON.parse(readFileSync(outputDir + '/items_textures.json', 'utf-8')).concat(JSON.parse(readFileSync(outputDir + '/blocks_textures.json', 'utf-8')));
    const allTextures = allBlocksAndItems.map((item) => ({
        name: item.name,
        texture: item.texture === null ? null : 'data:image/png;base64,' + readFileSync(`${outputDir}/${item.texture.replace(/^minecraft:/, '')}.png`, 'base64'),
    }));
    writeFileSync(outputDir + '/texture_content.json', JSON.stringify(allTextures, null, 2));
}
