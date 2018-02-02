import { IObjectChange, IObjectWillChange } from "mobx";
import { IStateTreeNode, IJsonPatch, INode, ComplexType, IComplexType, IType, TypeFlags, IContext, IValidationResult, ObjectNode } from "../../internal";
export declare type ModelTypeConfig = {
    name?: string;
    properties?: {
        [K: string]: IType<any, any>;
    };
    initializers?: ReadonlyArray<((instance: any) => any)>;
    preProcessor?: (snapshot: any) => any;
};
export declare class ModelType<S, T> extends ComplexType<S, T> implements IModelType<S, T> {
    readonly flags: TypeFlags;
    shouldAttachNode: boolean;
    readonly initializers: ((instance: any) => any)[];
    readonly properties: {
        [K: string]: IType<any, any>;
    };
    private preProcessor;
    private readonly propertiesNames;
    constructor(opts: ModelTypeConfig);
    cloneAndEnhance(opts: ModelTypeConfig): ModelType<any, any>;
    actions<A extends {
        [name: string]: Function;
    }>(fn: (self: T) => A): IModelType<S, T & A>;
    instantiateActions(self: T, actions: {
        [name: string]: Function;
    }): void;
    named(name: string): IModelType<S, T>;
    props<SP, TP>(properties: {
        [K in keyof TP]: IType<any, TP[K]>;
    } & {
        [K in keyof SP]: IType<SP[K], any>;
    }): IModelType<S & SP & Snapshot<SP>, T & TP>;
    volatile<TP>(fn: (self: T) => TP): IModelType<S, T & TP>;
    instantiateVolatileState(self: T, state: Object): void;
    extend<A extends {
        [name: string]: Function;
    } = {}, V extends Object = {}, VS extends Object = {}>(fn: (self: T & IStateTreeNode) => {
        actions?: A;
        views?: V;
        state?: VS;
    }): IModelType<S, T & A & V & VS>;
    views<V extends Object>(fn: (self: T) => V): IModelType<S, T & V>;
    instantiateViews(self: T, views: Object): void;
    preProcessSnapshot(preProcessor: (snapshot: any) => S): IModelType<S, T>;
    instantiate(parent: ObjectNode | null, subpath: string, environment: any, snapshot: any): INode;
    createNewInstance: () => Object;
    finalizeNewInstance: (node: ObjectNode, snapshot: any) => void;
    willChange(change: IObjectWillChange): IObjectWillChange | null;
    didChange: (change: IObjectChange) => void;
    getChildren(node: ObjectNode): INode[];
    getChildNode(node: ObjectNode, key: string): INode;
    getValue(node: ObjectNode): any;
    getSnapshot(node: ObjectNode): any;
    applyPatchLocally(node: ObjectNode, subpath: string, patch: IJsonPatch): void;
    applySnapshot(node: ObjectNode, snapshot: any): void;
    applySnapshotPreProcessor(snapshot: any): any;
    getChildType(key: string): IType<any, any>;
    isValidSnapshot(value: any, context: IContext): IValidationResult;
    private forAllProps(fn);
    describe(): string;
    getDefaultSnapshot(): any;
    removeChild(node: ObjectNode, subpath: string): void;
}
export interface IModelType<S, T> extends IComplexType<S, T & IStateTreeNode> {
    named(newName: string): IModelType<S, T>;
    props<SP, TP>(props: {
        [K in keyof TP]: IType<any, TP[K]> | TP[K];
    } & {
        [K in keyof SP]: IType<SP[K], any> | SP[K];
    }): IModelType<S & Snapshot<SP>, T & TP>;
    views<V extends Object>(fn: (self: T & IStateTreeNode) => V): IModelType<S, T & V>;
    actions<A extends {
        [name: string]: Function;
    }>(fn: (self: T & IStateTreeNode) => A): IModelType<S, T & A>;
    volatile<TP>(fn: (self: T) => TP): IModelType<S, T & TP>;
    extend<A extends {
        [name: string]: Function;
    } = {}, V extends Object = {}, VS extends Object = {}>(fn: (self: T & IStateTreeNode) => {
        actions?: A;
        views?: V;
        state?: VS;
    }): IModelType<S, T & A & V & VS>;
    preProcessSnapshot(fn: (snapshot: any) => S): IModelType<S, T>;
}
export declare type IModelProperties<T> = {
    [K in keyof T]: IType<any, T[K]> | T[K];
};
export declare type IModelVolatileState<T> = {
    [K in keyof T]: ((self?: any) => T[K]) | T[K];
};
export declare type Snapshot<T> = {
    [K in keyof T]?: Snapshot<T[K]> | any;
};
export declare function model<T = {}>(): IModelType<T | Snapshot<T>, T>;
export declare function model<T = {}>(properties: IModelProperties<T>): IModelType<Snapshot<T>, T>;
export declare function model<T = {}>(name: string, properties: IModelProperties<T>): IModelType<T | Snapshot<T>, T>;
export declare function compose<T1, S1, T2, S2, T3, S3>(t1: IModelType<T1, S1>, t2: IModelType<T2, S2>, t3?: IModelType<T3, S3>): IModelType<T1 & T2 & T3, S1 & S2 & S3>;
export declare function compose<T1, S1, A1, T2, S2, A2, T3, S3, A3>(name: string, t1: IModelType<T1, S1>, t2: IModelType<T2, S2>, t3?: IModelType<T3, S3>): IModelType<T1 & T2 & T3, S1 & S2 & S3>;
export declare function isObjectType(type: any): type is ModelType<any, any>;
