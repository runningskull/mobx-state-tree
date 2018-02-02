import { action, computed, extendShallowObservable, extras, intercept, isComputed, isObservableArray, observable, observe, reaction, runInAction } from 'mobx';

/**
 * Returns the _actual_ type of the given tree node. (Or throws)
 *
 * @export
 * @param {IStateTreeNode} object
 * @returns {IType<S, T>}
 */
function getType$$1(object) {
    return getStateTreeNode$$1(object).type;
}
/**
 * Returns the _declared_ type of the given sub property of an object, array or map.
 *
 * @example
 * const Box = types.model({ x: 0, y: 0 })
 * const box = Box.create()
 *
 * console.log(getChildType(box, "x").name) // 'number'
 *
 * @export
 * @param {IStateTreeNode} object
 * @param {string} child
 * @returns {IType<any, any>}
 */
function getChildType$$1(object, child) {
    return getStateTreeNode$$1(object).getChildType(child);
}
/**
 * Registers a function that will be invoked for each mutation that is applied to the provided model instance, or to any of its children.
 * See [patches](https://github.com/mobxjs/mobx-state-tree#patches) for more details. onPatch events are emitted immediately and will not await the end of a transaction.
 * Patches can be used to deep observe a model tree.
 *
 * @export
 * @param {Object} target the model instance from which to receive patches
 * @param {(patch: IJsonPatch, reversePatch) => void} callback the callback that is invoked for each patch. The reversePatch is a patch that would actually undo the emitted patch
 * @param {includeOldValue} boolean if oldValue is included in the patches, they can be inverted. However patches will become much bigger and might not be suitable for efficient transport
 * @returns {IDisposer} function to remove the listener
 */
function onPatch$$1(target, callback) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof callback !== "function")
            fail("expected second argument to be a function, got " + callback + " instead");
    }
    return getStateTreeNode$$1(target).onPatch(callback);
}
/**
 * Registers a function that is invoked whenever a new snapshot for the given model instance is available.
 * The listener will only be fire at the and of the current MobX (trans)action.
 * See [snapshots](https://github.com/mobxjs/mobx-state-tree#snapshots) for more details.
 *
 * @export
 * @param {Object} target
 * @param {(snapshot: any) => void} callback
 * @returns {IDisposer}
 */
function onSnapshot$$1(target, callback) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof callback !== "function")
            fail("expected second argument to be a function, got " + callback + " instead");
    }
    return getStateTreeNode$$1(target).onSnapshot(callback);
}
/**
 * Applies a JSON-patch to the given model instance or bails out if the patch couldn't be applied
 * See [patches](https://github.com/mobxjs/mobx-state-tree#patches) for more details.
 *
 * Can apply a single past, or an array of patches.
 *
 * @export
 * @param {Object} target
 * @param {IJsonPatch} patch
 * @returns
 */
function applyPatch$$1(target, patch) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof patch !== "object")
            fail("expected second argument to be an object or array, got " + patch + " instead");
    }
    getStateTreeNode$$1(target).applyPatches(asArray(patch));
}
/**
 * Small abstraction around `onPatch` and `applyPatch`, attaches a patch listener to a tree and records all the patches.
 * Returns an recorder object with the following signature:
 *
 * @example
 * export interface IPatchRecorder {
 *      // the recorded patches
 *      patches: IJsonPatch[]
 *      // the inverse of the recorded patches
 *      inversePatches: IJsonPatch[]
 *      // stop recording patches
 *      stop(target?: IStateTreeNode): any
 *      // resume recording patches
 *      resume()
 *      // apply all the recorded patches on the given target (the original subject if omitted)
 *      replay(target?: IStateTreeNode): any
 *      // reverse apply the recorded patches on the given target  (the original subject if omitted)
 *      // stops the recorder if not already stopped
 *      undo(): void
 * }
 *
 * @export
 * @param {IStateTreeNode} subject
 * @returns {IPatchRecorder}
 */
function recordPatches$$1(subject) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(subject))
            fail("expected first argument to be a mobx-state-tree node, got " + subject + " instead");
    }
    var disposer = null;
    function resume() {
        if (disposer)
            return;
        disposer = onPatch$$1(subject, function (patch, inversePatch) {
            recorder.rawPatches.push([patch, inversePatch]);
        });
    }
    var recorder = {
        rawPatches: [],
        get patches() {
            return this.rawPatches.map(function (_a) {
                var a = _a[0];
                return a;
            });
        },
        get inversePatches() {
            return this.rawPatches.map(function (_a) {
                var _ = _a[0], b = _a[1];
                return b;
            });
        },
        stop: function () {
            if (disposer)
                disposer();
            disposer = null;
        },
        resume: resume,
        replay: function (target) {
            applyPatch$$1(target || subject, recorder.patches);
        },
        undo: function (target) {
            applyPatch$$1(target || subject, recorder.inversePatches.slice().reverse());
        }
    };
    resume();
    return recorder;
}
/**
 * The inverse of `unprotect`
 *
 * @export
 * @param {IStateTreeNode} target
 *
 */
function protect$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    var node = getStateTreeNode$$1(target);
    if (!node.isRoot)
        fail("`protect` can only be invoked on root nodes");
    node.isProtectionEnabled = true;
}
/**
 * By default it is not allowed to directly modify a model. Models can only be modified through actions.
 * However, in some cases you don't care about the advantages (like replayability, traceability, etc) this yields.
 * For example because you are building a PoC or don't have any middleware attached to your tree.
 *
 * In that case you can disable this protection by calling `unprotect` on the root of your tree.
 *
 * @example
 * const Todo = types.model({
 *     done: false
 * }).actions(self => ({
 *     toggle() {
 *         self.done = !self.done
 *     }
 * }))
 *
 * const todo = Todo.create()
 * todo.done = true // throws!
 * todo.toggle() // OK
 * unprotect(todo)
 * todo.done = false // OK
 */
function unprotect$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    var node = getStateTreeNode$$1(target);
    if (!node.isRoot)
        fail("`unprotect` can only be invoked on root nodes");
    node.isProtectionEnabled = false;
}
/**
 * Returns true if the object is in protected mode, @see protect
 */
function isProtected$$1(target) {
    return getStateTreeNode$$1(target).isProtected;
}
/**
 * Applies a snapshot to a given model instances. Patch and snapshot listeners will be invoked as usual.
 *
 * @export
 * @param {Object} target
 * @param {Object} snapshot
 * @returns
 */
function applySnapshot$$1(target, snapshot) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    return getStateTreeNode$$1(target).applySnapshot(snapshot);
}
/**
 * Calculates a snapshot from the given model instance. The snapshot will always reflect the latest state but use
 * structural sharing where possible. Doesn't require MobX transactions to be completed.
 *
 * @export
 * @param {Object} target
 * @returns {*}
 */
function getSnapshot$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    return getStateTreeNode$$1(target).snapshot;
}
/**
 * Given a model instance, returns `true` if the object has a parent, that is, is part of another object, map or array
 *
 * @export
 * @param {Object} target
 * @param {number} depth = 1, how far should we look upward?
 * @returns {boolean}
 */
function hasParent$$1(target, depth) {
    if (depth === void 0) { depth = 1; }
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof depth !== "number")
            fail("expected second argument to be a number, got " + depth + " instead");
        if (depth < 0)
            fail("Invalid depth: " + depth + ", should be >= 1");
    }
    var parent = getStateTreeNode$$1(target).parent;
    while (parent) {
        if (--depth === 0)
            return true;
        parent = parent.parent;
    }
    return false;
}
/**
 * Returns the immediate parent of this object, or null.
 *
 * Note that the immediate parent can be either an object, map or array, and
 * doesn't necessarily refer to the parent model
 *
 * @export
 * @param {Object} target
 * @param {number} depth = 1, how far should we look upward?
 * @returns {*}
 */
function getParent$$1(target, depth) {
    if (depth === void 0) { depth = 1; }
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof depth !== "number")
            fail("expected second argument to be a number, got " + depth + " instead");
        if (depth < 0)
            fail("Invalid depth: " + depth + ", should be >= 1");
    }
    var d = depth;
    var parent = getStateTreeNode$$1(target).parent;
    while (parent) {
        if (--d === 0)
            return parent.storedValue;
        parent = parent.parent;
    }
    return fail("Failed to find the parent of " + getStateTreeNode$$1(target) + " at depth " + depth);
}
/**
 * Given an object in a model tree, returns the root object of that tree
 *
 * @export
 * @param {Object} target
 * @returns {*}
 */
function getRoot$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    return getStateTreeNode$$1(target).root.storedValue;
}
/**
 * Returns the path of the given object in the model tree
 *
 * @export
 * @param {Object} target
 * @returns {string}
 */
function getPath$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    return getStateTreeNode$$1(target).path;
}
/**
 * Returns the path of the given object as unescaped string array
 *
 * @export
 * @param {Object} target
 * @returns {string[]}
 */
function getPathParts$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    return splitJsonPath$$1(getStateTreeNode$$1(target).path);
}
/**
 * Returns true if the given object is the root of a model tree
 *
 * @export
 * @param {Object} target
 * @returns {boolean}
 */
function isRoot$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    return getStateTreeNode$$1(target).isRoot;
}
/**
 * Resolves a path relatively to a given object.
 * Returns undefined if no value can be found.
 *
 * @export
 * @param {Object} target
 * @param {string} path - escaped json path
 * @returns {*}
 */
function resolvePath$$1(target, path) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof path !== "string")
            fail("expected second argument to be a number, got " + path + " instead");
    }
    var node = resolveNodeByPath$$1(getStateTreeNode$$1(target), path);
    return node ? node.value : undefined;
}
/**
 * Resolves a model instance given a root target, the type and the identifier you are searching for.
 * Returns undefined if no value can be found.
 *
 * @export
 * @param {IType<any, any>} type
 * @param {IStateTreeNode} target
 * @param {(string | number)} identifier
 * @returns {*}
 */
function resolveIdentifier$$1(type, target, identifier$$1) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isType$$1(type))
            fail("expected first argument to be a mobx-state-tree type, got " + type + " instead");
        if (!isStateTreeNode$$1(target))
            fail("expected second argument to be a mobx-state-tree node, got " + target + " instead");
        if (!(typeof identifier$$1 === "string" || typeof identifier$$1 === "number"))
            fail("expected third argument to be a string or number, got " + identifier$$1 + " instead");
    }
    var node = getStateTreeNode$$1(target).root.identifierCache.resolve(type, "" + identifier$$1);
    return node ? node.value : undefined;
}
/**
 *
 *
 * @export
 * @param {Object} target
 * @param {string} path
 * @returns {*}
 */
function tryResolve$$1(target, path) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof path !== "string")
            fail("expected second argument to be a string, got " + path + " instead");
    }
    var node = resolveNodeByPath$$1(getStateTreeNode$$1(target), path, false);
    if (node === undefined)
        return undefined;
    return node ? node.value : undefined;
}
/**
 * Given two state tree nodes that are part of the same tree,
 * returns the shortest jsonpath needed to navigate from the one to the other
 *
 * @export
 * @param {IStateTreeNode} base
 * @param {IStateTreeNode} target
 * @returns {string}
 */
function getRelativePath$$1(base, target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected second argument to be a mobx-state-tree node, got " + target + " instead");
        if (!isStateTreeNode$$1(base))
            fail("expected first argument to be a mobx-state-tree node, got " + base + " instead");
    }
    return getRelativePathBetweenNodes$$1(getStateTreeNode$$1(base), getStateTreeNode$$1(target));
}
/**
 * Returns a deep copy of the given state tree node as new tree.
 * Short hand for `snapshot(x) = getType(x).create(getSnapshot(x))`
 *
 * _Tip: clone will create a literal copy, including the same identifiers. To modify identifiers etc during cloning, don't use clone but take a snapshot of the tree, modify it, and create new instance_
 *
 * @export
 * @template T
 * @param {T} source
 * @param {boolean | any} keepEnvironment indicates whether the clone should inherit the same environment (`true`, the default), or not have an environment (`false`). If an object is passed in as second argument, that will act as the environment for the cloned tree.
 * @returns {T}
 */
function clone$$1(source, keepEnvironment) {
    if (keepEnvironment === void 0) { keepEnvironment = true; }
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(source))
            fail("expected first argument to be a mobx-state-tree node, got " + source + " instead");
    }
    var node = getStateTreeNode$$1(source);
    return node.type.create(node.snapshot, keepEnvironment === true
        ? node.root._environment
        : keepEnvironment === false ? undefined : keepEnvironment); // it's an object or something else
}
/**
 * Removes a model element from the state tree, and let it live on as a new state tree
 */
function detach$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    getStateTreeNode$$1(target).detach();
    return target;
}
/**
 * Removes a model element from the state tree, and mark it as end-of-life; the element should not be used anymore
 */
function destroy$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    var node = getStateTreeNode$$1(target);
    if (node.isRoot)
        node.die();
    else
        node.parent.removeChild(node.subpath);
}
/**
 * Returns true if the given state tree node is not killed yet.
 * This means that the node is still a part of a tree, and that `destroy`
 * has not been called. If a node is not alive anymore, the only thing one can do with it
 * is requesting it's last path and snapshot
 *
 * @export
 * @param {IStateTreeNode} target
 * @returns {boolean}
 */
function isAlive$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    return getStateTreeNode$$1(target).isAlive;
}
/**
 * Use this utility to register a function that should be called whenever the
 * targeted state tree node is destroyed. This is a useful alternative to managing
 * cleanup methods yourself using the `beforeDestroy` hook.
 *
 * @example
 * const Todo = types.model({
 *   title: types.string
 * }).actions(self => ({
 *   afterCreate() {
 *     const autoSaveDisposer = reaction(
 *       () => getSnapshot(self),
 *       snapshot => sendSnapshotToServerSomehow(snapshot)
 *     )
 *     // stop sending updates to server if this
 *     // instance is destroyed
 *     addDisposer(self, autoSaveDisposer)
 *   }
 * }))
 *
 * @export
 * @param {IStateTreeNode} target
 * @param {() => void} disposer
 */
function addDisposer$$1(target, disposer) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof disposer !== "function")
            fail("expected second argument to be a function, got " + disposer + " instead");
    }
    getStateTreeNode$$1(target).addDisposer(disposer);
}
/**
 * Returns the environment of the current state tree. For more info on environments,
 * see [Dependency injection](https://github.com/mobxjs/mobx-state-tree#dependency-injection)
 *
 * Returns an empty environment if the tree wasn't initialized with an environment
 *
 * @export
 * @param {IStateTreeNode} target
 * @returns {*}
 */
function getEnv$$1(target) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
    }
    var node = getStateTreeNode$$1(target);
    var env = node.root._environment;
    if (!!!env)
        return EMPTY_OBJECT;
    return env;
}
/**
 * Performs a depth first walk through a tree
 */
function walk$$1(target, processor) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof processor !== "function")
            fail("expected second argument to be a function, got " + processor + " instead");
    }
    var node = getStateTreeNode$$1(target);
    // tslint:disable-next-line:no_unused-variable
    node.getChildren().forEach(function (child) {
        if (isStateTreeNode$$1(child.storedValue))
            walk$$1(child.storedValue, processor);
    });
    processor(node.storedValue);
}

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = Object.setPrototypeOf ||
    ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
    function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}



function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

