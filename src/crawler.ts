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

    getASTStream(): Observable<babelTypes.File[]> {
        const astListStream: Observable<babelTypes.File[]> = Observable
            .of(this.moduleStream.getValue())
            .map((files: IResolverModule[]) => {
                return files
                    .map(file => this.resolver.resolve(file))
                    .map((fullPath: string) => {
                        console.log('== Processing file [' + fullPath + ']');
                        return <ICrawlerModule>{
                            code: readFileSync(fullPath, this.encoding),
                            fullPath
                        }
                    })
                    .map((module: ICrawlerModule) => this.getAST(module));
            })
            .share();

        astListStream.subscribe({
            next: (astList: babelTypes.File[]) => {
                astList.map(ast => {
                    return jscodeshift(ast)
                        .find(jscodeshift.ImportDeclaration)
                        .forEach((nodePath: jscodeshift.NodePath) => {
                            const module: IResolverModule = {
                                id: nodePath.value.source.value,
                                context: dirname(nodePath.value.loc.filename),
                            };
                            
                            this.nextModule(module);
                        });
                });
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

    nextModule(module: IResolverModule): IResolverModule[] {
        const modules: IResolverModule[] = this.moduleStream.getValue();
        
        modules.push(module);
        this.moduleStream.next(modules);

        return this.moduleStream.getValue();
    }

    getAST(module: ICrawlerModule): babelTypes.File { 
        return babylon.parse(module.code, <babylon.BabylonOptions>{
            allowImportExportEverywhere: true,
            sourceFilename: module.fullPath,
            sourceType: 'module'
        });  
    }
}
