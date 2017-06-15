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
 * 
 */

import { readFile } from 'fs';
import { resolve } from 'path';
import * as estree from '@types/estree';
import { parse} from 'acorn';
import { walk } from 'acorn/dist/walk';
import { Observable, Subject, BehaviorSubject } from 'rxjs/Rx';

interface TreeItem {
    file: string;
    imports: CategoryItem[];
    declared: CategoryItem[];
    invoked: CategoryItem[];
    exported: CategoryItem[];
}

interface CategoryItem {
    name: string;
    occurrences: number;
}

class Analyzer {
    dirPath: string;
    encoding: string;    
    files: BehaviorSubject<string> = new BehaviorSubject('index');
    tree: BehaviorSubject<TreeItem[]> = new BehaviorSubject([]);

    constructor(dirPath: string, encoding: string = 'utf8') {
        this.dirPath = dirPath;
        this.encoding = encoding;

        this.createDepTree();
    }

    createDepTree() {
        this.files.subscribe(filename => {
            this.analyzeFile(resolve(this.dirPath, filename) + '.js');
        });

        this.tree.subscribe({
            next: (snapshot) => {
                // console.log('==== TREE:');
                // snapshot.map(item => console.info(item));
            }
        });

        return this;
    }

    analyzeFile(filename: string): void {
        this.addTreeElement(filename);
        this.scanNodes(filename);
    }    

    scanNodes(filename: string) {
        const readFileAsObservable = Observable.bindNodeCallback((
            path: string,
            encoding: string,
            callback: (error: Error, buffer: Buffer) => void
        ) => readFile(path, encoding, callback));

        const nodes = readFileAsObservable(filename, this.encoding)
            .flatMap(code => {
                const parsedCode: estree.Program = parse(code, {
                    ecmaVersion: 6,
                    sourceType: 'module',
                    allowImportExportEverywhere: true
                });

                return Observable.from(parsedCode.body);
            })
            .share();

        nodes.subscribe(value => {
            walk.simple(value, {
                Literal(node) {
                    console.info(node);
                }
            })
        });

        // const imports = this.scanImports(nodes);
        // const declared = this.scanDeclared(nodes);
        // const invoked = this.scanInvoked(nodes);
        // const exported = this.scanExported(nodes);

        // imports.subscribe(value => {
        //     this.feedTreeElement(filename, 'imports', value);
        //     this.files.next(value);
        // });

        // declared.subscribe(value => {
        //     this.feedTreeElement(filename, 'declared', value);
        // });

        // invoked.subscribe(value => {
        //     this.feedTreeElement(filename, 'invoked', value);
        // });

        // exported.subscribe(value => {
        //     this.feedTreeElement(filename, 'exported', value);
        // });
    }

    scanImports(nodes: Observable<estree.Node>): Observable<string>  {
        return nodes
            .filter(node => node.type === 'ImportDeclaration')
            .map(node => (<estree.ImportDeclaration> node).source.value);
    }
    
    scanDeclared(nodes: Observable<estree.Node>): Observable<string> {
        return nodes
            .filter(node => node.type === 'ExpressionStatement')
            .map(node => (<estree.FunctionDeclaration> node).id.name);
    }

    scanInvoked(nodes: Observable<estree.Node>): any {
        return nodes;
    }

    scanExported(nodes: Observable<estree.Node>): Observable<string> {
        return nodes
            .filter(node => node.type === 'ExportNamedDeclaration')
            .map(node => (<estree.ExportNamedDeclaration> node).declaration.id.name);
    }

    addTreeElement(filename: string): TreeItem[] {
        let snapshot = this.tree.getValue();
        const itemIndex = snapshot.findIndex(element => {
            return element.file === filename;
        });

        if (itemIndex < 0) {
            snapshot.push(<TreeItem>{
                file: filename,
                imports: [],
                declared: [],
                invoked: [],
                exported: []
            });

            this.tree.next(snapshot);
        }

        return snapshot;
    }

    feedTreeElement(filename: string, category: 'imports' | 'declared' | 'invoked' | 'exported', value: string): TreeItem[] {
        let snapshot: TreeItem[] = this.tree.getValue();
        const itemIndex: number = snapshot.findIndex(element => {
            return element.file === filename;
        });

        if (itemIndex > -1) {
            const categoryIndex = snapshot[itemIndex][category].findIndex((categoryElement: CategoryItem) => {
                return categoryElement.name === value
            });

            if (categoryIndex < 0) {
                snapshot[itemIndex][category].push(<CategoryItem>{
                    name: value,
                    occurrences: 1
                });
            } else {
                snapshot[itemIndex][category][categoryIndex].occurrences++;
            }

            this.tree.next(snapshot);
        }

        return snapshot;
    }
}

const analyzer = new Analyzer('./examples/fn/01/');