var ScalarNode$$1 = /** @class */ (function () {
    function ScalarNode$$1(type, parent, subpath, environment, initialValue, storedValue, canAttachTreeNode, finalizeNewInstance) {
        if (finalizeNewInstance === void 0) { finalizeNewInstance = noop; }
        this.subpath = "";
        this._environment = undefined;
        this._autoUnbox = true; // unboxing is disabled when reading child nodes
        this.state = NodeLifeCycle$$1.INITIALIZING;
        this.type = type;
        this.storedValue = storedValue;
        this._parent = parent;
        this.subpath = subpath;
        this.storedValue = storedValue;
        this._environment = environment;
        this.unbox = this.unbox.bind(this);
        if (canAttachTreeNode)
            addHiddenFinalProp(this.storedValue, "$treenode", this);
        var sawException = true;
        try {
            if (canAttachTreeNode)
                addHiddenFinalProp(this.storedValue, "toJSON", toJSON$$1);
            finalizeNewInstance(this, initialValue);
            this.state = NodeLifeCycle$$1.CREATED;
            sawException = false;
        }
        finally {
            if (sawException) {
                // short-cut to die the instance, to avoid the snapshot computed starting to throw...
                this.state = NodeLifeCycle$$1.DEAD;
            }
        }
    }
    Object.defineProperty(ScalarNode$$1.prototype, "path", {
        /*
         * Returnes (escaped) path representation as string
         */
        get: function () {
            if (!this.parent)
                return "";
            return this.parent.path + "/" + escapeJsonPath$$1(this.subpath);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScalarNode$$1.prototype, "isRoot", {
        get: function () {
            return this.parent === null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScalarNode$$1.prototype, "parent", {
        get: function () {
            return this._parent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScalarNode$$1.prototype, "root", {
        get: function () {
            // future optimization: store root ref in the node and maintain it
            if (!this._parent)
                return fail("This scalar node is not part of a tree");
            return this._parent.root;
        },
        enumerable: true,
        configurable: true
    });
    ScalarNode$$1.prototype.setParent = function (newParent, subpath) {
        if (subpath === void 0) { subpath = null; }
        if (this.parent !== newParent)
            fail("Cannot change parent of immutable node");
        if (this.subpath === subpath)
            return;
        this.subpath = subpath || "";
    };
    Object.defineProperty(ScalarNode$$1.prototype, "value", {
        get: function () {
            return this.type.getValue(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScalarNode$$1.prototype, "snapshot", {
        get: function () {
            var snapshot = this.type.getSnapshot(this);
            // avoid any external modification in dev mode
            if (process.env.NODE_ENV !== "production") {
                return freeze(snapshot);
            }
            return snapshot;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ScalarNode$$1.prototype, "isAlive", {
        get: function () {
            return this.state !== NodeLifeCycle$$1.DEAD;
        },
        enumerable: true,
        configurable: true
    });
    ScalarNode$$1.prototype.unbox = function (childNode) {
        if (childNode && this._autoUnbox === true)
            return childNode.value;
        return childNode;
    };
    ScalarNode$$1.prototype.toString = function () {
        return this.type.name + "@" + (this.path || "<root>") + (this.isAlive ? "" : "[dead]");
    };
    ScalarNode$$1.prototype.die = function () {
        this.state = NodeLifeCycle$$1.DEAD;
    };
    __decorate([
        observable
    ], ScalarNode$$1.prototype, "subpath", void 0);
    return ScalarNode$$1;
}());

var nextNodeId = 1;
var ObjectNode$$1 = /** @class */ (function () {
    function ObjectNode$$1(type, parent, subpath, environment, initialValue, storedValue, canAttachTreeNode, finalizeNewInstance) {
        if (finalizeNewInstance === void 0) { finalizeNewInstance = noop; }
        var _this = this;
        this.nodeId = ++nextNodeId;
        this.subpath = "";
        this._parent = null;
        this._isRunningAction = false; // only relevant for root
        this.isProtectionEnabled = true;
        this.identifierAttribute = undefined; // not to be modified directly, only through model initialization
        this._environment = undefined;
        this._autoUnbox = true; // unboxing is disabled when reading child nodes
        this.state = NodeLifeCycle$$1.INITIALIZING;
        this.middlewares = EMPTY_ARRAY;
        this.type = type;
        this.storedValue = storedValue;
        this._parent = parent;
        this.subpath = subpath;
        this._environment = environment;
        this.unbox = this.unbox.bind(this);
        this.preboot();
        if (!parent)
            this.identifierCache = new IdentifierCache$$1();
        if (canAttachTreeNode)
            addHiddenFinalProp(this.storedValue, "$treenode", this);
        var sawException = true;
        try {
            if (canAttachTreeNode)
                addHiddenFinalProp(this.storedValue, "toJSON", toJSON$$1);
            this._isRunningAction = true;
            finalizeNewInstance(this, initialValue);
            this._isRunningAction = false;
            if (parent)
                parent.root.identifierCache.addNodeToCache(this);
            else
                this.identifierCache.addNodeToCache(this);
            this.fireHook("afterCreate");
            this.state = NodeLifeCycle$$1.CREATED;
            sawException = false;
        }
        finally {
            if (sawException) {
                // short-cut to die the instance, to avoid the snapshot computed starting to throw...
                this.state = NodeLifeCycle$$1.DEAD;
            }
        }
        var snapshotDisposer = reaction(function () { return _this.snapshot; }, function (snapshot) {
            _this.emitSnapshot(snapshot);
        });
        snapshotDisposer.onError(function (e) {
            throw e;
        });
        this.addDisposer(snapshotDisposer);
    }
    Object.defineProperty(ObjectNode$$1.prototype, "path", {
        /*
         * Returnes (escaped) path representation as string
         */
        get: function () {
            if (!this.parent)
                return "";
            return this.parent.path + "/" + escapeJsonPath$$1(this.subpath);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ObjectNode$$1.prototype, "isRoot", {
        get: function () {
            return this.parent === null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ObjectNode$$1.prototype, "parent", {
        get: function () {
            return this._parent;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ObjectNode$$1.prototype, "root", {
        // Optimization: make computed
        get: function () {
            var p, r = this;
            while ((p = r.parent))
                r = p;
            return r;
        },
        enumerable: true,
        configurable: true
    });
    ObjectNode$$1.prototype.setParent = function (newParent, subpath) {
        if (subpath === void 0) { subpath = null; }
        if (this.parent === newParent && this.subpath === subpath)
            return;
        if (newParent) {
            if (this._parent && newParent !== this._parent) {
                fail("A node cannot exists twice in the state tree. Failed to add " + this + " to path '" + newParent.path + "/" + subpath + "'.");
            }
            if (!this._parent && newParent.root === this) {
                fail("A state tree is not allowed to contain itself. Cannot assign " + this + " to path '" + newParent.path + "/" + subpath + "'");
            }
            if (!this._parent &&
                !!this.root._environment &&
                this.root._environment !== newParent.root._environment) {
                fail("A state tree cannot be made part of another state tree as long as their environments are different.");
            }
        }
        if (this.parent && !newParent) {
            this.die();
        }
        else {
            this.subpath = subpath || "";
            if (newParent && newParent !== this._parent) {
                newParent.root.identifierCache.mergeCache(this);
                this._parent = newParent;
                this.fireHook("afterAttach");
            }
        }
    };
    ObjectNode$$1.prototype.fireHook = function (name) {
        var fn = this.storedValue && typeof this.storedValue === "object" && this.storedValue[name];
        if (typeof fn === "function")
            fn.apply(this.storedValue);
    };
    Object.defineProperty(ObjectNode$$1.prototype, "value", {
        get: function () {
            if (!this.isAlive)
                return undefined;
            return this.type.getValue(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ObjectNode$$1.prototype, "snapshot", {
        get: function () {
            if (!this.isAlive)
                return undefined;
            // advantage of using computed for a snapshot is that nicely respects transactions etc.
            var snapshot = this.type.getSnapshot(this);
            // avoid any external modification in dev mode
            if (process.env.NODE_ENV !== "production") {
                return freeze(snapshot);
            }
            return snapshot;
        },
        enumerable: true,
        configurable: true
    });
    ObjectNode$$1.prototype.isRunningAction = function () {
        if (this._isRunningAction)
            return true;
        if (this.isRoot)
            return false;
        return this.parent.isRunningAction();
    };
    Object.defineProperty(ObjectNode$$1.prototype, "identifier", {
        get: function () {
            return this.identifierAttribute ? this.storedValue[this.identifierAttribute] : null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ObjectNode$$1.prototype, "isAlive", {
        get: function () {
            return this.state !== NodeLifeCycle$$1.DEAD;
        },
        enumerable: true,
        configurable: true
    });
    ObjectNode$$1.prototype.assertAlive = function () {
        if (!this.isAlive)
            fail(this + " cannot be used anymore as it has died; it has been removed from a state tree. If you want to remove an element from a tree and let it live on, use 'detach' or 'clone' the value");
    };
    ObjectNode$$1.prototype.getChildNode = function (subpath) {
        this.assertAlive();
        this._autoUnbox = false;
        var res = this.type.getChildNode(this, subpath);
        this._autoUnbox = true;
        return res;
    };
    ObjectNode$$1.prototype.getChildren = function () {
        this.assertAlive();
        this._autoUnbox = false;
        var res = this.type.getChildren(this);
        this._autoUnbox = true;
        return res;
    };
    ObjectNode$$1.prototype.getChildType = function (key) {
        return this.type.getChildType(key);
    };
    Object.defineProperty(ObjectNode$$1.prototype, "isProtected", {
        get: function () {
            return this.root.isProtectionEnabled;
        },
        enumerable: true,
        configurable: true
    });
    ObjectNode$$1.prototype.assertWritable = function () {
        this.assertAlive();
        if (!this.isRunningAction() && this.isProtected) {
            fail("Cannot modify '" + this + "', the object is protected and can only be modified by using an action.");
        }
    };
    ObjectNode$$1.prototype.removeChild = function (subpath) {
        this.type.removeChild(this, subpath);
    };
    ObjectNode$$1.prototype.unbox = function (childNode) {
        if (childNode && this._autoUnbox === true)
            return childNode.value;
        return childNode;
    };
    ObjectNode$$1.prototype.toString = function () {
        var identifier$$1 = this.identifier ? "(id: " + this.identifier + ")" : "";
        return this.type.name + "@" + (this.path || "<root>") + identifier$$1 + (this.isAlive
            ? ""
            : "[dead]");
    };
    ObjectNode$$1.prototype.finalizeCreation = function () {
        // goal: afterCreate hooks runs depth-first. After attach runs parent first, so on afterAttach the parent has completed already
        if (this.state === NodeLifeCycle$$1.CREATED) {
            if (this.parent) {
                if (this.parent.state !== NodeLifeCycle$$1.FINALIZED) {
                    // parent not ready yet, postpone
                    return;
                }
                this.fireHook("afterAttach");
            }
            this.state = NodeLifeCycle$$1.FINALIZED;
            for (var _i = 0, _a = this.getChildren(); _i < _a.length; _i++) {
                var child = _a[_i];
                if (child instanceof ObjectNode$$1)
                    child.finalizeCreation();
            }
        }
    };
    ObjectNode$$1.prototype.detach = function () {
        if (!this.isAlive)
            fail("Error while detaching, node is not alive.");
        if (this.isRoot)
            return;
        else {
            this.fireHook("beforeDetach");
            this._environment = this.root._environment; // make backup of environment
            this.state = NodeLifeCycle$$1.DETACHING;
            this.identifierCache = this.root.identifierCache.splitCache(this);
            this.parent.removeChild(this.subpath);
            this._parent = null;
            this.subpath = "";
            this.state = NodeLifeCycle$$1.FINALIZED;
        }
    };
    ObjectNode$$1.prototype.preboot = function () {
        var _this = this;
        this.disposers = [];
        this.middlewares = [];
        this.snapshotSubscribers = [];
        this.patchSubscribers = [];
        // Optimization: this does not need to be done per instance
        // if some pieces from createActionInvoker are extracted
        this.applyPatches = createActionInvoker$$1(this.storedValue, "@APPLY_PATCHES", function (patches) {
            patches.forEach(function (patch) {
                var parts = splitJsonPath$$1(patch.path);
                var node = resolveNodeByPathParts$$1(_this, parts.slice(0, -1));
                node.applyPatchLocally(parts[parts.length - 1], patch);
            });
        }).bind(this.storedValue);
        this.applySnapshot = createActionInvoker$$1(this.storedValue, "@APPLY_SNAPSHOT", function (snapshot) {
            // if the snapshot is the same as the current one, avoid performing a reconcile
            if (snapshot === _this.snapshot)
                return;
            // else, apply it by calling the type logic
            return _this.type.applySnapshot(_this, snapshot);
        }).bind(this.storedValue);
    };
    ObjectNode$$1.prototype.die = function () {
        if (this.state === NodeLifeCycle$$1.DETACHING)
            return;
        if (isStateTreeNode$$1(this.storedValue)) {
            // optimization: don't use walk, but getChildNodes for more efficiency
            walk$$1(this.storedValue, function (child) {
                var node = getStateTreeNode$$1(child);
                if (node instanceof ObjectNode$$1)
                    node.aboutToDie();
            });
            walk$$1(this.storedValue, function (child) {
                var node = getStateTreeNode$$1(child);
                if (node instanceof ObjectNode$$1)
                    node.finalizeDeath();
            });
        }
    };
    ObjectNode$$1.prototype.aboutToDie = function () {
        this.disposers.splice(0).forEach(function (f) { return f(); });
        this.fireHook("beforeDestroy");
    };
    ObjectNode$$1.prototype.finalizeDeath = function () {
        // invariant: not called directly but from "die"
        this.root.identifierCache.notifyDied(this);
        var self = this;
        var oldPath = this.path;
        addReadOnlyProp(this, "snapshot", this.snapshot); // kill the computed prop and just store the last snapshot
        this.patchSubscribers.splice(0);
        this.snapshotSubscribers.splice(0);
        this.patchSubscribers.splice(0);
        this.state = NodeLifeCycle$$1.DEAD;
        this._parent = null;
        this.subpath = "";
        // This is quite a hack, once interceptable objects / arrays / maps are extracted from mobx,
        // we could express this in a much nicer way
        // TODO: should be possible to obtain id's still...
        Object.defineProperty(this.storedValue, "$mobx", {
            get: function () {
                fail("This object has died and is no longer part of a state tree. It cannot be used anymore. The object (of type '" + self
                    .type
                    .name + "') used to live at '" + oldPath + "'. It is possible to access the last snapshot of this object using 'getSnapshot', or to create a fresh copy using 'clone'. If you want to remove an object from the tree without killing it, use 'detach' instead.");
            }
        });
    };
    ObjectNode$$1.prototype.onSnapshot = function (onChange) {
        return registerEventHandler(this.snapshotSubscribers, onChange);
    };
    ObjectNode$$1.prototype.emitSnapshot = function (snapshot) {
        this.snapshotSubscribers.forEach(function (f) { return f(snapshot); });
    };
    ObjectNode$$1.prototype.onPatch = function (handler) {
        return registerEventHandler(this.patchSubscribers, handler);
    };
    ObjectNode$$1.prototype.emitPatch = function (basePatch, source) {
        if (this.patchSubscribers.length) {
            var localizedPatch = extend({}, basePatch, {
                path: source.path.substr(this.path.length) + "/" + basePatch.path // calculate the relative path of the patch
            });
            var _a = splitPatch$$1(localizedPatch), patch_1 = _a[0], reversePatch_1 = _a[1];
            this.patchSubscribers.forEach(function (f) { return f(patch_1, reversePatch_1); });
        }
        if (this.parent)
            this.parent.emitPatch(basePatch, source);
    };
    ObjectNode$$1.prototype.addDisposer = function (disposer) {
        this.disposers.unshift(disposer);
    };
    ObjectNode$$1.prototype.addMiddleWare = function (handler) {
        return registerEventHandler(this.middlewares, handler);
    };
    ObjectNode$$1.prototype.applyPatchLocally = function (subpath, patch) {
        this.assertWritable();
        this.type.applyPatchLocally(this, subpath, patch);
    };
    __decorate([
        observable
    ], ObjectNode$$1.prototype, "subpath", void 0);
    __decorate([
        observable
    ], ObjectNode$$1.prototype, "_parent", void 0);
    __decorate([
        computed
    ], ObjectNode$$1.prototype, "path", null);
    __decorate([
        computed
    ], ObjectNode$$1.prototype, "value", null);
    __decorate([
        computed
    ], ObjectNode$$1.prototype, "snapshot", null);
    return ObjectNode$$1;
}());

var TypeFlags$$1;
(function (TypeFlags$$1) {
    TypeFlags$$1[TypeFlags$$1["String"] = 1] = "String";
    TypeFlags$$1[TypeFlags$$1["Number"] = 2] = "Number";
    TypeFlags$$1[TypeFlags$$1["Boolean"] = 4] = "Boolean";
    TypeFlags$$1[TypeFlags$$1["Date"] = 8] = "Date";
    TypeFlags$$1[TypeFlags$$1["Literal"] = 16] = "Literal";
    TypeFlags$$1[TypeFlags$$1["Array"] = 32] = "Array";
    TypeFlags$$1[TypeFlags$$1["Map"] = 64] = "Map";
    TypeFlags$$1[TypeFlags$$1["Object"] = 128] = "Object";
    TypeFlags$$1[TypeFlags$$1["Frozen"] = 256] = "Frozen";
    TypeFlags$$1[TypeFlags$$1["Optional"] = 512] = "Optional";
    TypeFlags$$1[TypeFlags$$1["Reference"] = 1024] = "Reference";
    TypeFlags$$1[TypeFlags$$1["Identifier"] = 2048] = "Identifier";
    TypeFlags$$1[TypeFlags$$1["Late"] = 4096] = "Late";
    TypeFlags$$1[TypeFlags$$1["Refinement"] = 8192] = "Refinement";
    TypeFlags$$1[TypeFlags$$1["Union"] = 16384] = "Union";
    TypeFlags$$1[TypeFlags$$1["Null"] = 32768] = "Null";
    TypeFlags$$1[TypeFlags$$1["Undefined"] = 65536] = "Undefined";
})(TypeFlags$$1 || (TypeFlags$$1 = {}));
/*
 * A complex type produces a MST node (Node in the state tree)
 */
var ComplexType$$1 = /** @class */ (function () {
    function ComplexType$$1(name) {
        this.isType = true;
        this.name = name;
    }
    ComplexType$$1.prototype.create = function (snapshot, environment) {
        if (snapshot === void 0) { snapshot = this.getDefaultSnapshot(); }
        typecheck$$1(this, snapshot);
        return this.instantiate(null, "", environment, snapshot).value;
    };
    ComplexType$$1.prototype.isAssignableFrom = function (type) {
        return type === this;
    };
    ComplexType$$1.prototype.validate = function (value, context) {
        if (isStateTreeNode$$1(value)) {
            return getType$$1(value) === this || this.isAssignableFrom(getType$$1(value))
                ? typeCheckSuccess$$1()
                : typeCheckFailure$$1(context, value);
            // it is tempting to compare snapshots, but in that case we should always clone on assignments...
        }
        return this.isValidSnapshot(value, context);
    };
    ComplexType$$1.prototype.is = function (value) {
        return this.validate(value, [{ path: "", type: this }]).length === 0;
    };
    ComplexType$$1.prototype.reconcile = function (current, newValue) {
        if (current.snapshot === newValue)
            // newValue is the current snapshot of the node, noop
            return current;
        if (isStateTreeNode$$1(newValue) && getStateTreeNode$$1(newValue) === current)
            // the current node is the same as the new one
            return current;
        if (current.type === this &&
            isMutable(newValue) &&
            !isStateTreeNode$$1(newValue) &&
            (!current.identifierAttribute ||
                current.identifier === newValue[current.identifierAttribute])) {
            // the newValue has no node, so can be treated like a snapshot
            // we can reconcile
            current.applySnapshot(newValue);
            return current;
        }
        // current node cannot be recycled in any way
        var parent = current.parent, subpath = current.subpath;
        current.die();
        // attempt to reuse the new one
        if (isStateTreeNode$$1(newValue) && this.isAssignableFrom(getType$$1(newValue))) {
            // newValue is a Node as well, move it here..
            var newNode = getStateTreeNode$$1(newValue);
            newNode.setParent(parent, subpath);
            return newNode;
        }
        // nothing to do, we have to create a new node
        return this.instantiate(parent, subpath, current._environment, newValue);
    };
    Object.defineProperty(ComplexType$$1.prototype, "Type", {
        get: function () {
            return fail("Factory.Type should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.Type`");
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ComplexType$$1.prototype, "SnapshotType", {
        get: function () {
            return fail("Factory.SnapshotType should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.SnapshotType`");
        },
        enumerable: true,
        configurable: true
    });
    __decorate([
        action
    ], ComplexType$$1.prototype, "create", null);
    return ComplexType$$1;
}());
var Type$$1 = /** @class */ (function (_super) {
    __extends(Type$$1, _super);
    function Type$$1(name) {
        return _super.call(this, name) || this;
    }
    Type$$1.prototype.getValue = function (node) {
        return node.storedValue;
    };
    Type$$1.prototype.getSnapshot = function (node) {
        return node.storedValue;
    };
    Type$$1.prototype.getDefaultSnapshot = function () {
        return undefined;
    };
    Type$$1.prototype.applySnapshot = function (node, snapshot) {
        fail("Immutable types do not support applying snapshots");
    };
    Type$$1.prototype.applyPatchLocally = function (node, subpath, patch) {
        fail("Immutable types do not support applying patches");
    };
    Type$$1.prototype.getChildren = function (node) {
        return EMPTY_ARRAY;
    };
    Type$$1.prototype.getChildNode = function (node, key) {
        return fail("No child '" + key + "' available in type: " + this.name);
    };
    Type$$1.prototype.getChildType = function (key) {
        return fail("No child '" + key + "' available in type: " + this.name);
    };
    Type$$1.prototype.reconcile = function (current, newValue) {
        // reconcile only if type and value are still the same
        if (current.type === this && current.storedValue === newValue)
            return current;
        var res = this.instantiate(current.parent, current.subpath, current._environment, newValue);
        current.die();
        return res;
    };
    Type$$1.prototype.removeChild = function (node, subpath) {
        return fail("No child '" + subpath + "' available in type: " + this.name);
    };
    return Type$$1;
}(ComplexType$$1));
function isType$$1(value) {
    return typeof value === "object" && value && value.isType === true;
}

/**
 * Convenience utility to create action based middleware that supports async processes more easily.
 * All hooks are called for both synchronous and asynchronous actions. Except that either `onSuccess` or `onFail` is called
 *
 * The create middleware tracks the process of an action (assuming it passes the `filter`).
 * `onResume` can return any value, which will be passed as second argument to any other hook. This makes it possible to keep state during a process.
 *
 * See the `atomic` middleware for an example
 *
 * @export
 * @template T
 * @template any
 * @param {{
 *     filter?: (call: IMiddlewareEvent) => boolean
 *     onStart: (call: IMiddlewareEvent) => T
 *     onResume: (call: IMiddlewareEvent, context: T) => void
 *     onSuspend: (call: IMiddlewareEvent, context: T) => void
 *     onSuccess: (call: IMiddlewareEvent, context: T, result: any) => void
 *     onFail: (call: IMiddlewareEvent, context: T, error: any) => void
 * }} hooks
 * @returns {IMiddlewareHandler}
 */
function createActionTrackingMiddleware(hooks) {
    var runningActions = new Map();
    return function actionTrackingMiddleware(call, next) {
        switch (call.type) {
            case "action": {
                if (!hooks.filter || hooks.filter(call) === true) {
                    var context = hooks.onStart(call);
                    hooks.onResume(call, context);
                    runningActions.set(call.id, {
                        call: call,
                        context: context,
                        async: false
                    });
                    try {
                        var res = next(call);
                        hooks.onSuspend(call, context);
                        if (runningActions.get(call.id).async === false) {
                            hooks.onSuccess(call, context, res);
                        }
                        return res;
                    }
                    catch (e) {
                        hooks.onFail(call, context, e);
                        throw e;
                    }
                }
                else {
                    return next(call);
                }
            }
            case "flow_spawn": {
                var root = runningActions.get(call.rootId);
                root.async = true;
                return next(call);
            }
            case "flow_resume":
            case "flow_resume_error": {
                var root = runningActions.get(call.rootId);
                hooks.onResume(call, root.context);
                try {
                    return next(call);
                }
                finally {
                    hooks.onSuspend(call, root.context);
                }
            }
            case "flow_throw": {
                var root = runningActions.get(call.rootId);
                runningActions.delete(call.id);
                hooks.onFail(call, root.context, call.args[0]);
                return next(call);
            }
            case "flow_return": {
                var root = runningActions.get(call.rootId);
                runningActions.delete(call.id);
                hooks.onSuccess(call, root.context, call.args[0]);
                return next(call);
            }
        }
    };
}

function serializeArgument(node, actionName, index, arg) {
    if (arg instanceof Date)
        return { $MST_DATE: arg.getTime() };
    if (isPrimitive(arg))
        return arg;
    // We should not serialize MST nodes, even if we can, because we don't know if the receiving party can handle a raw snapshot instead of an
    // MST type instance. So if one wants to serialize a MST node that was pass in, either explitly pass: 1: an id, 2: a (relative) path, 3: a snapshot
    if (isStateTreeNode$$1(arg))
        return serializeTheUnserializable("[MSTNode: " + getType$$1(arg).name + "]");
    if (typeof arg === "function")
        return serializeTheUnserializable("[function]");
    if (typeof arg === "object" && !isPlainObject(arg) && !isArray(arg))
        return serializeTheUnserializable("[object " + ((arg && arg.constructor && arg.constructor.name) || "Complex Object") + "]");
    try {
        // Check if serializable, cycle free etc...
        // MWE: there must be a better way....
        JSON.stringify(arg); // or throws
        return arg;
    }
    catch (e) {
        return serializeTheUnserializable("" + e);
    }
}
function deserializeArgument(adm, value) {
    if (value && typeof value === "object" && "$MST_DATE" in value)
        return new Date(value["$MST_DATE"]);
    return value;
}
function serializeTheUnserializable(baseType) {
    return {
        $MST_UNSERIALIZABLE: true,
        type: baseType
    };
}
/**
 * Applies an action or a series of actions in a single MobX transaction.
 * Does not return any value
 * Takes an action description as produced by the `onAction` middleware.
 *
 * @export
 * @param {Object} target
 * @param {IActionCall[]} actions
 * @param {IActionCallOptions} [options]
 */
function applyAction$$1(target, actions) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (typeof actions !== "object")
            fail("expected second argument to be an object or array, got " + actions + " instead");
    }
    runInAction(function () {
        asArray(actions).forEach(function (action$$1) { return baseApplyAction(target, action$$1); });
    });
}
function baseApplyAction(target, action$$1) {
    var resolvedTarget = tryResolve$$1(target, action$$1.path || "");
    if (!resolvedTarget)
        return fail("Invalid action path: " + (action$$1.path || ""));
    var node = getStateTreeNode$$1(resolvedTarget);
    // Reserved functions
    if (action$$1.name === "@APPLY_PATCHES") {
        return applyPatch$$1.call(null, resolvedTarget, action$$1.args[0]);
    }
    if (action$$1.name === "@APPLY_SNAPSHOT") {
        return applySnapshot$$1.call(null, resolvedTarget, action$$1.args[0]);
    }
    if (!(typeof resolvedTarget[action$$1.name] === "function"))
        fail("Action '" + action$$1.name + "' does not exist in '" + node.path + "'");
    return resolvedTarget[action$$1.name].apply(resolvedTarget, action$$1.args ? action$$1.args.map(function (v) { return deserializeArgument(node, v); }) : []);
}
/**
 * Small abstraction around `onAction` and `applyAction`, attaches an action listener to a tree and records all the actions emitted.
 * Returns an recorder object with the following signature:
 *
 * @example
 * export interface IActionRecorder {
 *      // the recorded actions
 *      actions: ISerializedActionCall[]
 *      // stop recording actions
 *      stop(): any
 *      // apply all the recorded actions on the given object
 *      replay(target: IStateTreeNode): any
 * }
 *
 * @export
 * @param {IStateTreeNode} subject
 * @returns {IPatchRecorder}
 */
function recordActions$$1(subject) {
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(subject))
            fail("expected first argument to be a mobx-state-tree node, got " + subject + " instead");
    }
    var recorder = {
        actions: [],
        stop: function () { return disposer(); },
        replay: function (target) {
            applyAction$$1(target, recorder.actions);
        }
    };
    var disposer = onAction$$1(subject, recorder.actions.push.bind(recorder.actions));
    return recorder;
}
/**
 * Registers a function that will be invoked for each action that is called on the provided model instance, or to any of its children.
 * See [actions](https://github.com/mobxjs/mobx-state-tree#actions) for more details. onAction events are emitted only for the outermost called action in the stack.
 * Action can also be intercepted by middleware using addMiddleware to change the function call before it will be run.
 *
 * Not all action arguments might be serializable. For unserializable arguments, a struct like `{ $MST_UNSERIALIZABLE: true, type: "someType" }` will be generated.
 * MST Nodes are considered non-serializable as well (they could be serialized as there snapshot, but it is uncertain whether an replaying party will be able to handle such a non-instantiated snapshot).
 * Rather, when using `onAction` middleware, one should consider in passing arguments which are 1: an id, 2: a (relative) path, or 3: a snapshot. Instead of a real MST node.
 *
 * @example
 * const Todo = types.model({
 *   task: types.string
 * })
 *
 * const TodoStore = types.model({
 *   todos: types.array(Todo)
 * }).actions(self => ({
 *   add(todo) {
 *     self.todos.push(todo);
 *   }
 * }))
 *
 * const s = TodoStore.create({ todos: [] })
 *
 * let disposer = onAction(s, (call) => {
 *   console.log(call);
 * })
 *
 * s.add({ task: "Grab a coffee" })
 * // Logs: { name: "add", path: "", args: [{ task: "Grab a coffee" }] }
 *
 * @export
 * @param {IStateTreeNode} target
 * @param {(call: ISerializedActionCall) => void} listener
 * @param attachAfter {boolean} (default false) fires the listener *after* the action has executed instead of before.
 * @returns {IDisposer}
 */
function onAction$$1(target, listener, attachAfter) {
    if (attachAfter === void 0) { attachAfter = false; }
    // check all arguments
    if (process.env.NODE_ENV !== "production") {
        if (!isStateTreeNode$$1(target))
            fail("expected first argument to be a mobx-state-tree node, got " + target + " instead");
        if (!isRoot$$1(target))
            console.warn("[mobx-state-tree] Warning: Attaching onAction listeners to non root nodes is dangerous: No events will be emitted for actions initiated higher up in the tree.");
        if (!isProtected$$1(target))
            console.warn("[mobx-state-tree] Warning: Attaching onAction listeners to non protected nodes is dangerous: No events will be emitted for direct modifications without action.");
    }
    function fireListener(rawCall) {
        if (rawCall.type === "action" && rawCall.id === rawCall.rootId) {
            var sourceNode_1 = getStateTreeNode$$1(rawCall.context);
            listener({
                name: rawCall.name,
                path: getRelativePathBetweenNodes$$1(getStateTreeNode$$1(target), sourceNode_1),
                args: rawCall.args.map(function (arg, index) {
                    return serializeArgument(sourceNode_1, rawCall.name, index, arg);
                })
            });
        }
    }
    return addMiddleware$$1(target, attachAfter
        ? function onActionMiddleware(rawCall, next) {
            var res = next(rawCall);
            fireListener(rawCall);
            return res;
        }
        : function onActionMiddleware(rawCall, next) {
            fireListener(rawCall);
            return next(rawCall);
        });
}

var nextActionId = 1;
var currentActionContext = null;
function getNextActionId$$1() {
    return nextActionId++;
}
function runWithActionContext$$1(context, fn) {
    var node = getStateTreeNode$$1(context.context);
    var baseIsRunningAction = node._isRunningAction;
    var prevContext = currentActionContext;
    node.assertAlive();
    node._isRunningAction = true;
    currentActionContext = context;
    try {
        return runMiddleWares(node, context, fn);
    }
    finally {
        currentActionContext = prevContext;
        node._isRunningAction = baseIsRunningAction;
    }
}
function getActionContext$$1() {
    if (!currentActionContext)
        return fail("Not running an action!");
    return currentActionContext;
}
function createActionInvoker$$1(target, name, fn) {
    return function () {
        var id = getNextActionId$$1();
        return runWithActionContext$$1({
            type: "action",
            name: name,
            id: id,
            args: argsToArray(arguments),
            context: target,
            tree: getRoot$$1(target),
            rootId: currentActionContext ? currentActionContext.rootId : id,
            parentId: currentActionContext ? currentActionContext.id : 0
        }, fn);
    };
}
/**
 * Middleware can be used to intercept any action is invoked on the subtree where it is attached.
 * If a tree is protected (by default), this means that any mutation of the tree will pass through your middleware.
 *
 * For more details, see the [middleware docs](docs/middleware.md)
 *
 * @export
 * @param {IStateTreeNode} target
 * @param {(action: IRawActionCall, next: (call: IRawActionCall) => any) => any} middleware
 * @returns {IDisposer}
 */
function addMiddleware$$1(target, middleware) {
    var node = getStateTreeNode$$1(target);
    if (process.env.NODE_ENV !== "production") {
        if (!node.isProtectionEnabled)
            console.warn("It is recommended to protect the state tree before attaching action middleware, as otherwise it cannot be guaranteed that all changes are passed through middleware. See `protect`");
    }
    return node.addMiddleWare(middleware);
}
/**
 * Binds middleware to a specific action
 *
 * @example
 * type.actions(self => {
 *   function takeA____() {
 *       self.toilet.donate()
 *       self.wipe()
 *       self.wipe()
 *       self.toilet.flush()
 *   }
 *   return {
 *     takeA____: decorate(atomic, takeA____)
 *   }
 * })
 *
 * @export
 * @template T
 * @param {IMiddlewareHandler} middleware
 * @param Function} fn
 * @returns the original function
 */
function decorate$$1(middleware, fn) {
    if (fn.$mst_middleware)
        fn.$mst_middleware.push(middleware);
    else
        fn.$mst_middleware = [middleware];
    return fn;
}
function collectMiddlewareHandlers(node, baseCall, fn) {
    var handlers = fn.$mst_middleware || EMPTY_ARRAY;
    var n = node;
    // Find all middlewares. Optimization: cache this?
    while (n) {
        if (n.middlewares)
            handlers = handlers.concat(n.middlewares);
        n = n.parent;
    }
    return handlers;
}
function runMiddleWares(node, baseCall, originalFn) {
    var handlers = collectMiddlewareHandlers(node, baseCall, originalFn);
    // Short circuit
    if (!handlers.length)
        return action(originalFn).apply(null, baseCall.args);
    var index = 0;
    function runNextMiddleware(call) {
        var handler = handlers[index++];
        if (handler)
            return handler(call, runNextMiddleware);
        else
            return action(originalFn).apply(null, baseCall.args);
    }
    return runNextMiddleware(baseCall);
}

function safeStringify(value) {
    try {
        return JSON.stringify(value);
    }
    catch (e) {
        return "<Unserializable: " + e + ">";
    }
}
function prettyPrintValue$$1(value) {
    return typeof value === "function"
        ? "<function" + (value.name ? " " + value.name : "") + ">"
        : isStateTreeNode$$1(value) ? "<" + value + ">" : "`" + safeStringify(value) + "`";
}
function toErrorString(error) {
    var value = error.value;
    var type = error.context[error.context.length - 1].type;
    var fullPath = error.context
        .map(function (_a) {
        var path = _a.path;
        return path;
    })
        .filter(function (path) { return path.length > 0; })
        .join("/");
    var pathPrefix = fullPath.length > 0 ? "at path \"/" + fullPath + "\" " : "";
    var currentTypename = isStateTreeNode$$1(value)
        ? "value of type " + getStateTreeNode$$1(value).type.name + ":"
        : isPrimitive(value) ? "value" : "snapshot";
    var isSnapshotCompatible = type && isStateTreeNode$$1(value) && type.is(getStateTreeNode$$1(value).snapshot);
    return ("" + pathPrefix + currentTypename + " " + prettyPrintValue$$1(value) + " is not assignable " + (type
        ? "to type: `" + type.name + "`"
        : "") +
        (error.message ? " (" + error.message + ")" : "") +
        (type
            ? isPrimitiveType$$1(type)
                ? "."
                : ", expected an instance of `" + type.name + "` or a snapshot like `" + type.describe() + "` instead." +
                    (isSnapshotCompatible
                        ? " (Note that a snapshot of the provided value is compatible with the targeted type)"
                        : "")
            : "."));
}

function getContextForPath$$1(context, path, type) {
    return context.concat([{ path: path, type: type }]);
}
function typeCheckSuccess$$1() {
    return EMPTY_ARRAY;
}
function typeCheckFailure$$1(context, value, message) {
    return [{ context: context, value: value, message: message }];
}
function flattenTypeErrors$$1(errors) {
    return errors.reduce(function (a, i) { return a.concat(i); }, []);
}
// TODO; doublecheck: typecheck should only needed to be invoked from: type.create and array / map / value.property will change
function typecheck$$1(type, value) {
    // if not in dev-mode, do not even try to run typecheck. Everything is developer fault!
    if (process.env.NODE_ENV === "production")
        return;
    typecheckPublic$$1(type, value);
}
/**
 * Run's the typechecker on the given type.
 * Throws if the given value is not according the provided type specification.
 * Use this if you need typechecks even in a production build (by default all automatic runtime type checks will be skipped in production builds)
 *
 * @alias typecheck
 * @export
 * @param {IType<any, any>} type
 * @param {*} value
 */
function typecheckPublic$$1(type, value) {
    var errors = type.validate(value, [{ path: "", type: type }]);
    if (errors.length > 0) {
        fail("Error while converting " + prettyPrintValue$$1(value) + " to `" + type.name + "`:\n" +
            errors.map(toErrorString).join("\n"));
    }
}

var IdentifierCache$$1 = /** @class */ (function () {
    function IdentifierCache$$1() {
        this.cache = observable.map();
    }
    IdentifierCache$$1.prototype.addNodeToCache = function (node) {
        if (node.identifierAttribute) {
            var identifier$$1 = node.identifier;
            if (!this.cache.has(identifier$$1)) {
                this.cache.set(identifier$$1, observable.shallowArray());
            }
            var set = this.cache.get(identifier$$1);
            if (set.indexOf(node) !== -1)
                fail("Already registered");
            set.push(node);
        }
        return this;
    };
    IdentifierCache$$1.prototype.mergeCache = function (node) {
        var _this = this;
        node.identifierCache.cache.values().forEach(function (nodes) {
            return nodes.forEach(function (child) {
                _this.addNodeToCache(child);
            });
        });
    };
    IdentifierCache$$1.prototype.notifyDied = function (node) {
        if (node.identifierAttribute) {
            var set = this.cache.get(node.identifier);
            if (set)
                set.remove(node);
        }
    };
    IdentifierCache$$1.prototype.splitCache = function (node) {
        var res = new IdentifierCache$$1();
        var basePath = node.path;
        this.cache.values().forEach(function (nodes) {
            for (var i = nodes.length - 1; i >= 0; i--) {
                if (nodes[i].path.indexOf(basePath) === 0) {
                    res.addNodeToCache(nodes[i]);
                    nodes.splice(i, 1);
                }
            }
        });
        return res;
    };
    IdentifierCache$$1.prototype.resolve = function (type, identifier$$1) {
        var set = this.cache.get(identifier$$1);
        if (!set)
            return null;
        var matches = set.filter(function (candidate) { return type.isAssignableFrom(candidate.type); });
        switch (matches.length) {
            case 0:
                return null;
            case 1:
                return matches[0];
            default:
                return fail("Cannot resolve a reference to type '" + type.name + "' with id: '" + identifier$$1 + "' unambigously, there are multiple candidates: " + matches
                    .map(function (n) { return n.path; })
                    .join(", "));
        }
    };
    return IdentifierCache$$1;
}());

// TODO: split into object and scalar node?
function createNode$$1(type, parent, subpath, environment, initialValue, createNewInstance, finalizeNewInstance) {
    if (createNewInstance === void 0) { createNewInstance = identity; }
    if (finalizeNewInstance === void 0) { finalizeNewInstance = noop; }
    if (isStateTreeNode$$1(initialValue)) {
        var targetNode = initialValue.$treenode;
        if (!targetNode.isRoot)
            fail("Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '" + (parent
                ? parent.path
                : "") + "/" + subpath + "', but it lives already at '" + targetNode.path + "'");
        targetNode.setParent(parent, subpath);
        return targetNode;
    }
    var storedValue = createNewInstance(initialValue);
    if (type.shouldAttachNode) {
        var node = new ObjectNode$$1(type, parent, subpath, environment, initialValue, storedValue, type.shouldAttachNode, finalizeNewInstance);
        node.finalizeCreation();
        return node;
    }
    return new ScalarNode$$1(type, parent, subpath, environment, initialValue, storedValue, type.shouldAttachNode, finalizeNewInstance);
}
function isNode$$1(value) {
    return value instanceof ScalarNode$$1 || value instanceof ObjectNode$$1;
}

var NodeLifeCycle$$1;
(function (NodeLifeCycle$$1) {
    NodeLifeCycle$$1[NodeLifeCycle$$1["INITIALIZING"] = 0] = "INITIALIZING";
    NodeLifeCycle$$1[NodeLifeCycle$$1["CREATED"] = 1] = "CREATED";
    NodeLifeCycle$$1[NodeLifeCycle$$1["FINALIZED"] = 2] = "FINALIZED";
    NodeLifeCycle$$1[NodeLifeCycle$$1["DETACHING"] = 3] = "DETACHING";
    NodeLifeCycle$$1[NodeLifeCycle$$1["DEAD"] = 4] = "DEAD"; // no coming back from this one
})(NodeLifeCycle$$1 || (NodeLifeCycle$$1 = {}));
/**
 * Returns true if the given value is a node in a state tree.
 * More precisely, that is, if the value is an instance of a
 * `types.model`, `types.array` or `types.map`.
 *
 * @export
 * @param {*} value
 * @returns {value is IStateTreeNode}
 */
function isStateTreeNode$$1(value) {
    return !!(value && value.$treenode);
}
function getStateTreeNode$$1(value) {
    if (isStateTreeNode$$1(value))
        return value.$treenode;
    else
        return fail("Value " + value + " is no MST Node");
}

function toJSON$$1() {
    return getStateTreeNode$$1(this).snapshot;
}
var doubleDot = function (_) { return ".."; };
function getRelativePathBetweenNodes$$1(base, target) {
    // PRE condition target is (a child of) base!
    if (base.root !== target.root)
        fail("Cannot calculate relative path: objects '" + base + "' and '" + target + "' are not part of the same object tree");
    var baseParts = splitJsonPath$$1(base.path);
    var targetParts = splitJsonPath$$1(target.path);
    var common = 0;
    for (; common < baseParts.length; common++) {
        if (baseParts[common] !== targetParts[common])
            break;
    }
    // TODO: assert that no targetParts paths are "..", "." or ""!
    return (baseParts
        .slice(common)
        .map(doubleDot)
        .join("/") + joinJsonPath$$1(targetParts.slice(common)));
}
function resolveNodeByPath$$1(base, path, failIfResolveFails) {
    if (failIfResolveFails === void 0) { failIfResolveFails = true; }
    return resolveNodeByPathParts$$1(base, splitJsonPath$$1(path), failIfResolveFails);
}
function resolveNodeByPathParts$$1(base, pathParts, failIfResolveFails) {
    if (failIfResolveFails === void 0) { failIfResolveFails = true; }
    // counter part of getRelativePath
    // note that `../` is not part of the JSON pointer spec, which is actually a prefix format
    // in json pointer: "" = current, "/a", attribute a, "/" is attribute "" etc...
    // so we treat leading ../ apart...
    var current = base;
    for (var i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === "")
            current = current.root;
        else if (pathParts[i] === "..")
            current = current.parent;
        else if (pathParts[i] === "." || pathParts[i] === "")
            // '/bla' or 'a//b' splits to empty strings
            continue;
        else if (current) {
            if (current instanceof ObjectNode$$1)
                current = current.getChildNode(pathParts[i]);
            else
                return fail("Illegal state");
            continue;
        }
        if (!current) {
            if (failIfResolveFails)
                return fail("Could not resolve '" + pathParts[i] + "' in '" + joinJsonPath$$1(pathParts.slice(0, i - 1)) + "', path of the patch does not resolve");
            else
                return undefined;
        }
    }
    return current;
}

// based on: https://github.com/mobxjs/mobx-utils/blob/master/src/async-action.ts
/*
    All contents of this file are deprecated.

    The term `process` has been replaced with `flow` to avoid conflicts with the
    global `process` object.

    Refer to `flow.ts` for any further changes to this implementation.
*/
var DEPRECATION_MESSAGE = "See https://github.com/mobxjs/mobx-state-tree/issues/399 for more information. " +
    "Note that the middleware event types starting with `process` now start with `flow`.";
/**
 * @deprecated has been renamed to `flow()`.
 * See https://github.com/mobxjs/mobx-state-tree/issues/399 for more information.
 * Note that the middleware event types starting with `process` now start with `flow`.
 *
 * @export
 * @alias process
 * @returns {Promise}
 */
function process$1$$1(asyncAction) {
    deprecated("process", "`process()` has been renamed to `flow()`. " + DEPRECATION_MESSAGE);
    return flow(asyncAction);
}

var EMPTY_ARRAY = Object.freeze([]);
var EMPTY_OBJECT = Object.freeze({});
function fail(message) {
    if (message === void 0) { message = "Illegal state"; }
    throw new Error("[mobx-state-tree] " + message);
}
function identity(_) {
    return _;
}

function noop() { }
function isArray(val) {
    return !!(Array.isArray(val) || isObservableArray(val));
}
function asArray(val) {
    if (!val)
        return EMPTY_ARRAY;
    if (isArray(val))
        return val;
    return [val];
}
function extend(a) {
    var b = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        b[_i - 1] = arguments[_i];
    }
    for (var i = 0; i < b.length; i++) {
        var current = b[i];
        for (var key in current)
            a[key] = current[key];
    }
    return a;
}

function isPlainObject(value) {
    if (value === null || typeof value !== "object")
        return false;
    var proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}
function isMutable(value) {
    return (value !== null &&
        typeof value === "object" &&
        !(value instanceof Date) &&
        !(value instanceof RegExp));
}
function isPrimitive(value) {
    if (value === null || value === undefined)
        return true;
    if (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value instanceof Date)
        return true;
    return false;
}
function freeze(value) {
    return isPrimitive(value) ? value : Object.freeze(value);
}
function deepFreeze(value) {
    freeze(value);
    if (isPlainObject(value)) {
        Object.keys(value).forEach(function (propKey) {
            if (!isPrimitive(value[propKey]) &&
                !Object.isFrozen(value[propKey])) {
                deepFreeze(value[propKey]);
            }
        });
    }
    return value;
}
function isSerializable(value) {
    return typeof value !== "function";
}
function addHiddenFinalProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: false,
        writable: false,
        configurable: true,
        value: value
    });
}

function addReadOnlyProp(object, propName, value) {
    Object.defineProperty(object, propName, {
        enumerable: true,
        writable: false,
        configurable: true,
        value: value
    });
}
function remove(collection, item) {
    var idx = collection.indexOf(item);
    if (idx !== -1)
        collection.splice(idx, 1);
}
function registerEventHandler(handlers, handler) {
    handlers.push(handler);
    return function () {
        remove(handlers, handler);
    };
}

function argsToArray(args) {
    var res = new Array(args.length);
    for (var i = 0; i < args.length; i++)
        res[i] = args[i];
    return res;
}
var deprecated = function () { };
deprecated = function (id, message) {
    // skip if running production
    if (process.env.NODE_ENV === "production")
        return;
    // warn if hasn't been warned before
    if (deprecated.ids && !deprecated.ids.hasOwnProperty(id)) {
        console.warn("[mobx-state-tree] Deprecation warning: " + message);
    }
    // mark as warned to avoid duplicate warn message
    if (deprecated.ids)
        deprecated.ids[id] = true;
};
deprecated.ids = {};

// based on: https://github.com/mobxjs/mobx-utils/blob/master/src/async-action.ts
/**
 * See [asynchronous actions](https://github.com/mobxjs/mobx-state-tree/blob/master/docs/async-actions.md).
 *
 * @export
 * @alias flow
 * @returns {Promise}
 */
function flow(asyncAction) {
    return createFlowSpawner(asyncAction.name, asyncAction);
}
function createFlowSpawner(name, generator) {
    var spawner = function flowSpawner() {
        // Implementation based on https://github.com/tj/co/blob/master/index.js
        var runId = getNextActionId$$1();
        var baseContext = getActionContext$$1();
        var args = arguments;
        function wrap(fn, type, arg) {
            fn.$mst_middleware = spawner.$mst_middleware; // pick up any middleware attached to the flow
            runWithActionContext$$1({
                name: name,
                type: type,
                id: runId,
                args: [arg],
                tree: baseContext.tree,
                context: baseContext.context,
                parentId: baseContext.id,
                rootId: baseContext.rootId
            }, fn);
        }
        return new Promise(function (resolve, reject) {
            var gen;
            var init = function asyncActionInit() {
                gen = generator.apply(null, arguments);
                onFulfilled(undefined); // kick off the flow
            };
            init.$mst_middleware = spawner.$mst_middleware;
            runWithActionContext$$1({
                name: name,
                type: "flow_spawn",
                id: runId,
                args: argsToArray(args),
                tree: baseContext.tree,
                context: baseContext.context,
                parentId: baseContext.id,
                rootId: baseContext.rootId
            }, init);
            function onFulfilled(res) {
                var ret;
                try {
                    // prettier-ignore
                    wrap(function (r) { ret = gen.next(r); }, "flow_resume", res);
                }
                catch (e) {
                    // prettier-ignore
                    setImmediate(function () {
                        wrap(function (r) { reject(e); }, "flow_throw", e);
                    });
                    return;
                }
                next(ret);
                return;
            }
            function onRejected(err) {
                var ret;
                try {
                    // prettier-ignore
                    wrap(function (r) { ret = gen.throw(r); }, "flow_resume_error", err); // or yieldError?
                }
                catch (e) {
                    // prettier-ignore
                    setImmediate(function () {
                        wrap(function (r) { reject(e); }, "flow_throw", e);
                    });
                    return;
                }
                next(ret);
            }
            function next(ret) {
                if (ret.done) {
                    // prettier-ignore
                    setImmediate(function () {
                        wrap(function (r) { resolve(r); }, "flow_return", ret.value);
                    });
                    return;
                }
                // TODO: support more type of values? See https://github.com/tj/co/blob/249bbdc72da24ae44076afd716349d2089b31c4c/index.js#L100
                if (!ret.value || typeof ret.value.then !== "function")
                    fail("Only promises can be yielded to `async`, got: " + ret);
                return ret.value.then(onFulfilled, onRejected);
            }
        });
    };
    return spawner;
}

function splitPatch$$1(patch) {
    if (!("oldValue" in patch))
        fail("Patches without `oldValue` field cannot be inversed");
    return [stripPatch$$1(patch), invertPatch(patch)];
}
function stripPatch$$1(patch) {
    // strips `oldvalue` information from the patch, so that it becomes a patch conform the json-patch spec
    // this removes the ability to undo the patch
    switch (patch.op) {
        case "add":
            return { op: "add", path: patch.path, value: patch.value };
        case "remove":
            return { op: "remove", path: patch.path };
        case "replace":
            return { op: "replace", path: patch.path, value: patch.value };
    }
}
function invertPatch(patch) {
    switch (patch.op) {
        case "add":
            return {
                op: "remove",
                path: patch.path
            };
        case "remove":
            return {
                op: "add",
                path: patch.path,
                value: patch.oldValue
            };
        case "replace":
            return {
                op: "replace",
                path: patch.path,
                value: patch.oldValue
            };
    }
}
/**
 * escape slashes and backslashes
 * http://tools.ietf.org/html/rfc6901
 */
function escapeJsonPath$$1(str) {
    return str.replace(/~/g, "~1").replace(/\//g, "~0");
}
/**
 * unescape slashes and backslashes
 */
function unescapeJsonPath$$1(str) {
    return str.replace(/~0/g, "/").replace(/~1/g, "~");
}
function joinJsonPath$$1(path) {
    // `/` refers to property with an empty name, while `` refers to root itself!
    if (path.length === 0)
        return "";
    return "/" + path.map(escapeJsonPath$$1).join("/");
}
function splitJsonPath$$1(path) {
    // `/` refers to property with an empty name, while `` refers to root itself!
    var parts = path.split("/").map(unescapeJsonPath$$1);
    // path '/a/b/c' -> a b c
    // path '../../b/c -> .. .. b c
    return parts[0] === "" ? parts.slice(1) : parts;
}

function mapToString$$1() {
    return getStateTreeNode$$1(this) + "(" + this.size + " items)";
}
function put(value) {
    if (!!!value)
        fail("Map.put cannot be used to set empty values");
    var node;
    if (isStateTreeNode$$1(value)) {
        node = getStateTreeNode$$1(value);
    }
    else if (isMutable(value)) {
        var targetType = getStateTreeNode$$1(this).type
            .subType;
        node = getStateTreeNode$$1(targetType.create(value));
    }
    else {
        return fail("Map.put can only be used to store complex values");
    }
    if (!node.identifierAttribute)
        fail("Map.put can only be used to store complex values that have an identifier type attribute");
    this.set(node.identifier, node.value);
    return this;
}
var MapType$$1 = /** @class */ (function (_super) {
    __extends(MapType$$1, _super);
    function MapType$$1(name, subType) {
        var _this = _super.call(this, name) || this;
        _this.shouldAttachNode = true;
        _this.flags = TypeFlags$$1.Map;
        _this.createNewInstance = function () {
            // const identifierAttr = getIdentifierAttribute(this.subType)
            var map$$1 = observable.shallowMap();
            addHiddenFinalProp(map$$1, "put", put);
            addHiddenFinalProp(map$$1, "toString", mapToString$$1);
            return map$$1;
        };
        _this.finalizeNewInstance = function (node, snapshot) {
            var instance = node.storedValue;
            extras.interceptReads(instance, node.unbox);
            intercept(instance, function (c) { return _this.willChange(c); });
            node.applySnapshot(snapshot);
            observe(instance, _this.didChange);
        };
        _this.subType = subType;
        return _this;
    }
    MapType$$1.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode$$1(this, parent, subpath, environment, snapshot, this.createNewInstance, this.finalizeNewInstance);
    };
    MapType$$1.prototype.describe = function () {
        return "Map<string, " + this.subType.describe() + ">";
    };
    MapType$$1.prototype.getChildren = function (node) {
        return node.storedValue.values();
    };
    MapType$$1.prototype.getChildNode = function (node, key) {
        var childNode = node.storedValue.get(key);
        if (!childNode)
            fail("Not a child " + key);
        return childNode;
    };
    MapType$$1.prototype.willChange = function (change) {
        var node = getStateTreeNode$$1(change.object);
        node.assertWritable();
        switch (change.type) {
            case "update":
                {
                    var newValue = change.newValue;
                    var oldValue = change.object.get(change.name);
                    if (newValue === oldValue)
                        return null;
                    typecheck$$1(this.subType, newValue);
                    change.newValue = this.subType.reconcile(node.getChildNode(change.name), change.newValue);
                    this.verifyIdentifier(change.name, change.newValue);
                }
                break;
            case "add":
                {
                    typecheck$$1(this.subType, change.newValue);
                    change.newValue = this.subType.instantiate(node, change.name, undefined, change.newValue);
                    this.verifyIdentifier(change.name, change.newValue);
                }
                break;
        }
        return change;
    };
    MapType$$1.prototype.verifyIdentifier = function (expected, node) {
        if (node instanceof ObjectNode$$1) {
            var identifier$$1 = node.identifier;
            if (identifier$$1 !== null && "" + identifier$$1 !== "" + expected)
                fail("A map of objects containing an identifier should always store the object under their own identifier. Trying to store key '" + identifier$$1 + "', but expected: '" + expected + "'");
        }
    };
    MapType$$1.prototype.getValue = function (node) {
        return node.storedValue;
    };
    MapType$$1.prototype.getSnapshot = function (node) {
        var res = {};
        node.getChildren().forEach(function (childNode) {
            res[childNode.subpath] = childNode.snapshot;
        });
        return res;
    };
    MapType$$1.prototype.didChange = function (change) {
        var node = getStateTreeNode$$1(change.object);
        switch (change.type) {
            case "update":
                return void node.emitPatch({
                    op: "replace",
                    path: escapeJsonPath$$1(change.name),
                    value: change.newValue.snapshot,
                    oldValue: change.oldValue ? change.oldValue.snapshot : undefined
                }, node);
            case "add":
                return void node.emitPatch({
                    op: "add",
                    path: escapeJsonPath$$1(change.name),
                    value: change.newValue.snapshot,
                    oldValue: undefined
                }, node);
            case "delete":
                // a node got deleted, get the old snapshot and make the node die
                var oldSnapshot = change.oldValue.snapshot;
                change.oldValue.die();
                // emit the patch
                return void node.emitPatch({ op: "remove", path: escapeJsonPath$$1(change.name), oldValue: oldSnapshot }, node);
        }
    };
    MapType$$1.prototype.applyPatchLocally = function (node, subpath, patch) {
        var target = node.storedValue;
        switch (patch.op) {
            case "add":
            case "replace":
                target.set(subpath, patch.value);
                break;
            case "remove":
                target.delete(subpath);
                break;
        }
    };
    MapType$$1.prototype.applySnapshot = function (node, snapshot) {
        typecheck$$1(this, snapshot);
        var target = node.storedValue;
        var currentKeys = {};
        target.keys().forEach(function (key) {
            currentKeys[key] = false;
        });
        // Don't use target.replace, as it will throw all existing items first
        Object.keys(snapshot).forEach(function (key) {
            target.set(key, snapshot[key]);
            currentKeys[key] = true;
        });
        Object.keys(currentKeys).forEach(function (key) {
            if (currentKeys[key] === false)
                target.delete(key);
        });
    };
    MapType$$1.prototype.getChildType = function (key) {
        return this.subType;
    };
    MapType$$1.prototype.isValidSnapshot = function (value, context) {
        var _this = this;
        if (!isPlainObject(value)) {
            return typeCheckFailure$$1(context, value, "Value is not a plain object");
        }
        return flattenTypeErrors$$1(Object.keys(value).map(function (path) {
            return _this.subType.validate(value[path], getContextForPath$$1(context, path, _this.subType));
        }));
    };
    MapType$$1.prototype.getDefaultSnapshot = function () {
        return {};
    };
    MapType$$1.prototype.removeChild = function (node, subpath) {
        
        node.storedValue.delete(subpath);
    };
    __decorate([
        action
    ], MapType$$1.prototype, "applySnapshot", null);
    return MapType$$1;
}(ComplexType$$1));
/**
 * Creates a key based collection type who's children are all of a uniform declared type.
 * If the type stored in a map has an identifier, it is mandatory to store the child under that identifier in the map.
 *
 * This type will always produce [observable maps](https://mobx.js.org/refguide/map.html)
 *
 * @example
 * const Todo = types.model({
 *   id: types.identifier(types.number),
 *   task: types.string
 * })
 *
 * const TodoStore = types.model({
 *   todos: types.map(Todo)
 * })
 *
 * const s = TodoStore.create({ todos: {} })
 * unprotect(s)
 * s.todos.set(17, { task: "Grab coffee", id: 17 })
 * s.todos.put({ task: "Grab cookie", id: 18 }) // put will infer key from the identifier
 * console.log(s.todos.get(17).task) // prints: "Grab coffee"
 *
 * @export
 * @alias types.map
 * @param {IType<S, T>} subtype
 * @returns {IComplexType<S[], IObservableArray<T>>}
 */
function map$$1(subtype) {
    return new MapType$$1("map<string, " + subtype.name + ">", subtype);
}

function arrayToString$$1() {
    return getStateTreeNode$$1(this) + "(" + this.length + " items)";
}
var ArrayType$$1 = /** @class */ (function (_super) {
    __extends(ArrayType$$1, _super);
    function ArrayType$$1(name, subType) {
        var _this = _super.call(this, name) || this;
        _this.shouldAttachNode = true;
        _this.flags = TypeFlags$$1.Array;
        _this.createNewInstance = function () {
            var array$$1 = observable.shallowArray();
            addHiddenFinalProp(array$$1, "toString", arrayToString$$1);
            return array$$1;
        };
        _this.finalizeNewInstance = function (node, snapshot) {
            var instance = node.storedValue;
            extras.getAdministration(instance).dehancer = node.unbox;
            intercept(instance, function (change) { return _this.willChange(change); });
            node.applySnapshot(snapshot);
            observe(instance, _this.didChange);
        };
        _this.subType = subType;
        return _this;
    }
    ArrayType$$1.prototype.describe = function () {
        return this.subType.describe() + "[]";
    };
    ArrayType$$1.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode$$1(this, parent, subpath, environment, snapshot, this.createNewInstance, this.finalizeNewInstance);
    };
    ArrayType$$1.prototype.getChildren = function (node) {
        return node.storedValue.peek();
    };
    ArrayType$$1.prototype.getChildNode = function (node, key) {
        var index = parseInt(key, 10);
        if (index < node.storedValue.length)
            return node.storedValue[index];
        return fail("Not a child: " + key);
    };
    ArrayType$$1.prototype.willChange = function (change) {
        var node = getStateTreeNode$$1(change.object);
        node.assertWritable();
        var childNodes = node.getChildren();
        switch (change.type) {
            case "update":
                if (change.newValue === change.object[change.index])
                    return null;
                change.newValue = reconcileArrayChildren(node, this.subType, [childNodes[change.index]], [change.newValue], [change.index])[0];
                break;
            case "splice":
                var index_1 = change.index, removedCount = change.removedCount, added = change.added;
                change.added = reconcileArrayChildren(node, this.subType, childNodes.slice(index_1, index_1 + removedCount), added, added.map(function (_, i) { return index_1 + i; }));
                // update paths of remaining items
                for (var i = index_1 + removedCount; i < childNodes.length; i++) {
                    childNodes[i].setParent(node, "" + (i + added.length - removedCount));
                }
                break;
        }
        return change;
    };
    ArrayType$$1.prototype.getValue = function (node) {
        return node.storedValue;
    };
    ArrayType$$1.prototype.getSnapshot = function (node) {
        return node.getChildren().map(function (childNode) { return childNode.snapshot; });
    };
    ArrayType$$1.prototype.didChange = function (change) {
        var node = getStateTreeNode$$1(change.object);
        switch (change.type) {
            case "update":
                return void node.emitPatch({
                    op: "replace",
                    path: "" + change.index,
                    value: change.newValue.snapshot,
                    oldValue: change.oldValue ? change.oldValue.snapshot : undefined
                }, node);
            case "splice":
                for (var i = change.removedCount - 1; i >= 0; i--)
                    node.emitPatch({
                        op: "remove",
                        path: "" + (change.index + i),
                        oldValue: change.removed[i].snapshot
                    }, node);
                for (var i = 0; i < change.addedCount; i++)
                    node.emitPatch({
                        op: "add",
                        path: "" + (change.index + i),
                        value: node.getChildNode("" + (change.index + i)).snapshot,
                        oldValue: undefined
                    }, node);
                return;
        }
    };
    ArrayType$$1.prototype.applyPatchLocally = function (node, subpath, patch) {
        var target = node.storedValue;
        var index = subpath === "-" ? target.length : parseInt(subpath);
        switch (patch.op) {
            case "replace":
                target[index] = patch.value;
                break;
            case "add":
                target.splice(index, 0, patch.value);
                break;
            case "remove":
                target.splice(index, 1);
                break;
        }
    };
    ArrayType$$1.prototype.applySnapshot = function (node, snapshot) {
        typecheck$$1(this, snapshot);
        var target = node.storedValue;
        target.replace(snapshot);
    };
    ArrayType$$1.prototype.getChildType = function (key) {
        return this.subType;
    };
    ArrayType$$1.prototype.isValidSnapshot = function (value, context) {
        var _this = this;
        if (!isArray(value)) {
            return typeCheckFailure$$1(context, value, "Value is not an array");
        }
        return flattenTypeErrors$$1(value.map(function (item, index) {
            return _this.subType.validate(item, getContextForPath$$1(context, "" + index, _this.subType));
        }));
    };
    ArrayType$$1.prototype.getDefaultSnapshot = function () {
        return [];
    };
    ArrayType$$1.prototype.removeChild = function (node, subpath) {
        node.storedValue.splice(parseInt(subpath, 10), 1);
    };
    __decorate([
        action
    ], ArrayType$$1.prototype, "applySnapshot", null);
    return ArrayType$$1;
}(ComplexType$$1));
/**
 * Creates an index based collection type who's children are all of a uniform declared type.
 *
 * This type will always produce [observable arrays](https://mobx.js.org/refguide/array.html)
 *
 * @example
 * const Todo = types.model({
 *   task: types.string
 * })
 *
 * const TodoStore = types.model({
 *   todos: types.array(Todo)
 * })
 *
 * const s = TodoStore.create({ todos: [] })
 * unprotect(s) // needed to allow modifying outside of an action
 * s.todos.push({ task: "Grab coffee" })
 * console.log(s.todos[0]) // prints: "Grab coffee"
 *
 * @export
 * @alias types.array
 * @param {IType<S, T>} subtype
 * @returns {IComplexType<S[], IObservableArray<T>>}
 */
function array$$1(subtype) {
    if (process.env.NODE_ENV !== "production") {
        if (!isType$$1(subtype))
            fail("expected a mobx-state-tree type as first argument, got " + subtype + " instead");
    }
    return new ArrayType$$1(subtype.name + "[]", subtype);
}
function reconcileArrayChildren(parent, childType, oldNodes, newValues, newPaths) {
    var oldNode, newValue, hasNewNode = false, oldMatch = undefined;
    for (var i = 0;; i++) {
        hasNewNode = i <= newValues.length - 1;
        oldNode = oldNodes[i];
        newValue = hasNewNode ? newValues[i] : undefined;
        // for some reason, instead of newValue we got a node, fallback to the storedValue
        // TODO: https://github.com/mobxjs/mobx-state-tree/issues/340#issuecomment-325581681
        if (isNode$$1(newValue))
            newValue = newValue.storedValue;
        // both are empty, end
        if (!oldNode && !hasNewNode) {
            break;
            // new one does not exists, old one dies
        }
        else if (!hasNewNode) {
            oldNode.die();
            oldNodes.splice(i, 1);
            i--;
            // there is no old node, create it
        }
        else if (!oldNode) {
            // check if already belongs to the same parent. if so, avoid pushing item in. only swapping can occur.
            if (isStateTreeNode$$1(newValue) && getStateTreeNode$$1(newValue).parent === parent) {
                // this node is owned by this parent, but not in the reconcilable set, so it must be double
                fail("Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '" + parent.path + "/" + newPaths[i] + "', but it lives already at '" + getStateTreeNode$$1(newValue).path + "'");
            }
            oldNodes.splice(i, 0, valueAsNode(childType, parent, "" + newPaths[i], newValue));
            // both are the same, reconcile
        }
        else if (areSame(oldNode, newValue)) {
            oldNodes[i] = valueAsNode(childType, parent, "" + newPaths[i], newValue, oldNode);
            // nothing to do, try to reorder
        }
        else {
            oldMatch = undefined;
            // find a possible candidate to reuse
            for (var j = i; j < oldNodes.length; j++) {
                if (areSame(oldNodes[j], newValue)) {
                    oldMatch = oldNodes.splice(j, 1)[0];
                    break;
                }
            }
            oldNodes.splice(i, 0, valueAsNode(childType, parent, "" + newPaths[i], newValue, oldMatch));
        }
    }
    return oldNodes;
}
// convert a value to a node at given parent and subpath. attempts to reuse old node if possible and given
function valueAsNode(childType, parent, subpath, newValue, oldNode) {
    // ensure the value is valid-ish
    typecheck$$1(childType, newValue);
    // the new value has a MST node
    if (isStateTreeNode$$1(newValue)) {
        var childNode_1 = getStateTreeNode$$1(newValue);
        childNode_1.assertAlive();
        // the node lives here
        if (childNode_1.parent !== null && childNode_1.parent === parent) {
            childNode_1.setParent(parent, subpath);
            if (oldNode && oldNode !== childNode_1)
                oldNode.die();
            return childNode_1;
        }
    }
    // there is old node and new one is a value/snapshot
    if (oldNode) {
        var childNode_2 = childType.reconcile(oldNode, newValue);
        childNode_2.setParent(parent, subpath);
        return childNode_2;
    }
    // nothing to do, create from scratch
    var childNode = childType.instantiate(parent, subpath, parent._environment, newValue);
    return childNode;
}
// given a value
function areSame(oldNode, newValue) {
    // the new value has the same node
    if (isStateTreeNode$$1(newValue)) {
        return getStateTreeNode$$1(newValue) === oldNode;
    }
    // the provided value is the snapshot of the old node
    if (isMutable(newValue) && oldNode.snapshot === newValue)
        return true;
    // new value is a snapshot with the correct identifier
    if (oldNode instanceof ObjectNode$$1 &&
        oldNode.identifier !== null &&
        oldNode.identifierAttribute &&
        isPlainObject(newValue) &&
        newValue[oldNode.identifierAttribute] === oldNode.identifier)
        return true;
    return false;
}

var PRE_PROCESS_SNAPSHOT = "preProcessSnapshot";
var HOOK_NAMES = {
    afterCreate: "afterCreate",
    afterAttach: "afterAttach",
    postProcessSnapshot: "postProcessSnapshot",
    beforeDetach: "beforeDetach",
    beforeDestroy: "beforeDestroy"
};
function objectTypeToString() {
    return getStateTreeNode$$1(this).toString();
}
var defaultObjectOptions = {
    name: "AnonymousModel",
    properties: {},
    initializers: EMPTY_ARRAY
};
function toPropertiesObject(properties) {
    // loop through properties and ensures that all items are types
    return Object.keys(properties).reduce(function (properties, key) {
        // warn if user intended a HOOK
        if (key in HOOK_NAMES)
            return fail("Hook '" + key + "' was defined as property. Hooks should be defined as part of the actions");
        // the user intended to use a view
        var descriptor = Object.getOwnPropertyDescriptor(properties, key);
        if ("get" in descriptor) {
            fail("Getters are not supported as properties. Please use views instead");
        }
        // undefined and null are not valid
        var value = descriptor.value;
        if (value === null || undefined) {
            fail("The default value of an attribute cannot be null or undefined as the type cannot be inferred. Did you mean `types.maybe(someType)`?");
            // its a primitive, convert to its type
        }
        else if (isPrimitive(value)) {
            return Object.assign({}, properties, (_a = {},
                _a[key] = optional$$1(getPrimitiveFactoryFromValue$$1(value), value),
                _a));
            // its already a type
        }
        else if (isType$$1(value)) {
            return properties;
            // its a function, maybe the user wanted a view?
        }
        else if (typeof value === "function") {
            fail("Functions are not supported as properties, use views instead");
            // no other complex values
        }
        else if (typeof value === "object") {
            fail("In property '" + key + "': base model's should not contain complex values: '" + value + "'");
            // WTF did you passed in mate?
        }
        else {
            fail("Unexpected value for property '" + key + "'");
        }
        var _a;
    }, properties);
}
var ModelType$$1 = /** @class */ (function (_super) {
    __extends(ModelType$$1, _super);
    function ModelType$$1(opts) {
        var _this = _super.call(this, opts.name || defaultObjectOptions.name) || this;
        _this.flags = TypeFlags$$1.Object;
        _this.shouldAttachNode = true;
        _this.createNewInstance = function () {
            var instance = observable.shallowObject(EMPTY_OBJECT);
            addHiddenFinalProp(instance, "toString", objectTypeToString);
            return instance;
        };
        _this.finalizeNewInstance = function (node, snapshot) {
            var instance = node.storedValue;
            _this.forAllProps(function (name, type) {
                extendShallowObservable(instance, (_a = {},
                    _a[name] = observable.ref(type.instantiate(node, name, node._environment, snapshot[name])),
                    _a));
                extras.interceptReads(instance, name, node.unbox);
                var _a;
            });
            _this.initializers.reduce(function (self, fn) { return fn(self); }, instance);
            intercept(instance, function (change) { return _this.willChange(change); });
            observe(instance, _this.didChange);
        };
        _this.didChange = function (change) {
            if (!_this.properties[change.name]) {
                // don't emit patches for volatile state
                return;
            }
            var node = getStateTreeNode$$1(change.object);
            var oldValue = change.oldValue ? change.oldValue.snapshot : undefined;
            node.emitPatch({
                op: "replace",
                path: escapeJsonPath$$1(change.name),
                value: change.newValue.snapshot,
                oldValue: oldValue
            }, node);
        };
        var name = opts.name || defaultObjectOptions.name;
        // TODO: this test still needed?
        if (!/^\w[\w\d_]*$/.test(name))
            fail("Typename should be a valid identifier: " + name);
        Object.assign(_this, defaultObjectOptions, opts);
        // ensures that any default value gets converted to its related type
        _this.properties = toPropertiesObject(_this.properties);
        _this.propertiesNames = Object.keys(_this.properties);
        Object.freeze(_this.properties); // make sure nobody messes with it
        return _this;
    }
    ModelType$$1.prototype.cloneAndEnhance = function (opts) {
        return new ModelType$$1({
            name: opts.name || this.name,
            properties: Object.assign({}, this.properties, opts.properties),
            initializers: this.initializers.concat(opts.initializers || []),
            preProcessor: opts.preProcessor || this.preProcessor
        });
    };
    ModelType$$1.prototype.actions = function (fn) {
        var _this = this;
        var actionInitializer = function (self) {
            _this.instantiateActions(self, fn(self));
            return self;
        };
        return this.cloneAndEnhance({ initializers: [actionInitializer] });
    };
    ModelType$$1.prototype.instantiateActions = function (self, actions) {
        // check if return is correct
        if (!isPlainObject(actions))
            fail("actions initializer should return a plain object containing actions");
        // bind actions to the object created
        Object.keys(actions).forEach(function (name) {
            // warn if preprocessor was given
            if (name === PRE_PROCESS_SNAPSHOT)
                return fail("Cannot define action '" + PRE_PROCESS_SNAPSHOT + "', it should be defined using 'type.preProcessSnapshot(fn)' instead");
            // apply hook composition
            var action$$1 = actions[name];
            var baseAction = self[name];
            if (name in HOOK_NAMES && baseAction) {
                var specializedAction_1 = action$$1;
                if (name === HOOK_NAMES.postProcessSnapshot)
                    action$$1 = function (snapshot) { return specializedAction_1(baseAction(snapshot)); };
                else
                    action$$1 = function () {
                        baseAction.apply(null, arguments);
                        specializedAction_1.apply(null, arguments);
                    };
            }
            addHiddenFinalProp(self, name, createActionInvoker$$1(self, name, action$$1));
            return;
        });
    };
    ModelType$$1.prototype.named = function (name) {
        return this.cloneAndEnhance({ name: name });
    };
    ModelType$$1.prototype.props = function (properties) {
        return this.cloneAndEnhance({ properties: properties });
    };
    ModelType$$1.prototype.volatile = function (fn) {
        var _this = this;
        var stateInitializer = function (self) {
            _this.instantiateVolatileState(self, fn(self));
            return self;
        };
        return this.cloneAndEnhance({ initializers: [stateInitializer] });
    };
    ModelType$$1.prototype.instantiateVolatileState = function (self, state) {
        // check views return
        if (!isPlainObject(state))
            fail("state initializer should return a plain object containing views");
        // TODO: typecheck & namecheck members of state?
        extendShallowObservable(self, state);
    };
    ModelType$$1.prototype.extend = function (fn) {
        var _this = this;
        var initializer = function (self) {
            var _a = fn(self), actions = _a.actions, views = _a.views, state = _a.state, rest = __rest(_a, ["actions", "views", "state"]);
            for (var key in rest)
                fail("The `extend` function should return an object with a subset of the fields 'actions', 'views' and 'state'. Found invalid key '" + key + "'");
            if (state)
                _this.instantiateVolatileState(self, state);
            if (views)
                _this.instantiateViews(self, views);
            if (actions)
                _this.instantiateActions(self, actions);
            return self;
        };
        return this.cloneAndEnhance({ initializers: [initializer] });
    };
    ModelType$$1.prototype.views = function (fn) {
        var _this = this;
        var viewInitializer = function (self) {
            _this.instantiateViews(self, fn(self));
            return self;
        };
        return this.cloneAndEnhance({ initializers: [viewInitializer] });
    };
    ModelType$$1.prototype.instantiateViews = function (self, views) {
        // check views return
        if (!isPlainObject(views))
            fail("views initializer should return a plain object containing views");
        Object.keys(views).forEach(function (key) {
            // is this a computed property?
            var descriptor = Object.getOwnPropertyDescriptor(views, key);
            var value = descriptor.value;
            if ("get" in descriptor) {
                // TODO: mobx currently does not allow redefining computes yet, pending #1121
                if (isComputed(self.$mobx.values[key])) {
                    // TODO: use `isComputed(self, key)`, pending mobx #1120
                    
                    self.$mobx.values[key] = computed(descriptor.get, {
                        name: key,
                        setter: descriptor.set,
                        context: self
                    });
                }
                else {
                    var tmp = {};
                    Object.defineProperty(tmp, key, {
                        get: descriptor.get,
                        set: descriptor.set,
                        enumerable: true
                    });
                    extendShallowObservable(self, tmp);
                }
            }
            else if (typeof value === "function") {
                // this is a view function, merge as is!
                addHiddenFinalProp(self, key, value);
            }
            else {
                fail("A view member should either be a function or getter based property");
            }
        });
    };
    ModelType$$1.prototype.preProcessSnapshot = function (preProcessor) {
        var currentPreprocessor = this.preProcessor;
        if (!currentPreprocessor)
            return this.cloneAndEnhance({ preProcessor: preProcessor });
        else
            return this.cloneAndEnhance({
                preProcessor: function (snapshot) { return currentPreprocessor(preProcessor(snapshot)); }
            });
    };
    ModelType$$1.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode$$1(this, parent, subpath, environment, this.applySnapshotPreProcessor(snapshot), this.createNewInstance, this.finalizeNewInstance);
        // Optimization: record all prop- view- and action names after first construction, and generate an optimal base class
        // that pre-reserves all these fields for fast object-member lookups
    };
    ModelType$$1.prototype.willChange = function (change) {
        var node = getStateTreeNode$$1(change.object);
        node.assertWritable();
        var type = this.properties[change.name];
        // only properties are typed, state are stored as-is references
        if (type) {
            typecheck$$1(type, change.newValue);
            change.newValue = type.reconcile(node.getChildNode(change.name), change.newValue);
        }
        return change;
    };
    ModelType$$1.prototype.getChildren = function (node) {
        var _this = this;
        var res = [];
        this.forAllProps(function (name, type) {
            res.push(_this.getChildNode(node, name));
        });
        return res;
    };
    ModelType$$1.prototype.getChildNode = function (node, key) {
        if (!(key in this.properties))
            return fail("Not a value property: " + key);
        var childNode = node.storedValue.$mobx.values[key].value; // TODO: blegh!
        if (!childNode)
            return fail("Node not available for property " + key);
        return childNode;
    };
    ModelType$$1.prototype.getValue = function (node) {
        return node.storedValue;
    };
    ModelType$$1.prototype.getSnapshot = function (node) {
        var _this = this;
        var res = {};
        this.forAllProps(function (name, type) {
            // TODO: FIXME, make sure the observable ref is used!
            
            extras.getAtom(node.storedValue, name).reportObserved();
            res[name] = _this.getChildNode(node, name).snapshot;
        });
        if (typeof node.storedValue.postProcessSnapshot === "function")
            return node.storedValue.postProcessSnapshot.call(null, res);
        return res;
    };
    ModelType$$1.prototype.applyPatchLocally = function (node, subpath, patch) {
        if (!(patch.op === "replace" || patch.op === "add"))
            fail("object does not support operation " + patch.op);
        node.storedValue[subpath] = patch.value;
    };
    ModelType$$1.prototype.applySnapshot = function (node, snapshot) {
        var s = this.applySnapshotPreProcessor(snapshot);
        typecheck$$1(this, s);
        this.forAllProps(function (name, type) {
            node.storedValue[name] = s[name];
        });
    };
    ModelType$$1.prototype.applySnapshotPreProcessor = function (snapshot) {
        if (this.preProcessor)
            return this.preProcessor.call(null, snapshot);
        return snapshot;
    };
    ModelType$$1.prototype.getChildType = function (key) {
        return this.properties[key];
    };
    ModelType$$1.prototype.isValidSnapshot = function (value, context) {
        var _this = this;
        var snapshot = this.applySnapshotPreProcessor(value);
        if (!isPlainObject(snapshot)) {
            return typeCheckFailure$$1(context, snapshot, "Value is not a plain object");
        }
        return flattenTypeErrors$$1(this.propertiesNames.map(function (key) {
            return _this.properties[key].validate(snapshot[key], getContextForPath$$1(context, key, _this.properties[key]));
        }));
    };
    ModelType$$1.prototype.forAllProps = function (fn) {
        var _this = this;
        this.propertiesNames.forEach(function (key) { return fn(key, _this.properties[key]); });
    };
    ModelType$$1.prototype.describe = function () {
        var _this = this;
        // optimization: cache
        return ("{ " +
            this.propertiesNames
                .map(function (key) { return key + ": " + _this.properties[key].describe(); })
                .join("; ") +
            " }");
    };
    ModelType$$1.prototype.getDefaultSnapshot = function () {
        return {};
    };
    ModelType$$1.prototype.removeChild = function (node, subpath) {
        node.storedValue[subpath] = null;
    };
    __decorate([
        action
    ], ModelType$$1.prototype, "applySnapshot", null);
    return ModelType$$1;
}(ComplexType$$1));
/**
 * Creates a new model type by providing a name, properties, volatile state and actions.
 *
 * See the [model type](https://github.com/mobxjs/mobx-state-tree#creating-models) description or the [getting started](https://github.com/mobxjs/mobx-state-tree/blob/master/docs/getting-started.md#getting-started-1) tutorial.
 *
 * @export
 * @alias types.model
 */
function model$$1() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var name = typeof args[0] === "string" ? args.shift() : "AnonymousModel";
    var properties = args.shift() || {};
    var config = { name: name, properties: properties };
    return new ModelType$$1(config);
}
/**
 * Composes a new model from one or more existing model types.
 * This method can be invoked in two forms:
 * Given 2 or more model types, the types are composed into a new Type.
 *
 * @export
 * @alias types.compose
 */
function compose$$1() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    // TODO: just join the base type names if no name is provided
    var typeName = typeof args[0] === "string" ? args.shift() : "AnonymousModel";
    // check all parameters
    if (process.env.NODE_ENV !== "production") {
        args.forEach(function (type) {
            if (!isType$$1(type))
                fail("expected a mobx-state-tree type, got " + type + " instead");
        });
    }
    return args
        .reduce(function (prev, cur) {
        return prev.cloneAndEnhance({
            name: prev.name + "_" + cur.name,
            properties: cur.properties,
            initializers: cur.initializers
        });
    })
        .named(typeName);
}

var CoreType$$1 = /** @class */ (function (_super) {
    __extends(CoreType$$1, _super);
    function CoreType$$1(name, flags, checker, initializer) {
        if (initializer === void 0) { initializer = identity; }
        var _this = _super.call(this, name) || this;
        _this.shouldAttachNode = false;
        _this.flags = flags;
        _this.checker = checker;
        _this.initializer = initializer;
        return _this;
    }
    CoreType$$1.prototype.describe = function () {
        return this.name;
    };
    CoreType$$1.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode$$1(this, parent, subpath, environment, snapshot, this.initializer);
    };
    CoreType$$1.prototype.isValidSnapshot = function (value, context) {
        if (isPrimitive(value) && this.checker(value)) {
            return typeCheckSuccess$$1();
        }
        var typeName = this.name === "Date" ? "Date or a unix milliseconds timestamp" : this.name;
        return typeCheckFailure$$1(context, value, "Value is not a " + typeName);
    };
    return CoreType$$1;
}(Type$$1));
/**
 * Creates a type that can only contain a string value.
 * This type is used for string values by default
 *
 * @export
 * @alias types.string
 * @example
 * const Person = types.model({
 *   firstName: types.string,
 *   lastName: "Doe"
 * })
 */
// tslint:disable-next-line:variable-name
var string$$1 = new CoreType$$1("string", TypeFlags$$1.String, function (v) { return typeof v === "string"; });
/**
 * Creates a type that can only contain a numeric value.
 * This type is used for numeric values by default
 *
 * @export
 * @alias types.number
 * @example
 * const Vector = types.model({
 *   x: types.number,
 *   y: 0
 * })
 */
// tslint:disable-next-line:variable-name
var number$$1 = new CoreType$$1("number", TypeFlags$$1.Number, function (v) { return typeof v === "number"; });
/**
 * Creates a type that can only contain a boolean value.
 * This type is used for boolean values by default
 *
 * @export
 * @alias types.boolean
 * @example
 * const Thing = types.model({
 *   isCool: types.boolean,
 *   isAwesome: false
 * })
 */
// tslint:disable-next-line:variable-name
var boolean$$1 = new CoreType$$1("boolean", TypeFlags$$1.Boolean, function (v) { return typeof v === "boolean"; });
/**
 * The type of the value `null`
 *
 * @export
 * @alias types.null
 */
var nullType$$1 = new CoreType$$1("null", TypeFlags$$1.Null, function (v) { return v === null; });
/**
 * The type of the value `undefined`
 *
 * @export
 * @alias types.undefined
 */
var undefinedType$$1 = new CoreType$$1("undefined", TypeFlags$$1.Undefined, function (v) { return v === undefined; });
/**
 * Creates a type that can only contain a javascript Date value.
 *
 * @export
 * @alias types.Date
 * @example
 * const LogLine = types.model({
 *   timestamp: types.Date,
 * })
 *
 * LogLine.create({ timestamp: new Date() })
 */
// tslint:disable-next-line:variable-name
var DatePrimitive$$1 = new CoreType$$1("Date", TypeFlags$$1.Date, function (v) { return typeof v === "number" || v instanceof Date; }, function (v) { return (v instanceof Date ? v : new Date(v)); });
DatePrimitive$$1.getSnapshot = function (node) {
    return node.storedValue.getTime();
};
function getPrimitiveFactoryFromValue$$1(value) {
    switch (typeof value) {
        case "string":
            return string$$1;
        case "number":
            return number$$1;
        case "boolean":
            return boolean$$1;
        case "object":
            if (value instanceof Date)
                return DatePrimitive$$1;
    }
    return fail("Cannot determine primitive type from value " + value);
}
function isPrimitiveType$$1(type) {
    return (isType$$1(type) &&
        (type.flags & (TypeFlags$$1.String | TypeFlags$$1.Number | TypeFlags$$1.Boolean | TypeFlags$$1.Date)) >
            0);
}

var Literal$$1 = /** @class */ (function (_super) {
    __extends(Literal$$1, _super);
    function Literal$$1(value) {
        var _this = _super.call(this, JSON.stringify(value)) || this;
        _this.shouldAttachNode = false;
        _this.flags = TypeFlags$$1.Literal;
        _this.value = value;
        return _this;
    }
    Literal$$1.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode$$1(this, parent, subpath, environment, snapshot);
    };
    Literal$$1.prototype.describe = function () {
        return JSON.stringify(this.value);
    };
    Literal$$1.prototype.isValidSnapshot = function (value, context) {
        if (isPrimitive(value) && value === this.value) {
            return typeCheckSuccess$$1();
        }
        return typeCheckFailure$$1(context, value, "Value is not a literal " + JSON.stringify(this.value));
    };
    return Literal$$1;
}(Type$$1));
/**
 * The literal type will return a type that will match only the exact given type.
 * The given value must be a primitive, in order to be serialized to a snapshot correctly.
 * You can use literal to match exact strings for example the exact male or female string.
 *
 * @example
 * const Person = types.model({
 *     name: types.string,
 *     gender: types.union(types.literal('male'), types.literal('female'))
 * })
 *
 * @export
 * @alias types.literal
 * @template S
 * @param {S} value The value to use in the strict equal check
 * @returns {ISimpleType<S>}
 */
function literal$$1(value) {
    // check that the given value is a primitive
    if (process.env.NODE_ENV !== "production") {
        if (!isPrimitive(value))
            fail("Literal types can be built only on top of primitives");
    }
    return new Literal$$1(value);
}

var Refinement$$1 = /** @class */ (function (_super) {
    __extends(Refinement$$1, _super);
    function Refinement$$1(name, type, predicate, message) {
        var _this = _super.call(this, name) || this;
        _this.type = type;
        _this.predicate = predicate;
        _this.message = message;
        return _this;
    }
    Object.defineProperty(Refinement$$1.prototype, "flags", {
        get: function () {
            return this.type.flags | TypeFlags$$1.Refinement;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Refinement$$1.prototype, "shouldAttachNode", {
        get: function () {
            return this.type.shouldAttachNode;
        },
        enumerable: true,
        configurable: true
    });
    Refinement$$1.prototype.describe = function () {
        return this.name;
    };
    Refinement$$1.prototype.instantiate = function (parent, subpath, environment, value) {
        // create the child type
        var inst = this.type.instantiate(parent, subpath, environment, value);
        return inst;
    };
    Refinement$$1.prototype.isAssignableFrom = function (type) {
        return this.type.isAssignableFrom(type);
    };
    Refinement$$1.prototype.isValidSnapshot = function (value, context) {
        var subtypeErrors = this.type.validate(value, context);
        if (subtypeErrors.length > 0)
            return subtypeErrors;
        var snapshot = isStateTreeNode$$1(value) ? getStateTreeNode$$1(value).snapshot : value;
        if (!this.predicate(snapshot)) {
            return typeCheckFailure$$1(context, value, this.message(value));
        }
        return typeCheckSuccess$$1();
    };
    return Refinement$$1;
}(Type$$1));
/**
 * `types.refinement(baseType, (snapshot) => boolean)` creates a type that is more specific than the base type, e.g. `types.refinement(types.string, value => value.length > 5)` to create a type of strings that can only be longer then 5.
 *
 * @export
 * @alias types.refinement
 * @template T
 * @param {string} name
 * @param {IType<T, T>} type
 * @param {(snapshot: T) => boolean} predicate
 * @returns {IType<T, T>}
 */
function refinement$$1() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var name = typeof args[0] === "string" ? args.shift() : isType$$1(args[0]) ? args[0].name : null;
    var type = args[0];
    var predicate = args[1];
    var message = args[2]
        ? args[2]
        : function (v) { return "Value does not respect the refinement predicate"; };
    // ensures all parameters are correct
    if (process.env.NODE_ENV !== "production") {
        if (typeof name !== "string")
            fail("expected a string as first argument, got " + name + " instead");
        if (!isType$$1(type))
            fail("expected a mobx-state-tree type as first or second argument, got " +
                type +
                " instead");
        if (typeof predicate !== "function")
            fail("expected a function as third argument, got " + predicate + " instead");
        if (typeof message !== "function")
            fail("expected a function as fourth argument, got " + message + " instead");
    }
    return new Refinement$$1(name, type, predicate, message);
}

/**
 * Can be used to create an string based enumeration.
 * (note: this methods is just sugar for a union of string literals)
 *
 * @example
 * const TrafficLight = types.model({
 *   color: types.enumeration("Color", ["Red", "Orange", "Green"])
 * })
 *
 * @export
 * @alias types.enumeration
 * @param {string} name descriptive name of the enumeration (optional)
 * @param {string[]} options possible values this enumeration can have
 * @returns {ISimpleType<string>}
 */
function enumeration$$1(name, options) {
    var realOptions = typeof name === "string" ? options : name;
    // check all options
    if (process.env.NODE_ENV !== "production") {
        realOptions.forEach(function (option) {
            if (typeof option !== "string")
                fail("expected all options to be string, got " + type + " instead");
        });
    }
    var type = union$$1.apply(void 0, realOptions.map(function (option) { return literal$$1("" + option); }));
    if (typeof name === "string")
        type.name = name;
    return type;
}

var Union$$1 = /** @class */ (function (_super) {
    __extends(Union$$1, _super);
    function Union$$1(name, types, dispatcher) {
        var _this = _super.call(this, name) || this;
        _this.dispatcher = null;
        _this.dispatcher = dispatcher;
        _this.types = types;
        return _this;
    }
    Object.defineProperty(Union$$1.prototype, "flags", {
        get: function () {
            var result = TypeFlags$$1.Union;
            this.types.forEach(function (type) {
                result |= type.flags;
            });
            return result;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Union$$1.prototype, "shouldAttachNode", {
        get: function () {
            return this.types.some(function (type) { return type.shouldAttachNode; });
        },
        enumerable: true,
        configurable: true
    });
    Union$$1.prototype.isAssignableFrom = function (type) {
        return this.types.some(function (subType) { return subType.isAssignableFrom(type); });
    };
    Union$$1.prototype.describe = function () {
        return "(" + this.types.map(function (factory) { return factory.describe(); }).join(" | ") + ")";
    };
    Union$$1.prototype.instantiate = function (parent, subpath, environment, value) {
        return this.determineType(value).instantiate(parent, subpath, environment, value);
    };
    Union$$1.prototype.reconcile = function (current, newValue) {
        return this.determineType(newValue).reconcile(current, newValue);
    };
    Union$$1.prototype.determineType = function (value) {
        // try the dispatcher, if defined
        if (this.dispatcher !== null) {
            return this.dispatcher(value);
        }
        // find the most accomodating type
        var applicableTypes = this.types.filter(function (type) { return type.is(value); });
        if (applicableTypes.length > 1)
            return fail("Ambiguos snapshot " + JSON.stringify(value) + " for union " + this
                .name + ". Please provide a dispatch in the union declaration.");
        return applicableTypes[0];
    };
    Union$$1.prototype.isValidSnapshot = function (value, context) {
        if (this.dispatcher !== null) {
            return this.dispatcher(value).validate(value, context);
        }
        var errors = this.types.map(function (type) { return type.validate(value, context); });
        var applicableTypes = errors.filter(function (errorArray) { return errorArray.length === 0; });
        if (applicableTypes.length > 1) {
            return typeCheckFailure$$1(context, value, "Multiple types are applicable for the union (hint: provide a dispatch function)");
        }
        else if (applicableTypes.length === 0) {
            return typeCheckFailure$$1(context, value, "No type is applicable for the union").concat(flattenTypeErrors$$1(errors));
        }
        return typeCheckSuccess$$1();
    };
    return Union$$1;
}(Type$$1));
/**
 * types.union(dispatcher?, types...) create a union of multiple types. If the correct type cannot be inferred unambiguously from a snapshot, provide a dispatcher function of the form (snapshot) => Type.
 *
 * @export
 * @alias types.union
 * @param {(ITypeDispatcher | IType<any, any>)} dispatchOrType
 * @param {...IType<any, any>[]} otherTypes
 * @returns {IType<any, any>}
 */
function union$$1(dispatchOrType) {
    var otherTypes = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        otherTypes[_i - 1] = arguments[_i];
    }
    var dispatcher = isType$$1(dispatchOrType) ? null : dispatchOrType;
    var types = isType$$1(dispatchOrType) ? otherTypes.concat(dispatchOrType) : otherTypes;
    var name = "(" + types.map(function (type) { return type.name; }).join(" | ") + ")";
    // check all options
    if (process.env.NODE_ENV !== "production") {
        types.forEach(function (type) {
            if (!isType$$1(type))
                fail("expected all possible types to be a mobx-state-tree type, got " +
                    type +
                    " instead");
        });
    }
    return new Union$$1(name, types, dispatcher);
}

var OptionalValue$$1 = /** @class */ (function (_super) {
    __extends(OptionalValue$$1, _super);
    function OptionalValue$$1(type, defaultValue) {
        var _this = _super.call(this, type.name) || this;
        _this.type = type;
        _this.defaultValue = defaultValue;
        return _this;
    }
    Object.defineProperty(OptionalValue$$1.prototype, "flags", {
        get: function () {
            return this.type.flags | TypeFlags$$1.Optional;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(OptionalValue$$1.prototype, "shouldAttachNode", {
        get: function () {
            return this.type.shouldAttachNode;
        },
        enumerable: true,
        configurable: true
    });
    OptionalValue$$1.prototype.describe = function () {
        return this.type.describe() + "?";
    };
    OptionalValue$$1.prototype.instantiate = function (parent, subpath, environment, value) {
        if (typeof value === "undefined") {
            var defaultValue = this.getDefaultValue();
            var defaultSnapshot = isStateTreeNode$$1(defaultValue)
                ? getStateTreeNode$$1(defaultValue).snapshot
                : defaultValue;
            return this.type.instantiate(parent, subpath, environment, defaultSnapshot);
        }
        return this.type.instantiate(parent, subpath, environment, value);
    };
    OptionalValue$$1.prototype.reconcile = function (current, newValue) {
        return this.type.reconcile(current, this.type.is(newValue) ? newValue : this.getDefaultValue());
    };
    OptionalValue$$1.prototype.getDefaultValue = function () {
        var defaultValue = typeof this.defaultValue === "function" ? this.defaultValue() : this.defaultValue;
        if (typeof this.defaultValue === "function")
            typecheck$$1(this, defaultValue);
        return defaultValue;
    };
    OptionalValue$$1.prototype.isValidSnapshot = function (value, context) {
        // defaulted values can be skipped
        if (value === undefined) {
            return typeCheckSuccess$$1();
        }
        // bounce validation to the sub-type
        return this.type.validate(value, context);
    };
    OptionalValue$$1.prototype.isAssignableFrom = function (type) {
        return this.type.isAssignableFrom(type);
    };
    return OptionalValue$$1;
}(Type$$1));
/**
 * `types.optional` can be used to create a property with a default value.
 * If the given value is not provided in the snapshot, it will default to the provided `defaultValue`.
 * If `defaultValue` is a function, the function will be invoked for every new instance.
 * Applying a snapshot in which the optional value is _not_ present, causes the value to be reset
 *
 * @example
 * const Todo = types.model({
 *   title: types.optional(types.string, "Test"),
 *   done: types.optional(types.boolean, false),
 *   created: types.optional(types.Date, () => new Date())
 * })
 *
 * // it is now okay to omit 'created' and 'done'. created will get a freshly generated timestamp
 * const todo = Todo.create({ title: "Get coffee "})
 *
 * @export
 * @alias types.optional
 */
function optional$$1(type, defaultValueOrFunction) {
    if (process.env.NODE_ENV !== "production") {
        if (!isType$$1(type))
            fail("expected a mobx-state-tree type as first argument, got " + type + " instead");
        var defaultValue = typeof defaultValueOrFunction === "function"
            ? defaultValueOrFunction()
            : defaultValueOrFunction;
        var defaultSnapshot = isStateTreeNode$$1(defaultValue)
            ? getStateTreeNode$$1(defaultValue).snapshot
            : defaultValue;
        typecheck$$1(type, defaultSnapshot);
    }
    return new OptionalValue$$1(type, defaultValueOrFunction);
}

var optionalNullType = optional$$1(nullType$$1, null);
/**
 * Maybe will make a type nullable, and also null by default.
 *
 * @export
 * @alias types.maybe
 * @template S
 * @template T
 * @param {IType<S, T>} type The type to make nullable
 * @returns {(IType<S | null | undefined, T | null>)}
 */
function maybe$$1(type) {
    if (process.env.NODE_ENV !== "production") {
        if (!isType$$1(type))
            fail("expected a mobx-state-tree type as first argument, got " + type + " instead");
        if (type === frozen$$1) {
            fail("Unable to declare `types.maybe(types.frozen)`. Frozen already accepts `null`. Consider using `types.optional(types.frozen, null)` instead.");
        }
    }
    return union$$1(optionalNullType, type);
}

var Late$$1 = /** @class */ (function (_super) {
    __extends(Late$$1, _super);
    function Late$$1(name, definition) {
        var _this = _super.call(this, name) || this;
        _this._subType = null;
        _this.definition = definition;
        return _this;
    }
    Object.defineProperty(Late$$1.prototype, "flags", {
        get: function () {
            return this.subType.flags | TypeFlags$$1.Late;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Late$$1.prototype, "shouldAttachNode", {
        get: function () {
            return this.subType.shouldAttachNode;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Late$$1.prototype, "subType", {
        get: function () {
            if (this._subType === null) {
                this._subType = this.definition();
            }
            return this._subType;
        },
        enumerable: true,
        configurable: true
    });
    Late$$1.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return this.subType.instantiate(parent, subpath, environment, snapshot);
    };
    Late$$1.prototype.reconcile = function (current, newValue) {
        return this.subType.reconcile(current, newValue);
    };
    Late$$1.prototype.describe = function () {
        return this.subType.name;
    };
    Late$$1.prototype.isValidSnapshot = function (value, context) {
        return this.subType.validate(value, context);
    };
    Late$$1.prototype.isAssignableFrom = function (type) {
        return this.subType.isAssignableFrom(type);
    };
    return Late$$1;
}(Type$$1));
/**
 * Defines a type that gets implemented later. This is useful when you have to deal with circular dependencies.
 * Please notice that when defining circular dependencies TypeScript isn't smart enough to inference them.
 * You need to declare an interface to explicit the return type of the late parameter function.
 *
 * @example
 *  interface INode {
 *       childs: INode[]
 *  }
 *
 *   // TypeScript is'nt smart enough to infer self referencing types.
 *  const Node = types.model({
 *       childs: types.optional(types.array(types.late<any, INode>(() => Node)), [])
 *  })
 *
 * @export
 * @alias types.late
 * @template S
 * @template T
 * @param {string} [name] The name to use for the type that will be returned.
 * @param {ILateType<S, T>} type A function that returns the type that will be defined.
 * @returns {IType<S, T>}
 */
function late$$1(nameOrType, maybeType) {
    var name = typeof nameOrType === "string" ? nameOrType : "late(" + nameOrType.toString() + ")";
    var type = typeof nameOrType === "string" ? maybeType : nameOrType;
    // checks that the type is actually a late type
    if (process.env.NODE_ENV !== "production") {
        if (!(typeof type === "function" && type.length === 0))
            fail("Invalid late type, expected a function with zero arguments that returns a type, got: " +
                type);
    }
    return new Late$$1(name, type);
}

var Frozen$$1 = /** @class */ (function (_super) {
    __extends(Frozen$$1, _super);
    function Frozen$$1() {
        var _this = _super.call(this, "frozen") || this;
        _this.shouldAttachNode = false;
        _this.flags = TypeFlags$$1.Frozen;
        return _this;
    }
    Frozen$$1.prototype.describe = function () {
        return "<any immutable value>";
    };
    Frozen$$1.prototype.instantiate = function (parent, subpath, environment, value) {
        // deep freeze the object/array only in dev mode
        var finalValue = process.env.NODE_ENV !== "production" ? deepFreeze(value) : value;
        // create the node
        return createNode$$1(this, parent, subpath, environment, finalValue);
    };
    Frozen$$1.prototype.isValidSnapshot = function (value, context) {
        if (!isSerializable(value)) {
            return typeCheckFailure$$1(context, value, "Value is not serializable and cannot be frozen");
        }
        return typeCheckSuccess$$1();
    };
    return Frozen$$1;
}(Type$$1));
/**
 * Frozen can be used to story any value that is serializable in itself (that is valid JSON).
 * Frozen values need to be immutable or treated as if immutable. They need be serializable as well.
 * Values stored in frozen will snapshotted as-is by MST, and internal changes will not be tracked.
 *
 * This is useful to store complex, but immutable values like vectors etc. It can form a powerful bridge to parts of your application that should be immutable, or that assume data to be immutable.
 *
 * Note: if you want to store free-form state that is mutable, or not serializeable, consider using volatile state instead.
 *
 * @example
 * const GameCharacter = types.model({
 *   name: string,
 *   location: types.frozen
 * })
 *
 * const hero = GameCharacter.create({
 *   name: "Mario",
 *   location: { x: 7, y: 4 }
 * })
 *
 * hero.location = { x: 10, y: 2 } // OK
 * hero.location.x = 7 // Not ok!
 *
 * @alias types.frozen
 */
var frozen$$1 = new Frozen$$1();

var StoredReference = /** @class */ (function () {
    function StoredReference(mode, value) {
        this.mode = mode;
        this.value = value;
        if (mode === "object") {
            if (!isStateTreeNode$$1(value))
                return fail("Can only store references to tree nodes, got: '" + value + "'");
            var targetNode = getStateTreeNode$$1(value);
            if (!targetNode.identifierAttribute)
                return fail("Can only store references with a defined identifier attribute.");
        }
    }
    return StoredReference;
}());
var BaseReferenceType$$1 = /** @class */ (function (_super) {
    __extends(BaseReferenceType$$1, _super);
    function BaseReferenceType$$1(targetType) {
        var _this = _super.call(this, "reference(" + targetType.name + ")") || this;
        _this.targetType = targetType;
        _this.flags = TypeFlags$$1.Reference;
        return _this;
    }
    BaseReferenceType$$1.prototype.describe = function () {
        return this.name;
    };
    BaseReferenceType$$1.prototype.isAssignableFrom = function (type) {
        return this.targetType.isAssignableFrom(type);
    };
    BaseReferenceType$$1.prototype.isValidSnapshot = function (value, context) {
        return typeof value === "string" || typeof value === "number"
            ? typeCheckSuccess$$1()
            : typeCheckFailure$$1(context, value, "Value is not a valid identifier, which is a string or a number");
    };
    return BaseReferenceType$$1;
}(Type$$1));
var IdentifierReferenceType$$1 = /** @class */ (function (_super) {
    __extends(IdentifierReferenceType$$1, _super);
    function IdentifierReferenceType$$1(targetType) {
        var _this = _super.call(this, targetType) || this;
        _this.shouldAttachNode = true;
        return _this;
    }
    IdentifierReferenceType$$1.prototype.getValue = function (node) {
        if (!node.isAlive)
            return undefined;
        var ref = node.storedValue;
        // id already resolved, return
        if (ref.mode === "object")
            return ref.value;
        // reference was initialized with the identifier of the target
        var target = node.root.identifierCache.resolve(this.targetType, ref.value);
        if (!target)
            return fail("Failed to resolve reference of type " + this.targetType
                .name + ": '" + ref.value + "' (in: " + node.path + ")");
        return target.value;
    };
    IdentifierReferenceType$$1.prototype.getSnapshot = function (node) {
        var ref = node.storedValue;
        switch (ref.mode) {
            case "identifier":
                return ref.value;
            case "object":
                return getStateTreeNode$$1(ref.value).identifier;
        }
    };
    IdentifierReferenceType$$1.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        return createNode$$1(this, parent, subpath, environment, new StoredReference(isStateTreeNode$$1(snapshot) ? "object" : "identifier", snapshot));
    };
    IdentifierReferenceType$$1.prototype.reconcile = function (current, newValue) {
        if (current.type === this) {
            var targetMode = isStateTreeNode$$1(newValue) ? "object" : "identifier";
            var ref = current.storedValue;
            if (targetMode === ref.mode && ref.value === newValue)
                return current;
        }
        var newNode = this.instantiate(current.parent, current.subpath, current._environment, newValue);
        current.die();
        return newNode;
    };
    return IdentifierReferenceType$$1;
}(BaseReferenceType$$1));
var CustomReferenceType$$1 = /** @class */ (function (_super) {
    __extends(CustomReferenceType$$1, _super);
    function CustomReferenceType$$1(targetType, options) {
        var _this = _super.call(this, targetType) || this;
        _this.options = options;
        _this.shouldAttachNode = false;
        return _this;
    }
    CustomReferenceType$$1.prototype.getValue = function (node) {
        if (!node.isAlive)
            return undefined;
        return this.options.get(node.storedValue, node.parent ? node.parent.storedValue : null);
    };
    CustomReferenceType$$1.prototype.getSnapshot = function (node) {
        return node.storedValue;
    };
    CustomReferenceType$$1.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        var identifier$$1 = isStateTreeNode$$1(snapshot)
            ? this.options.set(snapshot, parent ? parent.storedValue : null)
            : snapshot;
        return createNode$$1(this, parent, subpath, environment, identifier$$1);
    };
    CustomReferenceType$$1.prototype.reconcile = function (current, snapshot) {
        var newIdentifier = isStateTreeNode$$1(snapshot)
            ? this.options.set(snapshot, current ? current.storedValue : null)
            : snapshot;
        if (current.type === this) {
            if (current.storedValue === newIdentifier)
                return current;
        }
        var newNode = this.instantiate(current.parent, current.subpath, current._environment, newIdentifier);
        current.die();
        return newNode;
    };
    return CustomReferenceType$$1;
}(BaseReferenceType$$1));
/**
 * Creates a reference to another type, which should have defined an identifier.
 * See also the [reference and identifiers](https://github.com/mobxjs/mobx-state-tree#references-and-identifiers) section.
 *
 * @export
 * @alias types.reference
 */
function reference$$1(subType, options) {
    // check that a type is given
    if (process.env.NODE_ENV !== "production") {
        if (!isType$$1(subType))
            fail("expected a mobx-state-tree type as first argument, got " + subType + " instead");
        if (arguments.length === 2 && typeof arguments[1] === "string")
            fail("References with base path are no longer supported. Please remove the base path.");
    }
    if (options)
        return new CustomReferenceType$$1(subType, options);
    else
        return new IdentifierReferenceType$$1(subType);
}

var IdentifierType$$1 = /** @class */ (function (_super) {
    __extends(IdentifierType$$1, _super);
    function IdentifierType$$1(identifierType) {
        var _this = _super.call(this, "identifier(" + identifierType.name + ")") || this;
        _this.identifierType = identifierType;
        _this.shouldAttachNode = false;
        _this.flags = TypeFlags$$1.Identifier;
        return _this;
    }
    IdentifierType$$1.prototype.instantiate = function (parent, subpath, environment, snapshot) {
        if (!parent || !isStateTreeNode$$1(parent.storedValue))
            return fail("Identifier types can only be instantiated as direct child of a model type");
        if (parent.identifierAttribute)
            fail("Cannot define property '" + subpath + "' as object identifier, property '" + parent.identifierAttribute + "' is already defined as identifier property");
        parent.identifierAttribute = subpath;
        return createNode$$1(this, parent, subpath, environment, snapshot);
    };
    IdentifierType$$1.prototype.reconcile = function (current, newValue) {
        if (current.storedValue !== newValue)
            return fail("Tried to change identifier from '" + current.storedValue + "' to '" + newValue + "'. Changing identifiers is not allowed.");
        return current;
    };
    IdentifierType$$1.prototype.describe = function () {
        return "identifier(" + this.identifierType.describe() + ")";
    };
    IdentifierType$$1.prototype.isValidSnapshot = function (value, context) {
        if (value === undefined ||
            value === null ||
            typeof value === "string" ||
            typeof value === "number")
            return this.identifierType.validate(value, context);
        return typeCheckFailure$$1(context, value, "Value is not a valid identifier, which is a string or a number");
    };
    return IdentifierType$$1;
}(Type$$1));
/**
 * Identifiers are used to make references, lifecycle events and reconciling works.
 * Inside a state tree, for each type can exist only one instance for each given identifier.
 * For example there couldn't be 2 instances of user with id 1. If you need more, consider using references.
 * Identifier can be used only as type property of a model.
 * This type accepts as parameter the value type of the identifier field that can be either string or number.
 *
 * @example
 *  const Todo = types.model("Todo", {
 *      id: types.identifier(types.string),
 *      title: types.string
 *  })
 *
 * @export
 * @alias types.identifier
 * @template T
 * @param {IType<T, T>} baseType
 * @returns {IType<T, T>}
 */
function identifier$$1(baseType) {
    if (baseType === void 0) { baseType = string$$1; }
    if (process.env.NODE_ENV !== "production") {
        if (!isType$$1(baseType))
            fail("expected a mobx-state-tree type as first argument, got " + baseType + " instead");
    }
    return new IdentifierType$$1(baseType);
}

/**
 * All imports / exports should be proxied through this file.
 * Why? It gives us full control over the module load order, preventing circular dependency isses
 */

/** all code is initially loaded through internal, to avoid circular dep issues */
// tslint:disable-next-line:no_unused-variable
var types = {
    enumeration: enumeration$$1,
    model: model$$1,
    compose: compose$$1,
    reference: reference$$1,
    union: union$$1,
    optional: optional$$1,
    literal: literal$$1,
    maybe: maybe$$1,
    refinement: refinement$$1,
    string: string$$1,
    boolean: boolean$$1,
    number: number$$1,
    Date: DatePrimitive$$1,
    map: map$$1,
    array: array$$1,
    frozen: frozen$$1,
    identifier: identifier$$1,
    late: late$$1,
    undefined: undefinedType$$1,
    null: nullType$$1
};

export { types, typecheckPublic$$1 as typecheck, escapeJsonPath$$1 as escapeJsonPath, unescapeJsonPath$$1 as unescapeJsonPath, decorate$$1 as decorate, addMiddleware$$1 as addMiddleware, process$1$$1 as process, isStateTreeNode$$1 as isStateTreeNode, flow, applyAction$$1 as applyAction, onAction$$1 as onAction, recordActions$$1 as recordActions, createActionTrackingMiddleware, getType$$1 as getType, getChildType$$1 as getChildType, onPatch$$1 as onPatch, onSnapshot$$1 as onSnapshot, applyPatch$$1 as applyPatch, recordPatches$$1 as recordPatches, protect$$1 as protect, unprotect$$1 as unprotect, isProtected$$1 as isProtected, applySnapshot$$1 as applySnapshot, getSnapshot$$1 as getSnapshot, hasParent$$1 as hasParent, getParent$$1 as getParent, getRoot$$1 as getRoot, getPath$$1 as getPath, getPathParts$$1 as getPathParts, isRoot$$1 as isRoot, resolvePath$$1 as resolvePath, resolveIdentifier$$1 as resolveIdentifier, tryResolve$$1 as tryResolve, getRelativePath$$1 as getRelativePath, clone$$1 as clone, detach$$1 as detach, destroy$$1 as destroy, isAlive$$1 as isAlive, addDisposer$$1 as addDisposer, getEnv$$1 as getEnv, walk$$1 as walk };
