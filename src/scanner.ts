import { dirname, resolve } from 'path';
import * as babelTypes from 'babel-types';
import { BehaviorSubject, Observable, Subject } from 'rxjs/Rx';
import * as jscodeshift from 'jscodeshift';
import { isDeclaration, increaseReference } from './jscodeshift-util';
import { default as Crawler, IASTModule} from './crawler';

export default class Scanner {
    astListStream: BehaviorSubject<babelTypes.File[]> = new BehaviorSubject([])
    crawler: Crawler
    inputStream: Observable<babelTypes.File>
    stack: IASTModule[] = []

    constructor(crawler: Crawler) { 
        console.log('Scanner init');
        this.crawler = crawler;

        this.start();
    }

    getMonitorModule(fullPath: string): IASTModule {
        return this.stack.find((astModule: IASTModule) => astModule.fullPath === fullPath);
    }

    // scanImport(): void {
    //     this.astListStream.subscribe({
    //         next: ((astList: babelTypes.File[]) => {
    //             if (astList && astList.length > 1) {
    //                 console.info('Processing list of ' + astList.length + ' AST...');
    //                 const listMonitor: Observable<babelTypes.File> = Observable.from(astList);

    //                 listMonitor.subscribe({
    //                     next: (ast: babelTypes.File) => {
    //                         jscodeshift(ast)
    //                             .find(jscodeshift.ImportDeclaration)
    //                             .forEach(nodePath => {
    //                                 const importedModuleFullPath: string = resolve(this.crawler.sourceDir, nodePath.node.source.value + '.js');
    //                                 console.info('Found imported module [' + importedModuleFullPath + ']');

    //                                 const importedModuleAst: babelTypes.File = astList
    //                                     .find((moduleAst: babelTypes.File) => {
    //                                         return moduleAst[0].value.program.loc.filename === importedModuleFullPath;
    //                                     });

    //                                 this.scanDeclaration(importedModuleAst, importedModuleFullPath);
    //                             });
    //                     },
    //                     error: (err: Error) => {
    //                         console.error(err);
    //                     },
    //                     complete: () => {
    //                         console.log('List monitor stream completed');
    //                     }
    //                 });
    //             }
    //         }),
    //         error: (err: Error) => {
    //             console.error(err);
    //         },
    //         complete: () => {
    //             console.log('Scanning cross module: level 2 completed');
    //         }
    //     });
    // }

    /**
     * Add number of references to declarations in a given AST
     * @param ast
     * @param identifierName
     */
    scanDeclaration(astModule: IASTModule, identifierName: string = ''): IASTModule {
        const astCollection: jscodeshift.Collection = jscodeshift(astModule.ast);
        const identifiers: Observable<jscodeshift.Identifier> = Observable.from(astCollection.find(jscodeshift.Identifier).__paths);

        identifiers.subscribe({
            next: (identifierNodePath) => {
                if (identifierName === '') {
                    identifierName = identifierNodePath.node.name;
                }

                if (!isDeclaration(identifierNodePath.parent)) {
                    astCollection
                        .find(jscodeshift.FunctionDeclaration, {
                            id: {
                                name: identifierName
                            }
                        })
                        .forEach(nodePath => {
                            increaseReference(nodePath);
                        });

                    astCollection
                        .find(jscodeshift.VariableDeclarator, {
                            id: {
                                name: identifierName
                            }
                        })
                        .forEach(nodePath => {
                            increaseReference(nodePath);
                        });
                }
            },
            error: (err: Error) => {
                console.error(err);
            },
            complete: () => {
                console.log('Identifiers stream completed');
            }
        });
        
        astModule.ast = astCollection.getAST();
        return astModule;
    }

    start(): void {
        console.log('Scanner start');
        
        const astModuleStream: Observable<IASTModule> = this.crawler.getASTStream();

        astModuleStream.subscribe({
            next: (astModule: IASTModule) => {
                console.log('Scanner received [' + astModule.fullPath + ']');
                this.stack.push(astModule);
            }
        });
    }
}