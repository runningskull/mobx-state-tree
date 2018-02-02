export declare function flow<R>(generator: () => IterableIterator<any>): () => Promise<R>;
export declare function flow<A1>(generator: (a1: A1) => IterableIterator<any>): (a1: A1) => Promise<any>;
export declare function flow<A1, A2>(generator: (a1: A1, a2: A2) => IterableIterator<any>): (a1: A1, a2: A2) => Promise<any>;
export declare function flow<A1, A2, A3>(generator: (a1: A1, a2: A2, a3: A3) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3) => Promise<any>;
export declare function flow<A1, A2, A3, A4>(generator: (a1: A1, a2: A2, a3: A3, a4: A4) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4) => Promise<any>;
export declare function flow<A1, A2, A3, A4, A5>(generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5) => Promise<any>;
export declare function flow<A1, A2, A3, A4, A5, A6>(generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6) => Promise<any>;
export declare function flow<A1, A2, A3, A4, A5, A6, A7>(generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7) => Promise<any>;
export declare function flow<A1, A2, A3, A4, A5, A6, A7, A8>(generator: (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => IterableIterator<any>): (a1: A1, a2: A2, a3: A3, a4: A4, a5: A5, a6: A6, a7: A7, a8: A8) => Promise<any>;
export declare function createFlowSpawner(name: string, generator: Function): (this: any) => Promise<{}>;
