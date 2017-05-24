const fs = require('fs');
const path = require('path');

let inputFilePath = './examples/fn/01/index.js';
let outputFilePath = './dist/output-01.js';
let readableStream = fs.createReadStream(path.resolve(inputFilePath));
let writebleStream = fs.createWriteStream(path.resolve(outputFilePath));

readableStream.pipe(writebleStream);