const fs = require('fs');
const path = require('path');

let inputFilePath = './examples/fn/01/index.js';
let readableStream = fs.createReadStream(path.resolve(inputFilePath));

readableStream.pipe(process.stdout);