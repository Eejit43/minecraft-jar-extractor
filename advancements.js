import chalk from 'chalk';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import extractDataFolder from './util/extract-data-folder.js';
import { getMinecraftFiles } from './util/get-minecraft-files.js';
import { copyLang, parseLang } from './util/lang.js';

if (process.argv.length < 3) {
    console.log(chalk.red('Must provide a version!'));
    process.exit(1);
}

const versions = process.argv[2].split(',');

versions.map(async (version) => {
    const outputDir = resolve(`advancements/${version}`);
    const versionDataDir = resolve(`version-data/${version}`);

    if (!existsSync(versionDataDir)) await getMinecraftFiles(version);

    if (!existsSync(resolve(`data/${version}/loot_tables`))) await extractDataFolder(version);

    mkdirSync(outputDir, { recursive: true });
    copyLang(versionDataDir, outputDir);
    parseLang(outputDir);

    createAdvancements(outputDir, version);

    console.log(chalk.green(`Successfully extracted advancements file for ${version} to ${outputDir}/advancements.json`));
});

/**
 * Creates the advancements file
 * @param {string} outputDir the path to the output directory
 * @param {string} version the Minecraft version
 */
function createAdvancements(outputDir, version) {
    const advancements = [];
    const lang = JSON.parse(readFileSync(outputDir + '/en_us.json', 'utf-8'));
    rmSync(outputDir + '/en_us.json');

    readdirSync(resolve(`data/${version}/advancements`)).forEach((category) => {
        if (category !== 'recipes') {
            readdirSync(resolve(`data/${version}/advancements/${category}`)).forEach((advancement) => {
                advancement = advancement.replace(/.json$/, '');

                const advancementFile = resolve(`data/${version}/advancements/${category}/${advancement}.json`);
                const advancementData = JSON.parse(readFileSync(advancementFile, 'utf-8'));

                // console.log(`Parsing ${advancementFile}`);
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
                        const conditions = condition.conditions || {};

                        key = key.replace(/^minecraft:/, '');

                        if (conditions.player?.length > 1 && advancement !== 'distract_piglin' && advancement !== 'distract_piglin_directly') console.log(chalk.yellow(`Warning: ${advancementFile} has multiple players in conditions for "${key}"!`));
                        if (conditions.source?.length > 1) console.log(chalk.yellow(`Warning: ${advancementFile} has multiple sources in conditions for "${key}"!`));
                        if (conditions.entity?.length > 1) console.log(chalk.yellow(`Warning: ${advancementFile} has multiple entities in conditions for "${key}"!`));
                        if (conditions.projectile?.length > 1) console.log(chalk.yellow(`Warning: ${advancementFile} has multiple projectiles in conditions for "${key}"!`));
                        if (conditions.lightning?.length > 1) console.log(chalk.yellow(`Warning: ${advancementFile} has multiple lightning entries in conditions for "${key}"!`));
                        if (conditions.items) {
                            conditions.items.forEach((item) => {
                                if (item.items?.length > 1) console.log(chalk.yellow(`Warning: ${advancementFile} has multiple items in items in conditions for "${key}"!`));
                            });
                        }

                        criteria[key] = {
                            trigger: condition.trigger,
                            items:
                                conditions.items?.map((item) => (item.tag ? `#${item.tag}` : item.items?.[0] || item.item)) || //
                                conditions.item?.items ||
                                (conditions.item?.tag ? [`#${conditions.item.tag}`] : undefined) ||
                                (conditions.damage?.type?.direct_entity?.type ? [conditions.damage.type.direct_entity.type] : undefined) ||
                                (conditions.killing_blow?.direct_entity?.type ? [conditions.killing_blow.direct_entity.type] : undefined) ||
                                (conditions.item?.item ? [conditions.item.item] : undefined),
                            blocks:
                                (conditions.block?.tag ? [`#${conditions.block.tag}`] : undefined) || //
                                (conditions.block ? [conditions.block] : undefined) || //
                                (conditions.location?.block?.tag ? [`#${conditions.location.block.tag}`] : undefined) ||
                                conditions.player?.[0].predicate?.stepping_on?.block?.blocks ||
                                conditions.location?.block?.blocks,
                            biome:
                                conditions.player?.[0]?.predicate?.location?.biome || //
                                conditions.location?.biome ||
                                conditions.biome,
                            structure:
                                conditions.player?.[0]?.predicate?.location?.structure || //
                                conditions.location?.feature ||
                                conditions.feature,
                            vehicle: conditions.player?.[0]?.predicate?.vehicle?.type,
                            entities:
                                (conditions.entity?.type ? [conditions.entity.type] : undefined) || //
                                (conditions.entity && conditions.entity instanceof Array && (conditions.entity?.[0]?.predicate?.type || conditions.entity?.[0]?.predicate?.type_specific) ? conditions.entity.map((entity) => entity.predicate.type || (entity.predicate.type_specific ? `#${entity.predicate.type_specific.variant}` : undefined) || null) : undefined) ||
                                conditions.child?.map((entity) => entity.predicate.type) ||
                                (conditions.parent?.type ? [conditions.parent.type] : undefined) ||
                                conditions.parent?.map((entity) => entity.predicate.type) ||
                                (conditions.player?.[0]?.predicate?.type_specific?.looking_at?.type ? [conditions.player[0].predicate.type_specific.looking_at.type] : undefined) ||
                                (conditions.victims && conditions.victims.length > 0 ? conditions.victims?.map((entities) => entities[0]?.predicate?.type || entities.type) : undefined) ||
                                conditions.bystander?.map((entity) => entity.predicate.type) ||
                                (conditions.source?.[0]?.predicate?.type ? [conditions.source[0].predicate.type] : undefined) ||
                                (conditions.player?.[0]?.predicate?.vehicle?.passenger?.type ? [conditions.player[0].predicate.vehicle.passenger.type] : undefined),
                            effects: conditions.effects ? Object.keys(conditions.effects) : undefined,
                            enchantments: conditions.item?.enchantments,
                            dimension:
                                conditions.to?.replace(/^minecraft:/, '') || //
                                conditions.entity?.[0]?.predicate?.location?.dimension ||
                                conditions.entity?.location?.dimension,
                            position: conditions.player?.[0]?.predicate?.location?.position,
                            distance:
                                conditions.distance || //
                                conditions.entity?.[0]?.predicate?.distance ||
                                conditions.projectile?.[0]?.predicate?.distance ||
                                conditions.entity?.distance,
                            // Very specific information
                            lootTable: conditions.loot_table,
                            numBeesInside: conditions.num_bees_inside,
                            smokey: conditions.location?.smokey,
                            beaconLevel: conditions.level,
                            blocksSetOnFire: conditions.lightning?.[0]?.predicate?.type_specific?.blocks_set_on_fire,
                            entityWearing:
                                conditions.entity?.[0]?.predicate?.equipment || //
                                conditions.entity?.equipment,
                            wearing: conditions.player?.[0]?.predicate?.equipment || (conditions.player?.[0]?.term?.predicate?.equipment ? conditions.player.map((option) => option.term.predicate.equipment) : undefined),
                            blockState: conditions.location?.block?.state,
                            blocked: conditions.damage?.blocked,
                            uniqueEntityTypes: conditions.unique_entity_types,
                            catType: conditions.entity?.catType || conditions.entity?.[0]?.predicate?.catType,
                            isBaby: conditions.entity?.[0]?.predicate?.flags?.is_baby,
                        };
                        if (criteria[key].distance && criteria[key].distance.y) {
                            criteria[key].distance.vertical = criteria[key].distance.y;
                            delete criteria[key].distance.y;
                        }
                        for (const newKey in criteria[key]) {
                            if (!criteria[key][newKey]) continue;
                            if (typeof criteria[key][newKey] === 'string') {
                                criteria[key][newKey] = criteria[key][newKey].replace(/^(#)?minecraft:/, '$1');
                            } else if (criteria[key][newKey] instanceof Array) {
                                criteria[key][newKey] = criteria[key][newKey].map((item) => (typeof item === 'string' ? item.replace(/^(#)?minecraft:/, '$1') : item));
                            }
                            if (newKey === 'enchantments') {
                                criteria[key][newKey] = criteria[key][newKey].map((enchantment) => ({
                                    enchantment: enchantment.enchantment.replace(/^(#)?minecraft:/, '$1'),
                                    levels: enchantment.levels,
                                }));
                            } else if (newKey === 'entityWearing' || newKey === 'wearing') {
                                if (criteria[key][newKey] instanceof Array) {
                                    criteria[key][newKey] = criteria[key][newKey].map((type) => {
                                        Object.values(type).forEach((value) => {
                                            if (value.items) {
                                                value.item = value.items[0].replace(/^(#)?minecraft:/, '$1');
                                                delete value.items;
                                            } else if (value.item) value.item = value.item.replace(/^(#)?minecraft:/, '$1');
                                        });
                                        return type;
                                    });
                                } else if (typeof criteria[key][newKey] === 'object') {
                                    Object.keys(criteria[key][newKey]).forEach((type) => {
                                        if (criteria[key][newKey][type].items) {
                                            criteria[key][newKey][type].item = criteria[key][newKey][type].items[0].replace(/^(#)?minecraft:/, '$1');
                                            delete criteria[key][newKey][type].items;
                                        } else if (criteria[key][newKey][type].item) criteria[key][newKey][type].item = criteria[key][newKey][type].item.replace(/^(#)?minecraft:/, '$1');
                                    });
                                }
                            }
                        }
                        if (criteria[key].items && !(criteria[key].items instanceof Array)) console.log(chalk.yellow(`Warning: ${version}'s output items value is not an array in "${key}" (from ${advancementFile})!`));
                        if (criteria[key].blocks && !(criteria[key].blocks instanceof Array)) console.log(chalk.yellow(`Warning: ${version}'s output blocks value is not an array in "${key}" (from ${advancementFile})!`));
                        if (criteria[key].entities && !(criteria[key].entities instanceof Array)) console.log(chalk.yellow(`Warning: ${version}'s output entities value is not an array in "${key}" (from ${advancementFile})!`));
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
