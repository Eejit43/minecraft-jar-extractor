import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import extractDataFolder from './util/extract-data-folder.js';
import { getMinecraftFiles } from './util/get-minecraft-files.js';

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const versions = process.argv[2].split(',');

versions.forEach(async (version) => {
    const outputDir = resolve(`advancements/${version}`);
    const versionDataDir = resolve(`version-data/${version}`);

    if (!existsSync(versionDataDir)) await getMinecraftFiles(version, resolve('version-data'));

    if (!existsSync(resolve(`data/${version}/loot_tables`))) await extractDataFolder(version);

    mkdirSync(outputDir, { recursive: true });
    copyLang(versionDataDir, outputDir);
    parseLang(outputDir);

    createAdvancements(outputDir, version);

    console.log(`Successfully extracted advancement file for ${version} to ${outputDir}`);
});

/**
 * Copies the language files
 * @param {string} unzippedFilesDir the path to the unzipped files directory
 * @param {string} outputDir the path to the output directory
 */
function copyLang(unzippedFilesDir, outputDir) {
    try {
        copyFileSync(unzippedFilesDir + '/assets/minecraft/lang/en_US.lang', outputDir + '/en_us.lang');
    } catch (err) {
        try {
            copyFileSync(unzippedFilesDir + '/assets/minecraft/lang/en_us.lang', outputDir + '/en_us.lang');
        } catch (err) {
            copyFileSync(unzippedFilesDir + '/assets/minecraft/lang/en_us.json', outputDir + '/en_us.json');
        }
    }
}

/**
 * Parses the language files
 * @param {string} outputDir the path to the output directory
 */
function parseLang(outputDir) {
    if (existsSync(outputDir + '/en_us.json')) return;
    const lang = {};
    readFileSync(outputDir + '/en_us.lang', 'utf8')
        .split('\n')
        .forEach((line) => {
            const c = line.split(/=(.+)/);
            if (c.length === 3) lang[c[0]] = c[1];
        });
    writeFileSync(outputDir + '/en_us.json', JSON.stringify(lang, null, 2));
}

/**
 * Parses the language file into an advancements file
 * @param {string} outputDir the path to the output directory
 * @param {string} version the Minecraft version
 */
function createAdvancements(outputDir, version) {
    const advancements = [];
    const lang = JSON.parse(readFileSync(outputDir + '/en_us.json', 'utf8'));
    rmSync(outputDir + '/en_us.json');

    readdirSync(resolve(`version-data/${version}/data/minecraft/advancements`)).forEach((category) => {
        if (category !== 'recipes') {
            readdirSync(resolve(`version-data/${version}/data/minecraft/advancements/${category}`)).forEach((advancement) => {
                advancement = advancement.replace(/.json$/, '');

                const advancementFile = resolve(`version-data/${version}/data/minecraft/advancements/${category}/${advancement}.json`);
                const advancementData = JSON.parse(readFileSync(advancementFile, 'utf8'));

                advancements.push({
                    id: `${category}/${advancement}`,
                    name: advancement,
                    displayName: lang[advancementData.display.title.translate],
                    description: lang[advancementData.display.description.translate],
                    category,
                    type: !advancementData.display.show_toast && !advancementData.display.announce_to_chat ? 'hidden' : advancementData.display.frame,
                    parent: advancementData.parent?.replace(/^minecraft:/, ''),
                    experience: advancementData.rewards?.experience,
                    criteria: Object.keys(advancementData.criteria).reduce((criteria, key) => {
                        const condition = advancementData.criteria[key];
                        criteria[key] = {
                            trigger: condition.trigger,
                            items:
                                condition.conditions.items?.map((item) => {
                                    if (item.items?.length === 1) return item.items[0];
                                    else return item.items;
                                }) ||
                                condition.conditions.item?.items?.map((item) => {
                                    if (item.length === 1) return item[0];
                                    else return item;
                                }) ||
                                (condition.conditions.item?.tag ? `#${condition.conditions.item.tag}` : undefined) ||
                                condition.conditions.damage?.type?.direct_entity?.type ||
                                (condition.conditions.player?.[0].predicate?.equipment ? Object.values(condition.conditions.player[0].predicate.equipment).map((location) => location.items?.[0]) : undefined),
                            block: condition.conditions.block || (condition.conditions.location?.block?.tag ? `#${condition.conditions.location.block.tag}` : undefined) || condition.conditions.player?.[0].predicate?.stepping_on?.block?.blocks?.[0],
                            biome: condition.conditions.player?.[0]?.predicate?.location?.biome,
                            structure: condition.conditions.player?.[0]?.predicate?.location?.structure,
                            vehicle: condition.conditions.player?.[0]?.predicate?.vehicle?.type,
                            entities:
                                condition.conditions.entity?.map((entity) => entity.predicate.type) ||
                                condition.conditions.child?.map((entity) => entity.predicate.type) ||
                                condition.conditions.player?.[0]?.predicate?.type_specific?.looking_at?.type ||
                                condition.conditions.victims?.map((entities) => {
                                    if (entities.length === 1) return entities[0].predicate.type;
                                    else return entities.map((entity) => entity.predicate.type);
                                }) ||
                                condition.conditions.bystander?.map((entity) => entity.predicate.type) ||
                                condition.conditions.source?.[0]?.predicate?.type,
                            effects: condition.conditions.effects ? Object.keys(condition.conditions.effects) : undefined,
                            enchantments: condition.conditions.item?.enchantments,
                            dimension: condition.conditions.to,
                            position: condition.conditions.player?.[0]?.predicate?.location?.position,
                            distance: condition.conditions.distance || condition.conditions.entity?.[0]?.predicate?.distance || condition.conditions.projectile?.[0]?.predicate?.distance,
                            // Very specific information
                            numBeesInside: condition.conditions.num_bees_inside,
                            beaconLevel: condition.conditions.level,
                        };
                        return criteria;
                    }, {}),
                });
            });
        }
    });

    // const sortedAdvancements = [];
    // const advancementMap = {};
    // advancements.forEach((advancement) => {
    //     advancementMap[advancement.id] = advancement;
    // });
    // while (advancements.length > 0) {
    //     const advancement = advancements.shift();
    //     if (advancement.parent) {
    //         const parent = advancementMap[advancement.parent];
    //         if (parent) {
    //             if (!parent.children) parent.children = [];
    //             parent.children.push(advancement);
    //         }
    //     } else {
    //         sortedAdvancements.push(advancement);
    //     }
    // }

    writeFileSync(outputDir + '/advancements.json', JSON.stringify(advancements, null, 2));
}
