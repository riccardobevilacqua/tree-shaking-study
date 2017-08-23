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
    moduleStream: BehaviorSubject<IResolverModule[]>

    constructor(entryPoint: string, encoding: string = 'utf8') { 
        this.entryPoint = entryPoint;
        this.encoding = encoding;
        
        this.moduleStream = new BehaviorSubject<IResolverModule[]>([{id: this.entryPoint}]);
    }

    getASTStream(): Observable<babelTypes.File> {
        const astStream: Observable<babelTypes.File> = this.moduleStream
            .map((files: IResolverModule[]) => {
                return this.resolver.resolve(files[files.length - 1])
            })
            .map((fullPath: string) => {
                console.log('== Processing file [' + fullPath + ']');
                return <ICrawlerModule>{
                    code: readFileSync(fullPath, this.encoding),
                    fullPath
                }
            })
            .map((module: ICrawlerModule) => this.getAST(module))
            .share();

        astStream.subscribe({
            next: (ast: babelTypes.File) => {
                jscodeshift(ast)
                    .find(jscodeshift.ImportDeclaration)
                    .forEach((nodePath: jscodeshift.NodePath) => {
                        const module: IResolverModule = {
                            id: nodePath.value.source.value,
                            context: dirname(nodePath.value.loc.filename),
                        };
                        const modules: IResolverModule[] = this.moduleStream.getValue();
                        
                        modules.push(module);

                        this.moduleStream.next(modules);
                    });
            }, 
            error: (err: Error) => {
                console.error(err);
            },
            complete: () => {
                console.log('Crawling completed');
            }
        });

        return astStream;
    }

    getAST(module: ICrawlerModule): babelTypes.File { 
        return babylon.parse(module.code, <babylon.BabylonOptions>{
            allowImportExportEverywhere: true,
            sourceFilename: module.fullPath,
            sourceType: 'module'
        });  
    }
}
