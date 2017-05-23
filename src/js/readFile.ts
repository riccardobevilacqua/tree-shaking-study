const fs = require('fs');
const path = require('path');
const readline = require('readline');

let data = '';
let readableStream = fs.createReadStream(path.resolve('./examples/fn/01/index.js'));

readableStream.on('data', function(chunk) {
    data+=chunk;
});

readableStream.on('end', function() {
    console.log(data);
});