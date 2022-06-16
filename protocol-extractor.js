import { waterfall } from 'async';
import { readFile, readFileSync, writeFile } from 'fs';
import { resolve } from 'path';

if (process.argv.length < 3) {
    console.log('Must provide a version!');
    process.exit(1);
}

const minecraftVersion = process.argv[2];
const decompiledFilesDir = resolve(`./decompiled/${minecraftVersion}/decompiled`);

waterfall([readPacketsIds, dataToCleanLines, linesToProtocol], write);

/**
 * Writes the protocol to a file
 * @param {string} err the error message
 * @param {object} protocol the protocol object
 * @returns {void}
 */
function write(err, protocol) {
    if (err) return console.log('problem ' + err);
    writeFile('protocol.json', JSON.stringify(reorder(['handshaking', 'status', 'login', 'play'], protocol), null, 2));
}

/**
 * Reads the packets ids from the protocol file
 * @param {Function} callback the callback function
 */
function readPacketsIds(callback) {
    readClass('el', callback);
}

/**
 * Cleans the lines from the protocol file
 * @param {string} data the data to clean
 * @param {Function} callback the callback function
 */
function dataToCleanLines(data, callback) {
    let clean = true;
    const lines = data.split('\n');
    callback(
        null,
        lines
            .map((line) => {
                return line.trim();
            })
            .filter((line) => {
                return line.indexOf('import') === -1 && line.indexOf('public') === -1 && line !== '}' && line !== '{' && line !== '},' && line !== '';
            })
            .filter((line) => {
                if (line === '};') clean = false;
                return clean;
            })
    );
}

/**
 * Converts the lines to a protocol object
 * @param {Array} cleanLines the lines to process
 * @param {Function} callback the callback function
 */
function linesToProtocol(cleanLines, callback) {
    let currentState;
    let currentToClientId;
    let currentToServerId;
    callback(
        null,
        cleanLines.reduce((protocol, line) => {
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
                protocol[currentState][direction][theClass] = { id, fields: getFields(theClass) };
                if (direction === 'toClient') currentToClientId++;
                else currentToServerId++;
            }
            return protocol;
        }, {})
    );
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
 * Reads java class into the given callback
 * @param {string} className the class to read
 * @param {Function} callback the callback function
 */
function readClass(className, callback) {
    readFile(decompiledFilesDir + '/' + className + '.java', 'utf8', callback);
}

/**
 * Reads java class and returns the data
 * @param {string} className the class to read
 * @returns {string} the class data
 */
function readClassSync(className) {
    return readFileSync(decompiledFilesDir + '/' + className + '.java', 'utf8');
}

/**
 * Gets the fields of the given class
 * @param {string} className the class name
 * @returns {Array} the fields of the class
 */
function getFields(className) {
    if (className.indexOf('.') !== -1) return ['error'];
    const data = readClassSync(className);
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
