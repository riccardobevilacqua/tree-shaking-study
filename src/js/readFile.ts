const fs = require('fs');
const path = require('path');
const readline = require('readline');

let inputFilePath = './examples/fn/01/index.js';
let data = '';
let readableStream = fs.createReadStream(path.resolve(inputFilePath));

readableStream.on('data', function(chunk) {
    data+=chunk;
});

readableStream.on('end', function() {
    console.log(data);
});