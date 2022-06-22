import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import downloadDecompile from './util/download-decompile.js';

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const versions = process.argv[2].split(',');

versions.forEach(async (version) => {
    const decompiledFilesDir = resolve(`./decompiled/${version}/decompiled`);

    if (!existsSync(decompiledFilesDir)) await downloadDecompile(version);

    const data = readFileSync(`${decompiledFilesDir}/el.java`, 'utf-8');
    const clean = dataToCleanLines(data, version);
    const protocol = linesToProtocol(clean);

    mkdirSync(`protocol/${version}`, { recursive: true });
    writeFileSync(`protocol/${version}/protocol.json`, JSON.stringify(reorder(['handshaking', 'status', 'login', 'play'], protocol), null, 2));

    console.log(`Successfully extracted protocol for ${version} to ${resolve(`protocol/${version}/protocol.json`)}`);
});

/**
 * Cleans the lines from the protocol file
 * @param {string} data the data to clean
 * @returns {string[]} the cleaned lines
 */
function dataToCleanLines(data) {
    let clean = true;
    const lines = data.split('\n');

    return lines
        .map((line) => line.trim())
        .filter((line) => {
            return line.indexOf('import') === -1 && line.indexOf('public') === -1 && line !== '}' && line !== '{' && line !== '},' && line !== '';
        })
        .filter((line) => {
            if (line === '};') clean = false;
            return clean;
        });
}

/**
 * Converts the lines to a protocol object
 * @param {Array} cleanLines the lines to process
 * @param {string} version the Minecraft version
 * @returns {object} the protocol object
 */
function linesToProtocol(cleanLines, version) {
    let currentState;
    let currentToClientId;
    let currentToServerId;

    return cleanLines.reduce((protocol, line) => {
        let results;
        if ((results = line.match(/[a-z]\((-?[0-9])\) {/))) {
            currentState = states[results[1]];
            currentToClientId = 0;
            currentToServerId = 0;
            protocol[currentState] = {};
        } else if ((results = line.match(/this\.a\(fg\.([ab]), ([a-z.]+)\.class\);/))) {
            const direction = results[1] === 'b' ? 'toClient' : 'toServer';
            const theClass = results[2];
            const id = idToHexString(direction === 'toClient' ? currentToClientId : currentToServerId);
            if (protocol[currentState][direction] === undefined) {
                protocol[currentState][direction] = {};
            }
            protocol[currentState][direction][theClass] = { id, fields: getFields(theClass, version) };
            if (direction === 'toClient') currentToClientId++;
            else currentToServerId++;
        }
        return protocol;
    });
}

/**
 * Reorders the object according to the given order
 * @param {Array} order the desired order
 * @param {object} obj the object to reorder
 * @returns {object} the reordered object
 */
function reorder(order, obj) {
    return order.reduce((result, prop) => {
        result[prop] = obj[prop];
        return result;
    }, {});
}

/**
 * Converts an id to a hex string
 * @param {number} id the
 * @returns {string} the hex string
 */
function idToHexString(id) {
    let hexString = id.toString(16);
    if (hexString.length === 1) {
        hexString = '0' + hexString;
    }
    return '0x' + hexString;
}

const states = {
    '-1': 'handshaking',
    0: 'play',
    1: 'status',
    2: 'login',
};

/**
 * Gets the fields of the given class
 * @param {string} className the class name
 * @param {string} version the Minecraft version
 * @returns {Array} the fields of the class
 */
function getFields(className, version) {
    if (className.indexOf('.') !== -1) return ['error'];
    const data = readFileSync(`decompiled/${version}/decompiled/${className}.java`, 'utf8');
    return processPacketDefinition(data);
}

/**
 * Processes the packet definition
 * @param {string} data the data to process
 * @returns {Array} the processed data
 */
function processPacketDefinition(data) {
    return data
        .split('\n')
        .map((s) => {
            return s.trim();
        })
        .filter((s) => {
            return s.indexOf('.read') !== -1;
        })
        .map((s) => {
            const results = s.match(/read(.+?)\(/);
            return results[1];
        })
        .filter((type) => {
            return type !== undefined;
        })
        .map((type) => {
            return transformType(type);
        });
}

/**
 * Transforms the type (to lowercase and `unsigned`-->`u`)
 * @param {string} type the type to transform
 * @returns {string} the transformed type
 */
function transformType(type) {
    type = type.toLowerCase();
    return type.replace('unsigned', 'u');
}
