const fs = require('fs');
const path = require('path');

const inputFilePath = './examples/fn/01/index.js';
const outputFilePath = './dist/output-01.js';
const readableStream = fs.createReadStream(path.resolve(inputFilePath));
const writebleStream = fs.createWriteStream(path.resolve(outputFilePath));

readableStream.pipe(writebleStream);