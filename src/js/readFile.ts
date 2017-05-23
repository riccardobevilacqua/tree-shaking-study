const fs = require('fs');
const readline = require('readline');

let data = '';

let readableStream = fs.createReadStream('/home/rbevila/lab/tree-shaking-study/examples/fn/01/index.js');

readableStream.on('data', function(chunk) {
    data+=chunk;
});

readableStream.on('end', function() {
    console.log(data);
});