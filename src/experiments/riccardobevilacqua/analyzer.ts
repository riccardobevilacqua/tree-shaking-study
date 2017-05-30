/**
 * ****************************************************** *
 *                                                        *
 *                        ANALYZER                        *
 *                                                        *
 * ****************************************************** *
 * This library aims to:
 * 1) Access source code
 * 2) Detect dependencies tree and its properties
 * 
 * Necessary and sufficient info to include a function in the output:
 * 1) origin
 * 2) origin imports
 * 3) origin invoked functions
 * 4) origin exported functions
 * 5) origin private declared functions
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const selectedEncoding = 'utf8';
const regexp = {
    from: /from\s+('|")(\w?.\\?)+('|")/gm,
    invokedFn: /\w+\s*\((\w*,?\s*\(?\)?\[?\]?)*\)(?!\s?{)/gm,
    declaredFn: /function\s+(\w+\.*)*\s*\((?!\s?{)/gm,
    brackets: /\((\w*,?\s*\(?\)?\[?\]?)*\)/gm,
    dep: /.*from\s'|';?$/gm,
    js: /.js/gm
};

class Analyzer {
    entry: any = {};
    imports: any = {};
    tree: any = [];

    constructor(filePath: string) {
        // this.entry = path.parse(path.resolve(filePath));  
        // this.readFile(this.entry.dir, './' + this.entry.base);      
        // console.info(this.entry);
        this.analyzeStream(filePath);
    }

    analyzeStream(filePath) {
        const self = this;
        const readableStream = fs.createReadStream(path.resolve(filePath)).setEncoding(selectedEncoding);
        const rl = readline.createInterface({
            input: readableStream
        });
        let deps: string[] = [];
        let declaredFn: string[] = [];
        let invokedFn: string[] = [];

        this.tree.push({
            filePath: path.resolve(filePath)
        });        

        rl.on('line', (line) => {
            if (line.match(regexp.from)) {
                deps.push(self.getDepFullPath(line));
            } else if (line.match(regexp.declaredFn)) {
                declaredFn.push(line);
            } else if (line.match(regexp.invokedFn)) {
                invokedFn.push(line);
            }
        });

        rl.on('close', () => {
            self.updateTreeElement({
                filePath: path.resolve(filePath),
                deps: deps,
                declaredFn: declaredFn,
                invokedFn: invokedFn
            });

            console.info(self.tree);
        });
    }

    getDepFullPath(line: string): string {
        const jsFallback = '.js';
        const dep = line.replace(regexp.dep, '');

        return path.resolve(dep.match(regexp.js) ? dep : dep + jsFallback);
    }

    updateTreeElement(data) {
        const itemIndex = this.tree.findIndex((item) => {
            return item.filePath === data.filePath;
        });

        this.tree[itemIndex] = {
            filePath: data.filePath,
            deps: data.deps,
            declaredFn: data.declaredFn,
            invokedFn: data.invokedFn
        };
    }
}

const analyzer = new Analyzer('./examples/fn/01/index.js');