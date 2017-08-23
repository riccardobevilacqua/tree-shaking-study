import { readFileSync } from 'fs';
import { dirname } from 'path';
import { BehaviorSubject, Observable, Subject } from 'rxjs/Rx';
import * as babylon from 'babylon';
import * as babelTypes from 'babel-types';
import * as jscodeshift from 'jscodeshift';
import { IResolverModule, Resolver } from './resolver';

export interface ICrawlerModule { 
    code: string,
    fullPath: string
}

export default class Crawler { 
    encoding: string
    entryPoint: string
    resolver: Resolver = new Resolver()
    fileStream: BehaviorSubject<IResolverModule[]>
    moduleStream: BehaviorSubject<ICrawlerModule[]>

    constructor(entryPoint: string, encoding: string = 'utf8') { 
        this.entryPoint = entryPoint;
        this.encoding = encoding;
        
        this.start();
    }

    getASTStream(): Observable<babelTypes.File[]> {
        console.log('== GET AST STREAM');
        const astListStream: Observable<babelTypes.File[]> = this.fileStream
            .map((files: IResolverModule[]) => {
                return files
                    .map((file: IResolverModule) => {
                        console.info('== RESOLVER MODULE', file);
                        return this.resolver.resolve(file);
                    })
                    .map((fullPath: string) => {
                        const moduleSnapshot: ICrawlerModule[] = this.moduleStream.getValue();
                        const crawlerModule: ICrawlerModule = {
                            code: readFileSync(fullPath, this.encoding),
                            fullPath
                        };

                        console.info('== CRAWLER MODULE', crawlerModule);

                        return crawlerModule;
                    })
                    .map((module: ICrawlerModule) => {
                        return this.getAST(module);
                    });
            })
            .share();

        astListStream.subscribe({
            next: (astList: babelTypes.File[]) => {
                console.log('AST LIST', astList);
                // astList.map(ast => {
                //     return jscodeshift(ast)
                //         .find(jscodeshift.ImportDeclaration)
                //         .forEach((nodePath: jscodeshift.NodePath) => {
                //             const module: IResolverModule = {
                //                 id: nodePath.value.source.value,
                //                 context: dirname(nodePath.value.loc.filename)
                //             };
                            
                //             this.nextModule(module);
                //         });
                // });
            }, 
            error: (err: Error) => {
                console.error(err);
            },
            complete: () => {
                console.log('Crawling completed');
            }
        });

        return astListStream;
    }

    nextModule(file: IResolverModule): IResolverModule[] {
        const files: IResolverModule[] = this.fileStream.getValue();
        
        files.push(file);
        this.fileStream.next(files);

        return this.fileStream.getValue();
    }

    getAST(module: ICrawlerModule): babelTypes.File { 
        return babylon.parse(module.code, <babylon.BabylonOptions>{
            allowImportExportEverywhere: true,
            sourceFilename: module.fullPath,
            sourceType: 'module'
        });  
    }

    start(): void {
        console.log('==== CRAWLER START');
        this.fileStream = new BehaviorSubject<IResolverModule[]>([{id: this.entryPoint}]);
    }
}
