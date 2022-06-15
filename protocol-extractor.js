const fs = require('fs');
const async = require('async');

if (process.argv.length !== 3) {
    console.log('Usage: node protocol_extractor.js <decompiledFilesDir>');
    process.exit(1);
}

const decompiledFilesDir = process.argv[2];

getProtocol();

function getProtocol() {
    async.waterfall([readPacketsIds, dataToCleanLines, linesToProtocol], write);
}

function write(err, protocol) {
    if (err) return console.log('problem ' + err);
    fs.writeFile('protocol.json', JSON.stringify(reorder(['handshaking', 'status', 'login', 'play'], protocol), null, 2));
}

function readPacketsIds(cb) {
    readClass('el', cb);
}

function dataToCleanLines(data, cb) {
    let c = true;
    const lines = data.split('\n');
    cb(
        null,
        lines
            .map((s) => {
                return s.trim();
            })
            .filter((s) => {
                return s.indexOf('import') === -1 && s.indexOf('public') === -1 && s !== '}' && s !== '{' && s !== '},' && s !== '';
            })
            .filter((s) => {
                if (s === '};') c = false;
                return c;
            })
    );
}

function linesToProtocol(cleanLines, cb) {
    let currentState;
    let currentToClientId;
    let currentToServerId;
    cb(
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

function reorder(order, obj) {
    return order.reduce((result, prop) => {
        result[prop] = obj[prop];
        return result;
    }, {});
}

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

function readClass(className, cb) {
    fs.readFile(decompiledFilesDir + '/' + className + '.java', 'utf8', cb);
}

function readClassSync(className) {
    return fs.readFileSync(decompiledFilesDir + '/' + className + '.java', 'utf8');
}

function getFields(className) {
    if (className.indexOf('.') !== -1) return ['error'];
    const data = readClassSync(className);
    return processPacketDefinition(data);
}

// get the whole reading method instead and map the method call to types
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

function transformType(type) {
    type = type.toLowerCase();
    return type.replace('unsigned', 'u');
}
