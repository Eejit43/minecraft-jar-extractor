import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import extractDataFolder from './util/extract-data-folder.js';
import { getMinecraftFiles } from './util/get-minecraft-files.js';
import { copyLang, parseLang } from './util/lang.js';

if (process.argv.length < 3) {
    console.log('Must provide a version!');
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

    console.log(`Successfully extracted advancements file for ${version} to ${outputDir}`);
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

                // if (version === '1.15') console.log(`Parsing ${advancementFile}`);
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

                        criteria[key] = {
                            trigger: condition.trigger,
                            items:
                                conditions.items?.map((item) => (item.tag ? `#${item.tag}` : item.items?.[0] || item.item)) || //
                                conditions.item?.items ||
                                (conditions.item?.tag ? [`#${conditions.item.tag}`] : undefined) ||
                                (conditions.damage?.type?.direct_entity?.type ? [conditions.damage.type.direct_entity.type] : undefined) ||
                                (conditions.killing_blow?.direct_entity?.type ? [conditions.killing_blow.direct_entity.type] : undefined) ||
                                (conditions.item?.item ? [conditions.item.item] : undefined),
                            block:
                                (conditions.block?.tag ? `#${conditions.block.tag}` : undefined) || //
                                conditions.block || //
                                (conditions.location?.block?.tag ? `#${conditions.location.block.tag}` : undefined) ||
                                conditions.player?.[0].predicate?.stepping_on?.block?.blocks?.[0] ||
                                conditions.location?.block?.blocks?.[0],
                            biome:
                                conditions.player?.[0]?.predicate?.location?.biome || //
                                conditions.location?.biome ||
                                conditions.biome,
                            structure:
                                conditions.player?.[0]?.predicate?.location?.structure || //
                                (conditions.location?.feature ? `minecraft:${conditions.location.feature}` : undefined) || // cSpell:disable-line
                                (conditions.feature ? `minecraft:${conditions.feature}` : undefined), // cSpell:disable-line
                            vehicle: conditions.player?.[0]?.predicate?.vehicle?.type,
                            entities:
                                (conditions.entity?.type ? [/^#?minecraft:/.test(conditions.entity.type) ? conditions.entity.type : `minecraft:${conditions.entity.type}`] : undefined) || //
                                (conditions.entity && conditions.entity instanceof Array && (conditions.entity?.[0]?.predicate?.type || conditions.entity?.[0]?.predicate?.type_specific) ? conditions.entity.map((entity) => entity.predicate.type || (entity.predicate.type_specific ? `#${entity.predicate.type_specific.variant}` : undefined) || null) : undefined) ||
                                conditions.child?.map((entity) => entity.predicate.type) ||
                                conditions.parent?.type ||
                                conditions.parent?.map((entity) => entity.predicate.type) ||
                                (conditions.player?.[0]?.predicate?.type_specific?.looking_at?.type ? [conditions.player[0].predicate.type_specific.looking_at.type] : undefined) ||
                                (conditions.victims && conditions.victims.length > 0 ? conditions.victims?.map((entities) => entities[0]?.predicate?.type || entities.type) : undefined) ||
                                conditions.bystander?.map((entity) => entity.predicate.type) ||
                                (conditions.source?.[0]?.predicate?.type ? [conditions.source[0].predicate.type] : undefined) ||
                                (conditions.player?.[0]?.predicate?.vehicle?.passenger?.type ? [conditions.player[0].predicate.vehicle.passenger.type] : undefined),
                            effects: conditions.effects ? Object.keys(conditions.effects) : undefined,
                            enchantments: conditions.item?.enchantments,
                            dimension:
                                (conditions.to ? (conditions.to.startsWith('minecraft:') ? conditions.to : `minecraft:${conditions.to}`) : undefined) || //
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
                            wearing: conditions.player?.[0]?.predicate?.equipment,
                            blockState: conditions.location?.block?.state,
                            blocked: conditions.damage?.blocked,
                            uniqueEntityTypes: conditions.unique_entity_types,
                            catType: conditions.entity?.catType || conditions.entity?.[0]?.predicate?.catType,
                        };
                        if (criteria[key].distance && criteria[key].distance.y) {
                            criteria[key].distance.vertical = criteria[key].distance.y;
                            delete criteria[key].distance.y;
                        }
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
