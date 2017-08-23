import { resolve } from 'path';
import * as babelTypes from 'babel-types';
import { Observable, Subject } from 'rxjs/Rx';
import * as jscodeshift from 'jscodeshift';
import { isDeclaration, increaseReference } from './jscodeshift-util';
import Crawler from './crawler';

export default class Scanner {
    astListStreamInput: Observable<babelTypes.File[]>

    constructor(crawler: Crawler) { 
        this.astListStreamInput = crawler.getASTStream();
    }

    /**
     * Launch cross AST stream analysis
     * 
     * >Don't cross the streams.
     * - Egon Spengler
     */
    start(): void {
        const astListStreamScanned: Observable<babelTypes.File[]> = Observable
            .from(this.astListStreamInput)
            .map((astList: babelTypes.File[]) => {
                console.log('CHECK!');
                return astList;
            });
        
        // astStreamScanned.subscribe({
        //     next: (ast: babelTypes.File) => {
        //         jscodeshift(ast)
        //             .find(jscodeshift.Program)
        //             .forEach(nodePath => {
        //                 console.info('== FILE', nodePath.node.loc.filename);
        //             });
        //     },
        //     error: (err: Error) => {
        //         console.error(err);
        //     },
        //     complete: () => {
        //         console.log('Scanned AST stream completed');
        //     }
        // });
    }

    /**
     * Add number of references to declarations in a given AST
     * @param ast
     * @param identifierName
     */
    scanDeclaration(ast: babelTypes.File, identifierName: string = ''): babelTypes.File {
        const astCollection: jscodeshift.Collection = jscodeshift(ast);
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
                console.log('Declarations stream completed');
            }
        });

        return astCollection.getAST();
    }
}