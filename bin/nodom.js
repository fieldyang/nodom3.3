var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define("application", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Application = void 0;
    class Application {
        static getPath(type) {
            if (!this.path) {
                return '';
            }
            let appPath = this.path.app || '';
            if (type === 'app') {
                return appPath;
            }
            else if (type === 'route') {
                return this.path.route || '';
            }
            else {
                let p = this.path[type] || '';
                if (appPath !== '') {
                    if (p !== '') {
                        return appPath + '/' + p;
                    }
                    else {
                        return appPath;
                    }
                }
                return p;
            }
        }
        static setPath(pathObj) {
            this.path = pathObj;
        }
    }
    exports.Application = Application;
});
define("renderer", ["require", "exports", "modulefactory"], function (require, exports, modulefactory_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Renderer = void 0;
    class Renderer {
        static add(module) {
            if (module.state !== 3) {
                return;
            }
            if (!this.waitList.includes(module.id)) {
                this.waitList.push(module.id);
            }
        }
        static remove(module) {
            let ind;
            if ((ind = this.waitList.indexOf(module.id)) !== -1) {
                this.waitList.splice(ind, 1);
            }
        }
        static render() {
            for (let i = 0; i < this.waitList.length; i++) {
                let m = modulefactory_1.ModuleFactory.get(this.waitList[i]);
                if (!m || m.render()) {
                    this.waitList.shift();
                    i--;
                }
            }
        }
    }
    exports.Renderer = Renderer;
    Renderer.waitList = [];
});
define("modelmanager", ["require", "exports", "renderer"], function (require, exports, renderer_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ModelManager = void 0;
    class ModelManager {
        constructor(module) {
            this.dataMap = new WeakMap();
            this.modelMap = new WeakMap();
            this.module = module;
        }
        addToDataMap(data, model) {
            this.dataMap.set(data, model);
        }
        getFromDataMap(data) {
            return this.dataMap.get(data);
        }
        hasDataNModel(data) {
            return this.dataMap.has(data);
        }
        addModelToModelMap(model, srcNModel) {
            if (!this.modelMap.has(model)) {
                this.modelMap.set(model, { model: srcNModel });
            }
            else {
                this.modelMap.get(model).model = srcNModel;
            }
        }
        getModelFromModelMap(model) {
            if (this.modelMap.has(model)) {
                return this.modelMap.get(model).model;
            }
            return undefined;
        }
        addWatcherToModelMap(model, key, foo) {
            if (!this.modelMap.has(model)) {
                this.modelMap.set(model, {});
            }
            if (!this.modelMap.get(model).watchers) {
                this.modelMap.get(model).watchers = Object.create(null);
            }
            let watchers = this.modelMap.get(model).watchers;
            if (!watchers[key]) {
                watchers[key] = [];
            }
            watchers[key].push(foo);
        }
        removeWatcherFromModelMap(model, key, foo) {
            if (!this.modelMap.has(model)) {
                return;
            }
            if (!this.modelMap.get(model).watchers) {
                return;
            }
            let watchers = this.modelMap.get(model).watchers;
            if (!watchers[key]) {
                return;
            }
            let index = watchers[key].findIndex(foo);
            if (index !== -1) {
                watchers.splice(index, 1);
            }
        }
        getWatcherFromModelMap(model, key) {
            if (!this.modelMap.has(model)) {
                return undefined;
            }
            let watchers = this.modelMap.get(model).watchers;
            if (watchers) {
                return watchers[key];
            }
        }
        update(model, key, oldValue, newValue) {
            renderer_1.Renderer.add(this.module);
            let watcher = this.getWatcherFromModelMap(model, key);
            if (watcher) {
                for (let foo of watcher) {
                    if (typeof foo === 'string') {
                        if (this.module) {
                            foo = this.module.getMethod(foo);
                            if (foo) {
                                foo.call(model, oldValue, newValue);
                            }
                        }
                    }
                    else {
                        foo.call(model, oldValue, newValue);
                    }
                }
            }
        }
    }
    exports.ModelManager = ModelManager;
});
define("model", ["require", "exports", "modulefactory"], function (require, exports, modulefactory_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Model = void 0;
    class Model {
        constructor(data, module) {
            let mm = module.modelManager;
            let proxy = new Proxy(data, {
                set: (src, key, value, receiver) => {
                    if (src[key] === value) {
                        return true;
                    }
                    let excludes = ['__proto__', 'constructor'];
                    if (Array.isArray(src)) {
                        excludes.push('length');
                    }
                    if (excludes.includes(key)) {
                        return true;
                    }
                    if (typeof value !== 'object' || !value.$watch) {
                        mm.update(proxy, key, src[key], value);
                        src[key] = value;
                    }
                    return true;
                },
                get: (src, key, receiver) => {
                    if (typeof src[key] === 'object') {
                        if (!src[key].$watch) {
                            let p = new Model(src[key], module);
                            receiver[key] = p;
                            return p;
                        }
                        else {
                            return module.modelManager.getFromDataMap(src[key]);
                        }
                    }
                    return src[key];
                }
            });
            proxy.$watch = this.$watch;
            proxy.$moduleId = module.id;
            proxy.$query = this.$query;
            mm.addToDataMap(data, proxy);
            mm.addModelToModelMap(proxy, data);
            return proxy;
        }
        $watch(key, operate, cancel) {
            let model = this.$query(key);
            if (!model) {
                return;
            }
            let mod = modulefactory_2.ModuleFactory.get(this.$moduleId);
            if (cancel) {
                mod.modelManager.removeWatcherFromModelMap(model, key, operate);
            }
            else {
                mod.modelManager.addWatcherToModelMap(model, key, operate);
            }
        }
        $query(key) {
            let model = this;
            if (key.indexOf('.') !== -1) {
                let arr = key.split('.');
                for (let i = 0; i < arr.length - 1; i++) {
                    model = model[arr[i]];
                    if (!model) {
                        break;
                    }
                }
                if (!model) {
                    return;
                }
                key = arr[arr.length - 1];
            }
            else {
                return model[key];
            }
        }
    }
    exports.Model = Model;
});
define("util", ["require", "exports", "error", "nodom"], function (require, exports, error_1, nodom_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Util = void 0;
    class Util {
        static genId() {
            return this.generatedId++;
        }
        static clone(srcObj, expKey, extra) {
            let me = this;
            let map = new WeakMap();
            return clone(srcObj, expKey, extra);
            function clone(src, expKey, extra) {
                if (!src || typeof src !== 'object' || Util.isFunction(src)) {
                    return src;
                }
                let dst;
                if (src.clone && Util.isFunction(src.clone)) {
                    return src.clone(extra);
                }
                else if (me.isObject(src)) {
                    dst = new Object();
                    map.set(src, dst);
                    Object.getOwnPropertyNames(src).forEach((prop) => {
                        if (expKey) {
                            if (expKey.constructor === RegExp && expKey.test(prop)
                                || Util.isArray(expKey) && expKey.includes(prop)) {
                                return;
                            }
                        }
                        dst[prop] = getCloneObj(src[prop], expKey, extra);
                    });
                }
                else if (me.isMap(src)) {
                    dst = new Map();
                    src.forEach((value, key) => {
                        if (expKey) {
                            if (expKey.constructor === RegExp && expKey.test(key)
                                || expKey.includes(key)) {
                                return;
                            }
                        }
                        dst.set(key, getCloneObj(value, expKey, extra));
                    });
                }
                else if (me.isArray(src)) {
                    dst = new Array();
                    src.forEach(function (item, i) {
                        dst[i] = getCloneObj(item, expKey, extra);
                    });
                }
                return dst;
            }
            function getCloneObj(value, expKey, extra) {
                if (typeof value === 'object' && !Util.isFunction(value)) {
                    let co = null;
                    if (!map.has(value)) {
                        co = clone(value, expKey, extra);
                    }
                    else {
                        co = map.get(value);
                    }
                    return co;
                }
                return value;
            }
        }
        static merge(o1, o2, o3, o4, o5, o6) {
            let me = this;
            for (let i = 0; i < arguments.length; i++) {
                if (!this.isObject(arguments[i])) {
                    throw new error_1.NError('invoke', 'Util.merge', i + '', 'object');
                }
            }
            let retObj = Object.assign.apply(null, arguments);
            subObj(retObj);
            return retObj;
            function subObj(obj) {
                for (let o in obj) {
                    if (me.isObject(obj[o]) || me.isArray(obj[o])) {
                        retObj[o] = me.clone(retObj[o]);
                    }
                }
            }
        }
        static assign(obj1, obj2) {
            if (Object.assign) {
                Object.assign(obj1, obj2);
            }
            else {
                this.getOwnProps(obj2).forEach(function (p) {
                    obj1[p] = obj2[p];
                });
            }
            return obj1;
        }
        static getOwnProps(obj) {
            if (!obj) {
                return [];
            }
            return Object.getOwnPropertyNames(obj);
        }
        static isFunction(foo) {
            return foo !== undefined && foo !== null && foo.constructor === Function;
        }
        static isArray(obj) {
            return Array.isArray(obj);
        }
        static isMap(obj) {
            return obj !== null && obj !== undefined && obj.constructor === Map;
        }
        static isObject(obj) {
            return obj !== null && obj !== undefined && obj.constructor === Object;
        }
        static isInt(v) {
            return Number.isInteger(v);
        }
        static isNumber(v) {
            return typeof v === 'number';
        }
        static isBoolean(v) {
            return typeof v === 'boolean';
        }
        static isString(v) {
            return typeof v === 'string';
        }
        static isNumberString(v) {
            return /^\d+\.?\d*$/.test(v);
        }
        static isEmpty(obj) {
            if (obj === null || obj === undefined)
                return true;
            let tp = typeof obj;
            if (this.isObject(obj)) {
                let keys = Object.keys(obj);
                if (keys !== undefined) {
                    return keys.length === 0;
                }
            }
            else if (tp === 'string') {
                return obj === '';
            }
            return false;
        }
        static findObjByProps(obj, props, one) {
            if (!this.isObject(obj)) {
                throw new error_1.NError('invoke', 'this.findObjByProps', '0', 'Object');
            }
            one = one || false;
            let ps = this.getOwnProps(props);
            let find = false;
            if (one === false) {
                find = true;
                for (let i = 0; i < ps.length; i++) {
                    let p = ps[i];
                    if (obj[p] !== props[p]) {
                        find = false;
                        break;
                    }
                }
            }
            else {
                for (let i = 0; i < ps.length; i++) {
                    let p = ps[i];
                    if (obj[p] === props[p]) {
                        find = true;
                        break;
                    }
                }
            }
            if (find) {
                return obj;
            }
            for (let p in obj) {
                let o = obj[p];
                if (o !== null) {
                    if (this.isObject(o)) {
                        let oprops = this.getOwnProps(o);
                        for (let i = 0; i < oprops.length; i++) {
                            let item = o[oprops[i]];
                            if (item !== null && this.isObject(item)) {
                                let r = this.findObjByProps(item, props, one);
                                if (r !== null) {
                                    return r;
                                }
                            }
                        }
                    }
                    else if (this.isArray(o)) {
                        for (let i = 0; i < o.length; i++) {
                            let item = o[i];
                            if (item !== null && this.isObject(item)) {
                                let r = this.findObjByProps(item, props, one);
                                if (r !== null) {
                                    return r;
                                }
                            }
                        }
                    }
                }
            }
            return null;
        }
        static get(selector, findAll, pview) {
            pview = pview || document;
            if (findAll === true) {
                return pview.querySelectorAll(selector);
            }
            return pview.querySelector(selector);
        }
        static isEl(el) {
            return el instanceof HTMLElement || el instanceof SVGElement;
        }
        static isNode(node) {
            return node !== undefined && node !== null && (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE);
        }
        static newEl(tagName, config, text) {
            if (!this.isString(tagName) || this.isEmpty(tagName)) {
                throw new error_1.NError('invoke', 'this.newEl', '0', 'string');
            }
            let el = document.createElement(tagName);
            if (this.isObject(config)) {
                this.attr(el, config);
            }
            else if (this.isString(text)) {
                el.innerHTML = text;
            }
            return el;
        }
        static newSvgEl(tagName, config) {
            let el = document.createElementNS("http://www.w3.org/2000/svg", tagName);
            if (this.isObject(config)) {
                this.attr(el, config);
            }
            return el;
        }
        static replaceNode(srcNode, nodes) {
            if (!this.isNode(srcNode)) {
                throw new error_1.NError('invoke', 'this.replaceNode', '0', 'Node');
            }
            if (!this.isNode(nodes) && !this.isArray(nodes)) {
                throw new error_1.NError('invoke1', 'this.replaceNode', '1', 'Node', 'Node Array');
            }
            let pnode = srcNode.parentNode;
            let bnode = srcNode.nextSibling;
            if (pnode === null) {
                return;
            }
            pnode.removeChild(srcNode);
            const nodeArr = this.isArray(nodes) ? nodes : [nodes];
            nodeArr.forEach(function (node) {
                if (bnode === undefined || bnode === null) {
                    pnode.appendChild(node);
                }
                else {
                    pnode.insertBefore(node, bnode);
                }
            });
        }
        static empty(el) {
            const me = this;
            if (!me.isEl(el)) {
                throw new error_1.NError('invoke', 'this.empty', '0', 'Element');
            }
            let nodes = el.childNodes;
            for (let i = nodes.length - 1; i >= 0; i--) {
                el.removeChild(nodes[i]);
            }
        }
        static remove(node) {
            const me = this;
            if (!me.isNode(node)) {
                throw new error_1.NError('invoke', 'this.remove', '0', 'Node');
            }
            if (node.parentNode !== null) {
                node.parentNode.removeChild(node);
            }
        }
        static attr(el, param, value) {
            const me = this;
            if (!me.isEl(el)) {
                throw new error_1.NError('invoke', 'this.attr', '0', 'Element');
            }
            if (this.isEmpty(param)) {
                throw new error_1.NError('invoke', 'this.attr', '1', 'string', 'object');
            }
            if (value === undefined || value === null) {
                if (this.isObject(param)) {
                    this.getOwnProps(param).forEach(function (k) {
                        if (k === 'value') {
                            el[k] = param[k];
                        }
                        else {
                            el.setAttribute(k, param[k]);
                        }
                    });
                }
                else if (this.isString(param)) {
                    if (param === 'value') {
                        return param[value];
                    }
                    return el.getAttribute(param);
                }
            }
            else {
                if (param === 'value') {
                    el[param] = value;
                }
                else {
                    el.setAttribute(param, value);
                }
            }
        }
        static formatDate(srcDate, format) {
            let timeStamp;
            if (this.isString(srcDate)) {
                let reg = /^\d+$/;
                if (reg.test(srcDate) === true) {
                    timeStamp = parseInt(srcDate);
                }
            }
            else if (this.isNumber(srcDate)) {
                timeStamp = srcDate;
            }
            else {
                throw new error_1.NError('invoke', 'this.formatDate', '0', 'date string', 'date');
            }
            let date = new Date(timeStamp);
            if (isNaN(date.getDay())) {
                return '';
            }
            let o = {
                "M+": date.getMonth() + 1,
                "d+": date.getDate(),
                "h+": date.getHours() % 12 === 0 ? 12 : date.getHours() % 12,
                "H+": date.getHours(),
                "m+": date.getMinutes(),
                "s+": date.getSeconds(),
                "q+": Math.floor((date.getMonth() + 3) / 3),
                "S": date.getMilliseconds()
            };
            if (/(y+)/.test(format)) {
                format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
            }
            this.getOwnProps(o).forEach(function (k) {
                if (new RegExp("(" + k + ")").test(format)) {
                    format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
                }
            });
            if (/(E+)/.test(format)) {
                format = format.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? "/u661f/u671f" : "/u5468") : "") + nodom_1.Nodom.tipMessage.WeekDays[date.getDay() + ""]);
            }
            return format;
        }
        static compileStr(src, p1, p2, p3, p4, p5) {
            let reg;
            let args = arguments;
            let index = 0;
            for (;;) {
                if (src.indexOf('\{' + index + '\}') !== -1) {
                    reg = new RegExp('\\{' + index + '\\}', 'g');
                    src = src.replace(reg, args[index + 1]);
                    index++;
                }
                else {
                    break;
                }
            }
            return src;
        }
        static apply(foo, obj, args) {
            if (!foo) {
                return;
            }
            return Reflect.apply(foo, obj || null, args);
        }
        static mergePath(paths) {
            return paths.join('/').replace(/(\/{2,})|\\\//g, '\/');
        }
    }
    exports.Util = Util;
    Util.generatedId = 1;
});
define("serializer", ["require", "exports", "util"], function (require, exports, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Serializer = void 0;
    class Serializer {
        static serialize(module) {
            let dom = module.virtualDom;
            addClsName(dom);
            return JSON.stringify(dom);
            function addClsName(obj) {
                if (typeof obj !== 'object') {
                    return;
                }
                obj.className = obj.constructor.name;
                util_1.Util.getOwnProps(obj).forEach((item) => {
                    if (util_1.Util.isArray(obj[item])) {
                        if (obj[item].length === 0) {
                            delete obj[item];
                        }
                        else {
                            obj[item].forEach((item1) => {
                                addClsName(item1);
                            });
                        }
                    }
                    else if (typeof obj[item] === 'object') {
                        if (util_1.Util.isEmpty(obj[item])) {
                            delete obj[item];
                        }
                        else {
                            addClsName(obj[item]);
                        }
                    }
                });
            }
        }
        static deserialize(jsonStr) {
            let jObj = JSON.parse(jsonStr);
            return handleCls(jObj);
            function handleCls(jsonObj) {
                if (!util_1.Util.isObject(jsonObj)) {
                    return jsonObj;
                }
                let retObj;
                if (jsonObj.hasOwnProperty('className')) {
                    const cls = jsonObj['className'];
                    let param = [];
                    switch (cls) {
                        case 'Directive':
                            param = [jsonObj['type']];
                            break;
                        case 'Expression':
                            param = [jsonObj['execString']];
                            break;
                        case 'Element':
                            param = [];
                            break;
                        case 'NodomNEvent':
                            param = [jsonObj['name']];
                            break;
                    }
                    let clazz = eval(cls);
                    retObj = Reflect.construct(clazz, param);
                }
                else {
                    retObj = {};
                }
                let objArr = [];
                let arrArr = [];
                util_1.Util.getOwnProps(jsonObj).forEach((item) => {
                    if (util_1.Util.isObject(jsonObj[item])) {
                        objArr.push(item);
                    }
                    else if (util_1.Util.isArray(jsonObj[item])) {
                        arrArr.push(item);
                    }
                    else {
                        if (item !== 'className') {
                            retObj[item] = jsonObj[item];
                        }
                    }
                });
                objArr.forEach((item) => {
                    retObj[item] = handleCls(jsonObj[item]);
                });
                arrArr.forEach(item => {
                    retObj[item] = [];
                    jsonObj[item].forEach((item1) => {
                        retObj[item].push(handleCls(item1));
                    });
                });
                return retObj;
            }
        }
    }
    exports.Serializer = Serializer;
});
define("router", ["require", "exports", "application", "error", "model", "modulefactory", "nodom", "util"], function (require, exports, application_1, error_2, model_1, modulefactory_3, nodom_2, util_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Route = exports.Router = void 0;
    class Router {
        static go(path) {
            return __awaiter(this, void 0, void 0, function* () {
                for (let i = 0; i < this.waitList.length; i++) {
                    let li = this.waitList[i];
                    if (li === path) {
                        return;
                    }
                    if (li.indexOf(path) === 0 && li.substr(path.length + 1, 1) === '/') {
                        return;
                    }
                }
                this.waitList.push(path);
                this.load();
            });
        }
        static load() {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.loading || this.waitList.length === 0) {
                    return;
                }
                let path = this.waitList.shift();
                this.loading = true;
                yield this.start(path);
                this.loading = false;
                this.load();
            });
        }
        static start(path) {
            return __awaiter(this, void 0, void 0, function* () {
                let diff = this.compare(this.currentPath, path);
                let parentModule;
                if (diff[0] === null) {
                    parentModule = findParentModule();
                }
                else {
                    if (typeof diff[0].module === 'string') {
                        parentModule = yield modulefactory_3.ModuleFactory.getInstance(diff[0].module, diff[0].moduleName, diff[0].dataUrl);
                    }
                    else {
                        parentModule = modulefactory_3.ModuleFactory.get(diff[0].module);
                    }
                }
                if (!parentModule) {
                    return;
                }
                for (let i = diff[1].length - 1; i >= 0; i--) {
                    const r = diff[1][i];
                    if (!r.module) {
                        continue;
                    }
                    let module = modulefactory_3.ModuleFactory.get(r.module);
                    if (util_2.Util.isFunction(this.onDefaultLeave)) {
                        this.onDefaultLeave(module.model);
                    }
                    if (util_2.Util.isFunction(r.onLeave)) {
                        r.onLeave(module.model);
                    }
                    module.unactive();
                }
                let showPath;
                if (diff[2].length === 0) {
                    let route = diff[0];
                    let proute = diff[3];
                    if (route !== null) {
                        showPath = route.useParentPath && proute ? proute.fullPath : route.fullPath;
                        let module = modulefactory_3.ModuleFactory.get(route.module);
                        route.setLinkActive();
                        module.setFirstRender(true);
                        yield module.active();
                        setRouteParamToNModel(route, module);
                    }
                }
                else {
                    for (let ii = 0, index = 0, len = diff[2].length; ii < len; ii++) {
                        let route = diff[2][ii];
                        if (!route || !route.module) {
                            continue;
                        }
                        if (!route.useParentPath) {
                            showPath = route.fullPath;
                        }
                        let module;
                        if (typeof route.module === 'string') {
                            module = yield modulefactory_3.ModuleFactory.getInstance(route.module, route.moduleName, route.dataUrl);
                            if (!module) {
                                throw new error_2.NError('notexist1', nodom_2.Nodom.tipMessage.TipWords['module'], route.module);
                            }
                            route.module = module.id;
                        }
                        else {
                            module = modulefactory_3.ModuleFactory.get(route.module);
                        }
                        module.setFirstRender(true);
                        let routerKey = Router.routerKeyMap.get(parentModule.id);
                        for (let i = 0; i < parentModule.children.length; i++) {
                            let m = modulefactory_3.ModuleFactory.get(parentModule.children[i]);
                            if (m && m.isContainerKey(routerKey)) {
                                parentModule.children.splice(i, 1);
                                break;
                            }
                        }
                        parentModule.addChild(module.id);
                        module.setContainerKey(routerKey);
                        yield module.active();
                        route.setLinkActive();
                        setRouteParamToNModel(route);
                        if (util_2.Util.isFunction(this.onDefaultEnter)) {
                            this.onDefaultEnter(module.model);
                        }
                        if (util_2.Util.isFunction(route.onEnter)) {
                            route.onEnter(module.model);
                        }
                        parentModule = module;
                    }
                }
                if (this.startStyle !== 2 && showPath) {
                    let p = util_2.Util.mergePath([application_1.Application.getPath('route'), showPath]);
                    if (this.showPath && showPath.indexOf(this.showPath) === 0) {
                        history.replaceState(path, '', p);
                    }
                    else {
                        history.pushState(path, '', p);
                    }
                    this.showPath = showPath;
                }
                this.currentPath = path;
                this.startStyle = 0;
                function setRouteParamToNModel(route, module) {
                    if (!route) {
                        return;
                    }
                    if (!module) {
                        module = modulefactory_3.ModuleFactory.get(route.module);
                    }
                    let o = {
                        path: route.path
                    };
                    if (!util_2.Util.isEmpty(route.data)) {
                        o['data'] = route.data;
                    }
                    if (!module.model) {
                        module.model = new model_1.Model({}, module);
                    }
                    module.model['$route'] = o;
                }
                function findParentModule(pm) {
                    if (!pm) {
                        pm = modulefactory_3.ModuleFactory.getMain();
                    }
                    if (Router.routerKeyMap.has(pm.id)) {
                        return pm;
                    }
                    for (let c of pm.children) {
                        let m = modulefactory_3.ModuleFactory.get(c);
                        return findParentModule(m);
                    }
                }
            });
        }
        static redirect(path) {
            this.go(path);
        }
        static addRoute(route, parent) {
            if (RouterTree.add(route, parent) === false) {
                throw new error_2.NError("exist1", nodom_2.Nodom.tipMessage.TipWords['route'], route.path);
            }
            this.routes.set(route.id, route);
        }
        static getRoute(path, last) {
            if (!path) {
                return null;
            }
            let routes = RouterTree.get(path);
            if (routes === null || routes.length === 0) {
                return null;
            }
            if (last) {
                return [routes.pop()];
            }
            else {
                return routes;
            }
        }
        static compare(path1, path2) {
            let arr1 = null;
            let arr2 = null;
            if (path1) {
                arr1 = this.getRoute(path1);
            }
            if (path2) {
                arr2 = this.getRoute(path2);
            }
            let len = 0;
            if (arr1 !== null) {
                len = arr1.length;
            }
            if (arr2 !== null) {
                if (arr2.length < len) {
                    len = arr2.length;
                }
            }
            else {
                len = 0;
            }
            let retArr1 = [];
            let retArr2 = [];
            let i = 0;
            for (i = 0; i < len; i++) {
                if (arr1[i].id === arr2[i].id) {
                    if (JSON.stringify(arr1[i].data) !== JSON.stringify(arr2[i].data)) {
                        i++;
                        break;
                    }
                }
                else {
                    break;
                }
            }
            if (arr1 !== null) {
                for (let j = i; j < arr1.length; j++) {
                    retArr1.push(arr1[j]);
                }
            }
            if (arr2 !== null) {
                for (let j = i; j < arr2.length; j++) {
                    retArr2.push(arr2[j]);
                }
            }
            let p1 = null;
            let p2 = null;
            if (arr1 !== null && i > 0) {
                for (let j = i - 1; j >= 0 && (p1 === null || p2 === null); j--) {
                    if (arr1[j].module !== undefined) {
                        if (p1 === null) {
                            p1 = arr1[j];
                        }
                        else if (p2 === null) {
                            p2 = arr1[j];
                        }
                    }
                }
            }
            return [p1, retArr1, retArr2, p2];
        }
        static changeActive(module, path) {
            if (!module || !path || path === '') {
                return;
            }
            let domArr = Router.activeDomMap.get(module.id);
            if (!domArr) {
                return;
            }
            domArr.forEach((item) => {
                let dom = module.getNElement(item);
                if (!dom) {
                    return;
                }
                let domPath = dom.getProp('path');
                if (dom.hasProp('activename')) {
                    let model = module.modelNFactory.get(dom.modelId);
                    if (!model) {
                        return;
                    }
                    let field = dom.getProp('activename');
                    if (path === domPath || path.indexOf(domPath + '/') === 0) {
                        model.set(field, true);
                    }
                    else {
                        model.set(field, false);
                    }
                }
            });
        }
    }
    exports.Router = Router;
    Router.loading = false;
    Router.routes = new Map();
    Router.currentPath = '';
    Router.showPath = '';
    Router.waitList = [];
    Router.currentIndex = 0;
    Router.startStyle = 0;
    Router.activeDomMap = new Map();
    Router.routerKeyMap = new Map();
    class Route {
        constructor(config) {
            this.params = [];
            this.data = {};
            this.children = [];
            for (let o in config) {
                this[o] = config[o];
            }
            if (config.path === '') {
                return;
            }
            this.id = util_2.Util.genId();
            if (!config.notAdd) {
                Router.addRoute(this, config.parent);
            }
            if (util_2.Util.isArray(config.routes)) {
                config.routes.forEach((item) => {
                    item.parent = this;
                    new Route(item);
                });
            }
        }
        setLinkActive() {
            if (this.parent) {
                let pm;
                if (!this.parent.module) {
                    pm = modulefactory_3.ModuleFactory.getMain();
                }
                else {
                    pm = modulefactory_3.ModuleFactory.get(this.parent.module);
                }
                if (pm) {
                    Router.changeActive(pm, this.fullPath);
                }
            }
        }
        addChild(child) {
            this.children.push(child);
            child.parent = this;
        }
    }
    exports.Route = Route;
    class RouterTree {
        static add(route, parent) {
            if (!this.root) {
                this.root = new Route({ path: "", notAdd: true });
            }
            let pathArr = route.path.split('/');
            let node = parent || this.root;
            let param = [];
            let paramIndex = -1;
            let prePath = '';
            for (let i = 0; i < pathArr.length; i++) {
                let v = pathArr[i].trim();
                if (v === '') {
                    pathArr.splice(i--, 1);
                    continue;
                }
                if (v.startsWith(':')) {
                    if (param.length === 0) {
                        paramIndex = i;
                    }
                    param.push(v.substr(1));
                }
                else {
                    paramIndex = -1;
                    param = [];
                    route.path = v;
                    let j = 0;
                    for (; j < node.children.length; j++) {
                        let r = node.children[j];
                        if (r.path === v) {
                            node = r;
                            break;
                        }
                    }
                    if (j === node.children.length) {
                        if (prePath !== '') {
                            let r = new Route({ path: prePath, notAdd: true });
                            node.addChild(r);
                            node = node.children[node.children.length - 1];
                        }
                        prePath = v;
                    }
                }
                if (paramIndex === -1) {
                    route.params = [];
                }
                else {
                    route.params = param;
                }
            }
            if (node !== undefined && node !== route) {
                route.path = prePath;
                node.addChild(route);
            }
            return true;
        }
        static get(path) {
            if (!this.root) {
                throw new error_2.NError("notexist", nodom_2.Nodom.tipMessage.TipWords['root']);
            }
            let pathArr = path.split('/');
            let node = this.root;
            let paramIndex = 0;
            let retArr = [];
            let fullPath = '';
            let preNode = this.root;
            for (let i = 0; i < pathArr.length; i++) {
                let v = pathArr[i].trim();
                if (v === '') {
                    continue;
                }
                let find = false;
                for (let j = 0; j < node.children.length; j++) {
                    if (node.children[j].path === v) {
                        if (preNode !== this.root) {
                            preNode.fullPath = fullPath;
                            preNode.data = node.data;
                            retArr.push(preNode);
                        }
                        node = node.children[j];
                        node.data = {};
                        preNode = node;
                        find = true;
                        paramIndex = 0;
                        break;
                    }
                }
                fullPath += '/' + v;
                if (!find) {
                    if (paramIndex < node.params.length) {
                        node.data[node.params[paramIndex++]] = v;
                    }
                }
            }
            if (node !== this.root) {
                node.fullPath = fullPath;
                retArr.push(node);
            }
            return retArr;
        }
    }
    window.addEventListener('popstate', function (e) {
        const state = history.state;
        if (!state) {
            return;
        }
        Router.startStyle = 2;
        Router.go(state);
    });
});
define("types", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ChangedDom = void 0;
    class ChangedDom {
        constructor(node, type, parent, index) {
            this.node = node;
            this.type = type;
            this.parent = parent;
            this.index = index;
        }
    }
    exports.ChangedDom = ChangedDom;
});
define("resourcemanager", ["require", "exports", "compiler", "nodom", "serializer", "util"], function (require, exports, compiler_1, nodom_3, serializer_1, util_3) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ResourceManager = void 0;
    class ResourceManager {
        static getResources(reqs) {
            return __awaiter(this, void 0, void 0, function* () {
                let me = this;
                this.preHandle(reqs);
                if (reqs.length === 0) {
                    return [];
                }
                let taskId = util_3.Util.genId();
                let resArr = [];
                for (let item of reqs) {
                    resArr.push(item.url);
                }
                this.loadingTasks.set(taskId, resArr);
                return new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
                    for (let item of reqs) {
                        let url = item.url;
                        if (this.resources.has(url)) {
                            let r = me.awake(taskId);
                            if (r) {
                                res(r);
                            }
                        }
                        else if (this.waitList.has(url)) {
                            this.waitList.get(url).push(taskId);
                        }
                        else {
                            this.waitList.set(url, [taskId]);
                            let content = yield nodom_3.Nodom.request({ url: url });
                            let rObj = { type: item.type, content: content };
                            this.handleOne(url, rObj);
                            this.resources.set(url, rObj);
                            let arr = this.waitList.get(url);
                            this.waitList.delete(url);
                            for (let tid of arr) {
                                let r = me.awake(tid);
                                if (r) {
                                    res(r);
                                }
                            }
                        }
                    }
                }));
            });
        }
        static awake(taskId) {
            if (!this.loadingTasks.has(taskId)) {
                return;
            }
            let resArr = this.loadingTasks.get(taskId);
            let finish = true;
            let contents = [];
            for (let url of resArr) {
                if (!this.resources.has(url)) {
                    finish = false;
                    break;
                }
                contents.push(this.resources.get(url));
            }
            if (finish) {
                this.loadingTasks.delete(taskId);
                return contents;
            }
        }
        static getType(url) {
            let ind = -1;
            let type;
            if ((ind = url.lastIndexOf('.')) !== -1) {
                type = url.substr(ind + 1);
                if (type === 'htm' || type === 'html') {
                    type = 'template';
                }
            }
            return type || 'text';
        }
        static handleOne(url, rObj) {
            switch (rObj.type) {
                case 'js':
                    let head = document.querySelector('head');
                    let script = util_3.Util.newEl('script');
                    script.innerHTML = rObj.content;
                    head.appendChild(script);
                    head.removeChild(script);
                    delete rObj.content;
                    break;
                case 'template':
                    rObj.content = compiler_1.Compiler.compile(rObj.content);
                    break;
                case 'nd':
                    rObj.content = serializer_1.Serializer.deserialize(rObj.content);
                    break;
                case 'data':
                    try {
                        rObj.content = JSON.parse(rObj.content);
                    }
                    catch (e) {
                        console.log(e);
                    }
            }
            this.resources.set(url, rObj);
        }
        static preHandle(reqs) {
            let head = document.querySelector('head');
            for (let i = 0; i < reqs.length; i++) {
                if (typeof reqs[i] === 'string') {
                    reqs[i] = {
                        url: reqs[i]
                    };
                }
                reqs[i].type = reqs[i].type || this.getType(reqs[i].url);
                if (reqs[i].type === 'css') {
                    let css = util_3.Util.newEl('link');
                    css.type = 'text/css';
                    css.rel = 'stylesheet';
                    css.href = reqs[i].url;
                    head.appendChild(css);
                    reqs.splice(i--, 1);
                }
            }
            return reqs;
        }
    }
    exports.ResourceManager = ResourceManager;
    ResourceManager.resources = new Map();
    ResourceManager.loadingTasks = new Map();
    ResourceManager.waitList = new Map();
});
define("modulefactory", ["require", "exports", "application", "error", "nodom", "model", "resourcemanager", "util"], function (require, exports, application_2, error_3, nodom_4, model_2, resourcemanager_1, util_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ModuleFactory = void 0;
    class ModuleFactory {
        static add(item) {
            this.modules.set(item.id, item);
        }
        static get(id) {
            return this.modules.get(id);
        }
        static getInstance(className, moduleName, data) {
            return __awaiter(this, void 0, void 0, function* () {
                if (!this.classes.has(className)) {
                    throw new error_3.NError('notexist1', nodom_4.Nodom.tipMessage.TipWords['moduleClass'], className);
                }
                let cfg = this.classes.get(className);
                if (moduleName) {
                    cfg.name = moduleName;
                }
                if (!cfg.instance) {
                    let id = util_4.Util.genId();
                    if (!cfg.initing) {
                        cfg.initing = true;
                        this.initModule(cfg);
                    }
                    return new Promise((res, rej) => {
                        check();
                        function check() {
                            if (!cfg.initing) {
                                res(get(cfg));
                            }
                            else {
                                setTimeout(check, 0);
                            }
                        }
                    });
                }
                else {
                    return get(cfg);
                }
                function get(cfg) {
                    if (cfg.singleton) {
                        return cfg.instance;
                    }
                    else {
                        let mdl = cfg.instance.clone(moduleName);
                        if (data) {
                            if (typeof data === 'string') {
                                mdl.setDataUrl(data);
                            }
                            else {
                                mdl.model = new model_2.Model(data, mdl);
                            }
                        }
                        return mdl;
                    }
                }
            });
        }
        static remove(id) {
            this.modules.delete(id);
        }
        static setMain(m) {
            this.mainModule = m;
            m.setMain();
        }
        static getMain() {
            return this.mainModule;
        }
        static addModules(modules) {
            return __awaiter(this, void 0, void 0, function* () {
                for (let cfg of modules) {
                    if (!cfg.path) {
                        throw new error_3.NError("paramException", 'modules', 'path');
                    }
                    if (!cfg.class) {
                        throw new error_3.NError("paramException", 'modules', 'class');
                    }
                    if (cfg.lazy === undefined) {
                        cfg.lazy = true;
                    }
                    if (cfg.singleton === undefined) {
                        cfg.singleton = true;
                    }
                    if (!cfg.lazy) {
                        yield this.initModule(cfg);
                    }
                    this.classes.set(cfg.class, cfg);
                }
            });
        }
        static initModule(cfg) {
            return __awaiter(this, void 0, void 0, function* () {
                let path = cfg.path;
                if (!path.endsWith('.js')) {
                    path += '.js';
                }
                let url = util_4.Util.mergePath([application_2.Application.getPath('module'), path]);
                yield resourcemanager_1.ResourceManager.getResources([{ url: url, type: 'js' }]);
                let cls = eval(cfg.class);
                if (cls) {
                    let instance = Reflect.construct(cls, [{
                            name: cfg.name,
                            data: cfg.data,
                            lazy: cfg.lazy
                        }]);
                    yield instance.init();
                    cfg.instance = instance;
                    if (cfg.singleton) {
                        this.modules.set(instance.id, instance);
                    }
                    cfg.initing = false;
                }
                else {
                    throw new error_3.NError('notexist1', nodom_4.Nodom.tipMessage.TipWords['moduleClass'], cfg.class);
                }
            });
        }
    }
    exports.ModuleFactory = ModuleFactory;
    ModuleFactory.modules = new Map();
    ModuleFactory.classes = new Map();
});
define("messagequeue", ["require", "exports", "modulefactory"], function (require, exports, modulefactory_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MessageQueue = exports.Message = void 0;
    class Message {
        constructor(fromModule, toModule, content, parentId) {
            this.fromModule = fromModule;
            this.toModule = toModule;
            this.content = content;
            this.parentId = parentId;
        }
    }
    exports.Message = Message;
    class MessageQueue {
        static add(from, to, data, parentId) {
            if (parentId) {
                this.noOwnerNMessages.push(new Message(from, to, data, parentId));
            }
            else {
                this.messages.push(new Message(from, to, data));
            }
        }
        static move(moduleName, moduleId, parentId) {
            let index;
            while ((index = this.noOwnerNMessages.findIndex(item => item.parentId === parentId && moduleName === item.toModule)) !== -1) {
                let msg = this.noOwnerNMessages[index];
                this.noOwnerNMessages.splice(index, 1);
                msg.toModule = moduleId;
                delete msg.parentId;
                this.messages.push(msg);
            }
        }
        static handleQueue() {
            for (let i = 0; i < this.messages.length; i++) {
                let msg = this.messages[i];
                let module = modulefactory_4.ModuleFactory.get(msg.toModule);
                if (module && module.state >= 2) {
                    module.receive(msg.fromModule, msg.content);
                    MessageQueue.messages.splice(i--, 1);
                }
            }
        }
    }
    exports.MessageQueue = MessageQueue;
    MessageQueue.messages = [];
    MessageQueue.noOwnerNMessages = [];
});
define("scheduler", ["require", "exports", "error", "util"], function (require, exports, error_4, util_5) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Scheduler = void 0;
    class Scheduler {
        static dispatch() {
            Scheduler.tasks.forEach((item) => {
                if (util_5.Util.isFunction(item.func)) {
                    if (item.thiser) {
                        item.func.call(item.thiser);
                    }
                    else {
                        item.func();
                    }
                }
            });
        }
        static start(scheduleTick) {
            Scheduler.dispatch();
            if (window.requestAnimationFrame) {
                window.requestAnimationFrame(Scheduler.start);
            }
            else {
                window.setTimeout(Scheduler.start, scheduleTick || 50);
            }
        }
        static addTask(foo, thiser) {
            if (!util_5.Util.isFunction(foo)) {
                throw new error_4.NError("invoke", "Scheduler.addTask", "0", "function");
            }
            Scheduler.tasks.push({ func: foo, thiser: thiser });
        }
        static removeTask(foo) {
            if (!util_5.Util.isFunction(foo)) {
                throw new error_4.NError("invoke", "Scheduler.removeTask", "0", "function");
            }
            let ind = -1;
            if ((ind = Scheduler.tasks.indexOf(foo)) !== -1) {
                Scheduler.tasks.splice(ind, 1);
            }
        }
    }
    exports.Scheduler = Scheduler;
    Scheduler.tasks = [];
});
define("nodom", ["require", "exports", "application", "directivemanager", "error", "messagequeue", "module", "modulefactory", "renderer", "router", "scheduler", "util"], function (require, exports, application_3, directivemanager_1, error_5, messagequeue_1, module_1, modulefactory_5, renderer_2, router_1, scheduler_1, util_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Nodom = void 0;
    class Nodom {
        static newApp(config) {
            return __awaiter(this, void 0, void 0, function* () {
                if (window['NodomConfig']) {
                    config = util_6.Util.merge({}, window['NodomConfig'], config);
                }
                let lang = config && config.language;
                if (!lang) {
                    lang = navigator.language ? navigator.language.substr(0, 2) : 'zh';
                }
                this.tipMessage = eval('(nodom.TipMessagee_' + lang + ')');
                if (!config || !config.module) {
                    throw new error_5.NError('config', Nodom.tipMessage.TipWords['application']);
                }
                application_3.Application.setPath(config.path);
                if (config.modules) {
                    yield modulefactory_5.ModuleFactory.addModules(config.modules);
                }
                scheduler_1.Scheduler.addTask(messagequeue_1.MessageQueue.handleQueue, messagequeue_1.MessageQueue);
                scheduler_1.Scheduler.addTask(renderer_2.Renderer.render, renderer_2.Renderer);
                scheduler_1.Scheduler.start(config.scheduleCircle);
                let module;
                if (config.module.class) {
                    module = yield modulefactory_5.ModuleFactory.getInstance(config.module.class, config.module.name, config.module.data);
                    module.setSelector(config.module.el);
                }
                else {
                    module = new module_1.Module(config.module);
                }
                modulefactory_5.ModuleFactory.setMain(module);
                yield module.active();
                if (config.routes) {
                    this.createRoute(config.routes);
                }
                return module;
            });
        }
        static createRoute(config) {
            if (util_6.Util.isArray(config)) {
                for (let item of config) {
                    new router_1.Route(item);
                }
            }
            else {
                return new router_1.Route(config);
            }
        }
        static createDirective(name, priority, init, handler) {
            return directivemanager_1.DirectiveManager.addType(name, priority, init, handler);
        }
        static addModules(modules) {
            modulefactory_5.ModuleFactory.addModules(modules);
        }
        static request(config) {
            return new Promise((resolve, reject) => {
                if (typeof config === 'string') {
                    config = {
                        url: config
                    };
                }
                config.params = config.params || {};
                if (config.rand) {
                    config.params.$rand = Math.random();
                }
                let url = config.url;
                const async = config.async === false ? false : true;
                const req = new XMLHttpRequest();
                req.withCredentials = config.withCredentials;
                const method = (config.method || 'GET').toUpperCase();
                req.timeout = async ? config.timeout : 0;
                req.onload = () => {
                    if (req.status === 200) {
                        let r = req.responseText;
                        if (config.type === 'json') {
                            try {
                                r = JSON.parse(r);
                            }
                            catch (e) {
                                reject({ type: "jsonparse" });
                            }
                        }
                        resolve(r);
                    }
                    else {
                        reject({ type: 'error', url: url });
                    }
                };
                req.ontimeout = () => reject({ type: 'timeout' });
                req.onerror = () => reject({ type: 'error', url: url });
                let data = null;
                switch (method) {
                    case 'GET':
                        let pa;
                        if (util_6.Util.isObject(config.params)) {
                            let ar = [];
                            util_6.Util.getOwnProps(config.params).forEach(function (key) {
                                ar.push(key + '=' + config.params[key]);
                            });
                            pa = ar.join('&');
                        }
                        if (pa !== undefined) {
                            if (url.indexOf('?') !== -1) {
                                url += '&' + pa;
                            }
                            else {
                                url += '?' + pa;
                            }
                        }
                        break;
                    case 'POST':
                        if (config.params instanceof FormData) {
                            data = config.params;
                        }
                        else {
                            let fd = new FormData();
                            for (let o in config.params) {
                                fd.append(o, config.params[o]);
                            }
                            data = fd;
                        }
                        break;
                }
                req.open(method, url, async, config.user, config.pwd);
                if (config.header) {
                    util_6.Util.getOwnProps(config.header).forEach((item) => {
                        req.setRequestHeader(item, config.header[item]);
                    });
                }
                req.send(data);
            }).catch((re) => {
                switch (re.type) {
                    case "error":
                        throw new error_5.NError("notexist1", Nodom.tipMessage.TipWords['resource'], re.url);
                    case "timeout":
                        throw new error_5.NError("timeout");
                    case "jsonparse":
                        throw new error_5.NError("jsonparse");
                }
            });
        }
    }
    exports.Nodom = Nodom;
    var nodom = Nodom;
    var $ = nodom;
});
define("error", ["require", "exports", "nodom", "util"], function (require, exports, nodom_5, util_7) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NError = void 0;
    class NError extends Error {
        constructor(errorName, p1, p2, p3, p4) {
            super(errorName);
            let msg = nodom_5.Nodom.tipMessage.ErrorMsgs[errorName];
            if (msg === undefined) {
                this.message = "未知错误";
                return;
            }
            let params = [msg];
            for (let i = 1; i < arguments.length; i++) {
                params.push(arguments[i]);
            }
            this.message = util_7.Util.compileStr.apply(null, params);
        }
    }
    exports.NError = NError;
});
define("filtermanager", ["require", "exports", "error", "util", "nodom"], function (require, exports, error_6, util_8, nodom_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FilterManager = void 0;
    class FilterManager {
        static addType(name, handler) {
            if (!/^[a-zA-Z]+$/.test(name)) {
                throw new error_6.NError('namedinvalid', nodom_6.Nodom.tipMessage.TipWords['filterType'], name);
            }
            if (this.filterTypes.has(name)) {
                throw new error_6.NError('exist1', nodom_6.Nodom.tipMessage.TipWords['filterType'], name);
            }
            if (!util_8.Util.isFunction(handler)) {
                throw new error_6.NError('invoke', 'FilterManager.addType', '1', 'Function');
            }
            this.filterTypes.set(name, handler);
        }
        static removeType(name) {
            if (!this.filterTypes.has(name)) {
                throw new error_6.NError('notexist1', nodom_6.Nodom.tipMessage.TipWords['filterType'], name);
            }
            this.filterTypes.delete(name);
        }
        static hasType(name) {
            return this.filterTypes.has(name);
        }
        static exec(module, type) {
            let params = new Array();
            for (let i = 2; i < arguments.length; i++) {
                params.push(arguments[i]);
            }
            if (!FilterManager.filterTypes.has(type)) {
                throw new error_6.NError('notexist1', nodom_6.Nodom.tipMessage.TipWords['filterType'], type);
            }
            return util_8.Util.apply(FilterManager.filterTypes.get(type), module, params);
        }
        static explain(src) {
            let startStr;
            let startObj = false;
            let strings = "\"'`";
            let splitCh = ':';
            let retArr = new Array();
            let tmp = '';
            for (let i = 0; i < src.length; i++) {
                let ch = src[i];
                if (strings.indexOf(ch) !== -1) {
                    if (ch === startStr) {
                        startStr = undefined;
                    }
                    else {
                        startStr = ch;
                    }
                }
                else if (startStr === undefined) {
                    if (ch === '}' && startObj) {
                        startObj = false;
                    }
                    else if (ch === '{') {
                        startObj = true;
                    }
                }
                if (ch === splitCh && startStr === undefined && !startObj && tmp !== '') {
                    retArr.push(handleObj(tmp));
                    tmp = '';
                    continue;
                }
                tmp += ch;
            }
            if (tmp !== '') {
                retArr.push(handleObj(tmp));
            }
            return retArr;
            function handleObj(s) {
                s = s.trim();
                if (s.charAt(0) === '{') {
                    s = eval('(' + s + ')');
                }
                return s;
            }
        }
    }
    exports.FilterManager = FilterManager;
    FilterManager.filterTypes = new Map();
});
define("expression", ["require", "exports", "filtermanager", "modulefactory", "util"], function (require, exports, filtermanager_1, modulefactory_6, util_9) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Expression = void 0;
    class Expression {
        constructor(exprStr) {
            this.replaceMap = new Map();
            this.fields = [];
            this.id = util_9.Util.genId();
            let execStr;
            if (exprStr) {
                execStr = this.compile(exprStr);
            }
            if (execStr) {
                let v = this.fields.length > 0 ? ',' + this.fields.join(',') : '';
                execStr = 'function($module' + v + '){return ' + execStr + '}';
                this.execFunc = eval('(' + execStr + ')');
            }
        }
        clone() {
            return this;
        }
        compile(exprStr) {
            let stringReg = [/\".*?\"/, /'.*?'/, /`.*?`/];
            let quotReg = [/\\"/g, /\\'/g, /\\`/g];
            let quotStr = ['$$$$NODOM_QUOT1', '$$$$NODOM_QUOT2', '$$$$NODOM_QUOT3'];
            let srcStr = exprStr;
            let replaceIndex = 0;
            for (let i = 0; i < 3; i++) {
                srcStr = srcStr.replace(quotReg[i], quotStr[i]);
            }
            for (;;) {
                let r;
                for (let reg of stringReg) {
                    let r1 = reg.exec(srcStr);
                    if (!r1) {
                        continue;
                    }
                    if (!r || r.index > r1.index) {
                        r = r1;
                    }
                }
                if (!r) {
                    break;
                }
                let sTmp = Expression.REP_STR + replaceIndex++;
                this.replaceMap.set(sTmp, r[0]);
                srcStr = srcStr.substr(0, r.index) + sTmp + srcStr.substr(r.index + r[0].length);
            }
            srcStr = srcStr.replace(/\s+/g, '');
            let arrOperator = srcStr.split(/[\(\)\!\|\*\/\+\-><=&%]/);
            let arrOperand = [];
            let index = 0;
            for (let sp of arrOperator) {
                index += sp.length;
                let ch = srcStr.charAt(index++);
                if (ch !== '') {
                    arrOperand.push(ch);
                }
            }
            return this.genExecStr(arrOperator, arrOperand);
        }
        genExecStr(arrOperator, arrOperand) {
            let retStr = '';
            for (; arrOperator.length > 1;) {
                let opr = arrOperator.pop();
                let opd = arrOperand.pop();
                let r;
                let handled = false;
                if (opd === '(') {
                    r = this.judgeAndHandleFunc(arrOperator);
                    if (r !== undefined) {
                        if (r.startsWith('$module')) {
                            opd = '';
                        }
                        if (opr !== '' && !this.addField(opr)) {
                            opr = this.recoveryString(opr);
                        }
                        retStr = r + opd + opr + retStr;
                        if (arrOperand.length > 0) {
                            retStr = arrOperand.pop() + retStr;
                        }
                        handled = true;
                    }
                }
                else if (opd === '|') {
                    r = this.judgeAndHandleFilter(arrOperator, arrOperand, opr);
                    if (r !== undefined) {
                        retStr = (arrOperand.length > 0 ? arrOperand.pop() : '') + r + retStr;
                        handled = true;
                    }
                }
                if (!handled) {
                    if (!this.addField(opr)) {
                        opr = this.recoveryString(opr);
                    }
                    retStr = opd + opr + retStr;
                }
            }
            if (arrOperator.length > 0) {
                let opr = arrOperator.pop();
                if (opr !== '') {
                    if (!this.addField(opr)) {
                        opr = this.recoveryString(opr);
                    }
                    retStr = opr + retStr;
                }
            }
            return retStr;
        }
        recoveryString(str) {
            if (str.startsWith(Expression.REP_STR)) {
                if (this.replaceMap.has(str)) {
                    str = this.replaceMap.get(str);
                    str = str.replace(/\$\$NODOM_QUOT1/g, '\\"');
                    str = str.replace(/\$\$NODOM_QUOT2/g, "\\'");
                    str = str.replace(/\$\$NODOM_QUOT3/g, '\\`');
                }
            }
            return str;
        }
        judgeAndHandleFunc(arrOperator) {
            let sp = arrOperator[arrOperator.length - 1];
            if (sp && sp !== '') {
                arrOperator.pop();
                if (sp.startsWith('$')) {
                    return '$module.methodNFactory.get("' + sp.substr(1) + '").call($module,';
                }
                else {
                    return sp;
                }
            }
        }
        judgeAndHandleFilter(arrOperator, arrOperand, srcOp) {
            if (srcOp.startsWith(Expression.REP_STR) || util_9.Util.isNumberString(srcOp)) {
                return;
            }
            let sa = filtermanager_1.FilterManager.explain(srcOp);
            if (sa.length > 1 || filtermanager_1.FilterManager.hasType(sa[0])) {
                let ftype = sa[0];
                sa.shift();
                sa.forEach((v, i) => {
                    v = this.recoveryString(v);
                    if (!util_9.Util.isNumberString(v)) {
                        sa[i] = '"' + v.replace(/"/g, '\\"') + '"';
                    }
                });
                let paramStr = sa.length > 0 ? ',' + sa.join(',') : '';
                let filterValue = '';
                let opr = arrOperator[arrOperator.length - 1];
                if (opr !== '') {
                    if (!this.addField(opr)) {
                        opr = this.recoveryString(opr);
                    }
                    filterValue = opr;
                    arrOperator.pop();
                }
                else if (arrOperand.length > 2 && arrOperand[arrOperand.length - 1] === ')') {
                    let quotNum = 1;
                    let a1 = [arrOperator.pop()];
                    let a2 = [arrOperand.pop()];
                    for (let i = arrOperand.length - 1; i >= 0; i--) {
                        if (arrOperand[i] === '(') {
                            quotNum--;
                        }
                        else if (arrOperand[i] === ')') {
                            quotNum++;
                        }
                        a1.unshift(arrOperator.pop());
                        a2.unshift(arrOperand.pop());
                        if (quotNum === 0) {
                            a1.unshift(arrOperator.pop());
                            break;
                        }
                    }
                    filterValue = this.genExecStr(a1, a2);
                }
                return 'nodom.FilterManager.exec($module,"' + ftype + '",' + filterValue + paramStr + ')';
            }
        }
        val(model) {
            let module = modulefactory_6.ModuleFactory.get(model.$moduleId);
            if (!model) {
                model = module.model;
            }
            let valueArr = [];
            this.fields.forEach((field) => {
                valueArr.push(getFieldValue(module, model, field));
            });
            valueArr.unshift(module);
            let v;
            try {
                v = this.execFunc.apply(null, valueArr);
            }
            catch (e) {
            }
            return v === undefined || v === null ? '' : v;
            function getFieldValue(module, dataObj, field) {
                if (dataObj.hasOwnProperty(field)) {
                    return dataObj[field];
                }
                return module.model.$query(field);
            }
        }
        addField(field) {
            const jsKeyWords = ['true', 'false', 'undefined', 'null', 'typeof',
                'Object', 'Function', 'Array', 'Number', 'Date',
                'instanceof', 'NaN'];
            if (field === '' || jsKeyWords.includes(field) || field.startsWith(Expression.REP_STR) || util_9.Util.isNumberString(field)) {
                return false;
            }
            let ind;
            if ((ind = field.indexOf('.')) !== -1) {
                field = field.substr(0, ind);
            }
            if (!this.fields.includes(field)) {
                this.fields.push(field);
            }
            return true;
        }
    }
    exports.Expression = Expression;
    Expression.REP_STR = '$$NODOM_TMPSTR';
});
define("event", ["require", "exports", "modulefactory", "util"], function (require, exports, modulefactory_7, util_10) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ExternalNEvent = exports.NEvent = void 0;
    class NEvent {
        constructor(eventName, eventStr, handler) {
            this.id = util_10.Util.genId();
            this.name = eventName;
            if (eventStr) {
                let tp = typeof eventStr;
                if (tp === 'string') {
                    let eStr = eventStr.trim();
                    eStr.split(':').forEach((item, i) => {
                        item = item.trim();
                        if (i === 0) {
                            this.handler = item;
                        }
                        else {
                            switch (item) {
                                case 'delg':
                                    this.delg = true;
                                    break;
                                case 'nopopo':
                                    this.nopopo = true;
                                    break;
                                case 'once':
                                    this.once = true;
                                    break;
                                case 'capture':
                                    this.capture = true;
                                    break;
                            }
                        }
                    });
                }
                else if (tp === 'function') {
                    handler = eventStr;
                }
            }
            if (handler) {
                this.handler = handler;
            }
            let dtype = 'ontouchend' in document ? 1 : 2;
            if (dtype === 1) {
                switch (this.name) {
                    case 'click':
                        this.name = 'tap';
                        break;
                    case 'mousedown':
                        this.name = 'touchstart';
                        break;
                    case 'mouseup':
                        this.name = 'touchend';
                        break;
                    case 'mousemove':
                        this.name = 'touchmove';
                        break;
                }
            }
            else {
                switch (this.name) {
                    case 'tap':
                        this.name = 'click';
                        break;
                    case 'touchstart':
                        this.name = 'mousedown';
                        break;
                    case 'touchend':
                        this.name = 'mouseup';
                        break;
                    case 'touchmove':
                        this.name = 'mousemove';
                        break;
                }
            }
        }
        fire(e, el) {
            const module = modulefactory_7.ModuleFactory.get(this.moduleId);
            if (!module.getContainer()) {
                return;
            }
            let dom = module.getElement(this.domKey);
            const model = dom.model;
            if (this.capture) {
                handleSelf(this, e, model, module, dom, el);
                handleDelg(this, e, dom);
            }
            else {
                if (handleDelg(this, e, dom)) {
                    handleSelf(this, e, model, module, dom, el);
                }
            }
            if (this.events !== undefined &&
                this.events.has(this.name) &&
                this.events.get(this.name).length === 0 &&
                this.handler === undefined) {
                if (!el) {
                    el = module.getNode(this.domKey);
                }
                if (ExternalNEvent.touches[this.name]) {
                    ExternalNEvent.unregist(this, el);
                }
                else {
                    if (el !== null) {
                        el.removeEventListener(this.name, this.handleListener);
                    }
                }
            }
            function handleDelg(eObj, e, dom) {
                if (eObj.events === undefined) {
                    return true;
                }
                let eKey = e.target.getAttribute('key');
                let arr = eObj.events.get(eObj.name);
                if (util_10.Util.isArray(arr)) {
                    if (arr.length > 0) {
                        for (let i = 0; i < arr.length; i++) {
                            let sdom = dom.query(arr[i].domKey);
                            if (!sdom) {
                                continue;
                            }
                            if (eKey === sdom.key || sdom.query(eKey)) {
                                arr[i].fire(e);
                                if (arr[i].once) {
                                    eObj.removeChild(arr[i]);
                                }
                                if (arr[i].nopopo) {
                                    return false;
                                }
                            }
                        }
                    }
                    else {
                        eObj.events.delete(eObj.name);
                    }
                }
                return true;
            }
            function handleSelf(eObj, e, model, module, dom, el) {
                if (typeof eObj.handler === 'string') {
                    eObj.handler = module.getMethod(eObj.handler);
                }
                if (!eObj.handler) {
                    return;
                }
                if (eObj.nopopo) {
                    e.stopPropagation();
                }
                util_10.Util.apply(eObj.handler, eObj, [dom, model, module, e, el]);
                if (eObj.once) {
                    delete eObj.handler;
                }
            }
        }
        bind(module, dom, el, parent, parentEl) {
            this.moduleId = module.id;
            this.domKey = dom.key;
            if (this.delg && parent) {
                this.delegateTo(module, dom, el, parent, parentEl);
            }
            else {
                this.bindTo(el);
            }
        }
        bindTo(el) {
            if (ExternalNEvent.touches[this.name]) {
                ExternalNEvent.regist(this, el);
            }
            else {
                this.handleListener = (e) => {
                    this.fire(e, el);
                };
                el.addEventListener(this.name, this.handleListener, this.capture);
            }
        }
        delegateTo(module, vdom, el, parent, parentEl) {
            this.domKey = vdom.key;
            this.moduleId = module.id;
            if (!parentEl) {
                parentEl = document.body;
            }
            if (!parent.events.has(this.name)) {
                let ev = new NEvent(this.name);
                ev.bindTo(parentEl);
                parent.events.set(this.name, ev);
            }
            let evt = parent.events.get(this.name);
            let ev;
            if (util_10.Util.isArray(evt) && evt.length > 0) {
                ev = evt[0];
            }
            else {
                ev = evt;
            }
            if (ev) {
                ev.addChild(this);
            }
        }
        addChild(ev) {
            if (!this.events) {
                this.events = new Map();
            }
            if (!this.events.has(this.name)) {
                this.events.set(this.name, new Array());
            }
            this.events.get(this.name).push(ev);
        }
        removeChild(ev) {
            if (this.events === undefined || this.events[ev.name] === undefined) {
                return;
            }
            let ind = this.events[ev.name].indexOf(ev);
            if (ind !== -1) {
                this.events[ev.name].splice(ind, 1);
                if (this.events[ev.name].length === 0) {
                    this.events.delete(ev.name);
                }
            }
        }
        clone() {
            let evt = new NEvent(this.name);
            let arr = ['delg', 'once', 'nopopo', 'capture', 'handler'];
            arr.forEach((item) => {
                evt[item] = this[item];
            });
            return evt;
        }
        getDomKey() {
            return this.domKey;
        }
        setExtraParam(key, value) {
            if (!this.extraParamMap) {
                this.extraParamMap = new Map();
            }
            this.extraParamMap.set(key, value);
        }
        getExtraParam(key) {
            return this.extraParamMap.get(key);
        }
    }
    exports.NEvent = NEvent;
    class ExternalNEvent {
        static regist(evtObj, el) {
            let touchEvts = ExternalNEvent.touches[evtObj.name];
            if (!util_10.Util.isEmpty(evtObj.touchListeners)) {
                this.unregist(evtObj);
            }
            if (!el) {
                const module = modulefactory_7.ModuleFactory.get(evtObj.moduleId);
                el = module.getNode(evtObj.getDomKey());
            }
            evtObj.touchListeners = new Map();
            if (touchEvts && el !== null) {
                util_10.Util.getOwnProps(touchEvts).forEach(function (ev) {
                    evtObj.touchListeners[ev] = function (e) {
                        touchEvts[ev](e, evtObj);
                    };
                    el.addEventListener(ev, evtObj.touchListeners[ev], evtObj.capture);
                });
            }
        }
        static unregist(evtObj, el) {
            const evt = ExternalNEvent.touches[evtObj.name];
            if (!el) {
                const module = modulefactory_7.ModuleFactory.get(evtObj.moduleId);
                el = module.getNode(evtObj.getDomKey());
            }
            if (evt) {
                if (el !== null) {
                    util_10.Util.getOwnProps(evtObj.touchListeners).forEach(function (ev) {
                        el.removeEventListener(ev, evtObj.touchListeners[ev]);
                    });
                }
            }
        }
    }
    exports.ExternalNEvent = ExternalNEvent;
    ExternalNEvent.touches = {};
    ExternalNEvent.touches = {
        tap: {
            touchstart: function (e, evtObj) {
                let tch = e.touches[0];
                evtObj.setExtraParam('pos', { sx: tch.pageX, sy: tch.pageY, t: Date.now() });
            },
            touchmove: function (e, evtObj) {
                let pos = evtObj.getExtraParam('pos');
                let tch = e.touches[0];
                let dx = tch.pageX - pos.sx;
                let dy = tch.pageY - pos.sy;
                if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                    pos.move = true;
                }
            },
            touchend: function (e, evtObj) {
                let pos = evtObj.getExtraParam('pos');
                let dt = Date.now() - pos.t;
                if (pos.move === true || dt > 200) {
                    return;
                }
                evtObj.fire(e);
            }
        },
        swipe: {
            touchstart: function (e, evtObj) {
                let tch = e.touches[0];
                let t = Date.now();
                evtObj.setExtraParam('swipe', {
                    oldTime: [t, t],
                    speedLoc: [{ x: tch.pageX, y: tch.pageY }, { x: tch.pageX, y: tch.pageY }],
                    oldLoc: { x: tch.pageX, y: tch.pageY }
                });
            },
            touchmove: function (e, evtObj) {
                let nt = Date.now();
                let tch = e.touches[0];
                let mv = evtObj.getExtraParam('swipe');
                if (nt - mv.oldTime > 50) {
                    mv.speedLoc[0] = { x: mv.speedLoc[1].x, y: mv.speedLoc[1].y };
                    mv.speedLoc[1] = { x: tch.pageX, y: tch.pageY };
                    mv.oldTime[0] = mv.oldTime[1];
                    mv.oldTime[1] = nt;
                }
                mv.oldLoc = { x: tch.pageX, y: tch.pageY };
            },
            touchend: function (e, evtObj) {
                let mv = evtObj.getExtraParam('swipe');
                let nt = Date.now();
                let ind = (nt - mv.oldTime[1] < 30) ? 0 : 1;
                let dx = mv.oldLoc.x - mv.speedLoc[ind].x;
                let dy = mv.oldLoc.y - mv.speedLoc[ind].y;
                let s = Math.sqrt(dx * dx + dy * dy);
                let dt = nt - mv.oldTime[ind];
                if (dt > 300 || s < 10) {
                    return;
                }
                let v0 = s / dt;
                if (v0 > 0.05) {
                    let sname = '';
                    if (dx < 0 && Math.abs(dy / dx) < 1) {
                        e.v0 = v0;
                        sname = 'swipeleft';
                    }
                    if (dx > 0 && Math.abs(dy / dx) < 1) {
                        e.v0 = v0;
                        sname = 'swiperight';
                    }
                    if (dy > 0 && Math.abs(dx / dy) < 1) {
                        e.v0 = v0;
                        sname = 'swipedown';
                    }
                    if (dy < 0 && Math.abs(dx / dy) < 1) {
                        e.v0 = v0;
                        sname = 'swipeup';
                    }
                    if (evtObj.name === sname) {
                        evtObj.fire(e);
                    }
                }
            }
        }
    };
    ExternalNEvent.touches['swipeleft'] = ExternalNEvent.touches['swipe'];
    ExternalNEvent.touches['swiperight'] = ExternalNEvent.touches['swipe'];
    ExternalNEvent.touches['swipeup'] = ExternalNEvent.touches['swipe'];
    ExternalNEvent.touches['swipedown'] = ExternalNEvent.touches['swipe'];
});
define("plugin", ["require", "exports", "modulefactory", "util"], function (require, exports, modulefactory_8, util_11) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Plugin = void 0;
    class Plugin {
        constructor(params) {
        }
        beforeRender(module, uidom) {
            this.element = uidom;
            this.moduleId = module.id;
            if (!this.model || uidom.key !== this.key) {
                this.key = uidom.key;
                this.model = uidom.model;
                if (uidom.hasProp('name')) {
                    module.addNPlugin(uidom.getProp('name'), this);
                }
                this.needPreRender = true;
            }
            else {
                this.needPreRender = false;
            }
        }
        afterRender(module, uidom) { }
        clone(dst) {
            let plugin = Reflect.construct(this.constructor, []);
            let excludeProps = ['key', 'element', 'modelId', 'moduleId'];
            util_11.Util.getOwnProps(this).forEach((prop) => {
                if (excludeProps.includes(prop)) {
                    return;
                }
                plugin[prop] = util_11.Util.clone(this[prop]);
            });
            if (dst) {
                plugin.element = dst;
            }
            return plugin;
        }
        getModel() {
            let module = modulefactory_8.ModuleFactory.get(this.moduleId);
            if (!module) {
                return null;
            }
            return this.model || null;
        }
    }
    exports.Plugin = Plugin;
});
define("element", ["require", "exports", "expression", "modulefactory", "error", "util", "types"], function (require, exports, expression_1, modulefactory_9, error_7, util_12, types_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Element = void 0;
    class Element {
        constructor(tag) {
            this.directives = [];
            this.assets = new Map();
            this.props = {};
            this.exprProps = {};
            this.events = new Map();
            this.expressions = [];
            this.children = [];
            this.dontRender = false;
            this.dontRenderSelf = false;
            this.tagName = tag;
            if (tag && tag.toLowerCase() === 'svg') {
                this.isSvgNode = true;
            }
            this.key = util_12.Util.genId() + '';
        }
        render(module, parent) {
            if (this.dontRender) {
                this.doDontRender();
                this.recover();
                return;
            }
            if (parent) {
                if (!this.model) {
                    this.model = parent.model;
                }
                this.parent = parent;
                this.parentKey = parent.key;
            }
            if (this.plugin) {
                this.plugin.beforeRender(module, this);
            }
            if (this.tagName !== undefined) {
                this.handleDirectives(module);
                this.handleProps(module);
            }
            else {
                this.handleTextContent(module);
            }
            if (this.dontRender) {
                this.doDontRender();
                this.recover();
                return;
            }
            if (!this.hasDirective('module')) {
                for (let i = 0; i < this.children.length; i++) {
                    let item = this.children[i];
                    item.render(module, this);
                    if (item.dontRender) {
                        item.doDontRender();
                        this.children.splice(i--, 1);
                    }
                }
            }
            if (this.plugin) {
                this.plugin.afterRender(module, this);
            }
        }
        recover() {
            delete this.parent;
            delete this.model;
            delete this.dontRender;
        }
        renderToHtml(module, params) {
            let el;
            let el1;
            let type = params.type;
            let parent = params.parent;
            this.dontRender = false;
            if (type === 'fresh' || type === 'add' || type === 'text') {
                if (parent) {
                    el = module.getNode(parent.key);
                }
                else {
                    el = module.getContainer();
                }
            }
            else if (this.tagName !== undefined) {
                el = module.getNode(this.key);
                this.handleAssets(el);
            }
            if (!el) {
                return;
            }
            switch (type) {
                case 'fresh':
                    if (this.tagName) {
                        el1 = newEl(this, null, el);
                        genSub(el1, this);
                    }
                    else {
                        el1 = newText(this.textContent, this);
                    }
                    el.appendChild(el1);
                    break;
                case 'text':
                    if (!parent || !parent.children) {
                        break;
                    }
                    let ind = parent.children.indexOf(this);
                    if (ind !== -1) {
                        if (this.type === 'html') {
                            let div = document.querySelector("[key='" + this.key + "']");
                            if (div !== null) {
                                div.innerHTML = '';
                                div.appendChild(this.textContent);
                            }
                            else {
                                let div = newText(this.textContent);
                                util_12.Util.replaceNode(el.childNodes[ind], div);
                            }
                        }
                        else {
                            el.childNodes[ind].textContent = this.textContent;
                        }
                    }
                    break;
                case 'upd':
                    if (params.removeProps) {
                        params.removeProps.forEach((p) => {
                            el.removeAttribute(p);
                        });
                    }
                    if (params.changeProps) {
                        params.changeProps.forEach((p) => {
                            el.setAttribute(p['k'], p['v']);
                        });
                    }
                    if (params.changeAssets) {
                        params.changeAssets.forEach((p) => {
                            el[p['k']] = p['v'];
                        });
                    }
                    break;
                case 'rep':
                    el1 = newEl(this, parent);
                    util_12.Util.replaceNode(el, el1);
                    break;
                case 'add':
                    if (this.tagName) {
                        el1 = newEl(this, parent, el);
                        genSub(el1, this);
                    }
                    else {
                        el1 = newText(this.textContent);
                    }
                    if (params.index === el.childNodes.length) {
                        el.appendChild(el1);
                    }
                    else {
                        el.insertBefore(el1, el.childNodes[params.index]);
                    }
            }
            function newEl(vdom, parent, parentEl) {
                let el;
                if (vdom.isSvgNode) {
                    el = util_12.Util.newSvgEl(vdom.tagName);
                }
                else {
                    el = util_12.Util.newEl(vdom.tagName);
                }
                util_12.Util.getOwnProps(vdom.props).forEach((k) => {
                    el.setAttribute(k, vdom.props[k]);
                });
                el.setAttribute('key', vdom.key);
                vdom.handleNEvents(module, el, parent, parentEl);
                vdom.handleAssets(el);
                return el;
            }
            function newText(text, dom) {
                if (!text) {
                    text = '';
                    dom = null;
                }
                if (dom && 'html' === dom.type) {
                    let div = util_12.Util.newEl('div');
                    div.setAttribute('key', dom.key);
                    div.appendChild(text);
                    return div;
                }
                else {
                    return document.createTextNode(text);
                }
            }
            function genSub(pEl, vNode) {
                if (vNode.children && vNode.children.length > 0) {
                    vNode.children.forEach((item) => {
                        let el1;
                        if (item.tagName) {
                            el1 = newEl(item, vNode, pEl);
                            genSub(el1, item);
                        }
                        else {
                            el1 = newText(item.textContent, item);
                        }
                        pEl.appendChild(el1);
                    });
                }
            }
        }
        clone(changeKey) {
            let dst = new Element();
            let notCopyProps = ['parent', 'directives', 'children'];
            util_12.Util.getOwnProps(this).forEach((p) => {
                if (notCopyProps.includes(p)) {
                    return;
                }
                if (typeof this[p] === 'object') {
                    dst[p] = util_12.Util.clone(this[p]);
                }
                else {
                    dst[p] = this[p];
                }
            });
            if (changeKey) {
                dst.key = util_12.Util.genId() + '';
            }
            if (this.plugin) {
                if (changeKey) {
                    dst.plugin = this.plugin.clone(dst);
                }
                else {
                    dst.plugin = this.plugin;
                }
            }
            for (let d of this.directives) {
                if (changeKey) {
                    d = d.clone(dst);
                }
                dst.directives.push(d);
            }
            for (let c of this.children) {
                dst.add(c.clone(changeKey));
            }
            return dst;
        }
        handleDirectives(module) {
            if (this.dontRender) {
                return;
            }
            for (let d of this.directives.values()) {
                if (this.dontRender) {
                    return;
                }
                d.exec(module, this, this.parent);
            }
        }
        handleExpression(exprArr, module) {
            if (this.dontRender) {
                return;
            }
            let model = this.model;
            let value = '';
            exprArr.forEach((v) => {
                if (v instanceof expression_1.Expression) {
                    let v1 = v.val(model);
                    value += v1 !== undefined ? v1 : '';
                }
                else {
                    value += v;
                }
            });
            return value;
        }
        handleProps(module) {
            if (this.dontRender) {
                return;
            }
            for (let k of util_12.Util.getOwnProps(this.exprProps)) {
                if (this.dontRender) {
                    return;
                }
                if (util_12.Util.isArray(this.exprProps[k])) {
                    let pv = this.handleExpression(this.exprProps[k], module);
                    if (k === 'class') {
                        this.addClass(pv);
                    }
                    else {
                        this.props[k] = pv;
                    }
                }
                else if (this.exprProps[k] instanceof expression_1.Expression) {
                    this.props[k] = this.exprProps[k].val(this.model);
                }
            }
        }
        handleAssets(el) {
            if (!this.tagName || !el) {
                return;
            }
            for (let key of this.assets) {
                el[key[0]] = key[1];
            }
        }
        handleTextContent(module) {
            if (this.dontRender) {
                return;
            }
            if (this.expressions !== undefined && this.expressions.length > 0) {
                let v = this.handleExpression(this.expressions, module) || '';
                this.textContent = this.handleExpression(this.expressions, module);
            }
        }
        handleNEvents(module, el, parent, parentEl) {
            if (this.events.size === 0) {
                return;
            }
            for (let evt of this.events.values()) {
                if (util_12.Util.isArray(evt)) {
                    for (let evo of evt) {
                        evo.bind(module, this, el, parent, parentEl);
                    }
                }
                else {
                    evt.bind(module, this, el, parent, parentEl);
                }
            }
        }
        removeDirectives(directives) {
            for (let i = 0; i < this.directives.length; i++) {
                if (directives.length === 0) {
                    break;
                }
                for (let j = 0; j < directives.length; j++) {
                    if (directives[j].includes(this.directives[i].type.name)) {
                        this.directives.splice(i--, 1);
                        directives.splice(j--, 1);
                        break;
                    }
                }
            }
        }
        addDirective(directive, sort) {
            let finded = false;
            for (let i = 0; i < this.directives.length; i++) {
                if (this.directives[i].type === directive.type) {
                    this.directives[i] = directive;
                    finded = true;
                    break;
                }
            }
            if (!finded) {
                this.directives.push(directive);
            }
            if (sort) {
                if (this.directives.length > 1) {
                    this.directives.sort((a, b) => {
                        return a.type.prio - b.type.prio;
                    });
                }
            }
        }
        hasDirective(directiveType) {
            return this.directives.findIndex(item => item.type.name === directiveType) !== -1;
        }
        getDirective(directiveType) {
            return this.directives.find(item => item.type.name === directiveType);
        }
        add(dom) {
            dom.parentKey = this.key;
            this.children.push(dom);
        }
        remove(module, delHtml) {
            let parent = this.getParent(module);
            if (parent) {
                parent.removeChild(this);
            }
            if (delHtml && module) {
                let el = module.getNode(this.key);
                if (el !== null) {
                    util_12.Util.remove(el);
                }
            }
        }
        removeFromHtml(module) {
            let el = module.getNode(this.key);
            if (el !== null) {
                util_12.Util.remove(el);
            }
        }
        removeChild(dom) {
            let ind;
            if (util_12.Util.isArray(this.children) && (ind = this.children.indexOf(dom)) !== -1) {
                this.children.splice(ind, 1);
            }
        }
        getParent(module) {
            if (!module) {
                throw new error_7.NError('invoke', 'Element.getParent', '0', 'Module');
            }
            if (this.parent) {
                return this.parent;
            }
            if (this.parentKey) {
                return module.getElement(this.parentKey);
            }
        }
        replace(dst) {
            if (!dst.parent) {
                return false;
            }
            let ind = dst.parent.children.indexOf(dst);
            if (ind === -1) {
                return false;
            }
            dst.parent.children.splice(ind, 1, this);
            return true;
        }
        contains(dom) {
            for (; dom !== undefined && dom !== this; dom = dom.parent)
                ;
            return dom !== undefined;
        }
        hasClass(cls) {
            let clazz = this.props['class'];
            if (!clazz) {
                return false;
            }
            else {
                return clazz.trim().split(/\s+/).includes(cls);
            }
        }
        addClass(cls) {
            let clazz = this.props['class'];
            if (!clazz) {
                this.props['class'] = cls;
            }
            else {
                let sa = clazz.trim().split(/\s+/);
                if (!sa.includes(cls)) {
                    sa.push(cls);
                    clazz = sa.join(' ');
                    this.props['class'] = clazz;
                }
            }
        }
        removeClass(cls) {
            let clazz = this.props['class'];
            if (!clazz) {
                return;
            }
            else {
                let sa = clazz.trim().split(/\s+/);
                let index;
                if ((index = sa.indexOf(cls)) !== -1) {
                    sa.splice(index, 1);
                    clazz = sa.join(' ');
                }
            }
            this.props['class'] = clazz;
        }
        hasProp(propName) {
            return this.props.hasOwnProperty(propName) || this.exprProps.hasOwnProperty(propName);
        }
        getProp(propName, isExpr) {
            if (isExpr) {
                return this.exprProps[propName];
            }
            else {
                return this.props[propName];
            }
        }
        setProp(propName, v, isExpr) {
            if (isExpr) {
                this.exprProps[propName] = v;
            }
            else {
                this.props[propName] = v;
            }
        }
        delProp(props) {
            if (util_12.Util.isArray(props)) {
                for (let p of props) {
                    delete this.exprProps[p];
                }
                for (let p of props) {
                    delete this.props[p];
                }
            }
            else {
                delete this.exprProps[props];
                delete this.props[props];
            }
        }
        setAsset(assetName, value) {
            this.assets.set(assetName, value);
        }
        delAsset(assetName) {
            this.assets.delete(assetName);
        }
        query(key) {
            if (this.key === key) {
                return this;
            }
            for (let i = 0; i < this.children.length; i++) {
                let dom = this.children[i].query(key);
                if (dom) {
                    return dom;
                }
            }
        }
        compare(dst, retArr, parentNode) {
            if (!dst) {
                return;
            }
            let re = new types_1.ChangedDom();
            let change = false;
            let findedMap = new Map();
            if (this.tagName === undefined) {
                if (dst.tagName === undefined) {
                    if (this.textContent !== dst.textContent) {
                        re.type = 'text';
                        change = true;
                    }
                }
                else {
                    re.type = 'rep';
                    change = true;
                }
            }
            else {
                if (this.tagName !== dst.tagName) {
                    re.type = 'rep';
                    change = true;
                }
                else {
                    re.changeProps = [];
                    re.changeAssets = [];
                    re.removeProps = [];
                    util_12.Util.getOwnProps(dst.props).forEach((k) => {
                        if (!this.hasProp(k)) {
                            re.removeProps.push(k);
                        }
                    });
                    util_12.Util.getOwnProps(this.props).forEach((k) => {
                        let v1 = dst.props[k];
                        if (this.props[k] !== v1) {
                            re.changeProps.push({ k: k, v: this.props[k] });
                        }
                    });
                    for (let kv of this.assets) {
                        let v1 = dst.assets.get(kv[0]);
                        if (kv[0] !== v1) {
                            re.changeAssets.push({ k: kv[0], v: kv[1] });
                        }
                    }
                    if (re.changeProps.length > 0 || re.changeAssets.length > 0 || re.removeProps.length > 0) {
                        change = true;
                        re.type = 'upd';
                    }
                }
            }
            if (change) {
                re.node = this;
                if (parentNode) {
                    re.parent = parentNode;
                }
                retArr.push(re);
            }
            if (!this.children || this.children.length === 0) {
                if (dst.children && dst.children.length > 0) {
                    dst.children.forEach((item) => {
                        retArr.push(new types_1.ChangedDom(item, 'del'));
                    });
                }
            }
            else {
                if (!dst.children || dst.children.length === 0) {
                    this.children.forEach((item) => {
                        retArr.push(new types_1.ChangedDom(item, 'add', this));
                    });
                }
                else {
                    this.children.forEach((dom1, ind) => {
                        let dom2 = dst.children[ind];
                        if (!dom2 || dom1.key !== dom2.key) {
                            dom2 = undefined;
                            for (let i = 0; i < dst.children.length; i++) {
                                if (dom1.key === dst.children[i].key) {
                                    dom2 = dst.children[i];
                                    break;
                                }
                            }
                        }
                        if (dom2 !== undefined) {
                            dom1.compare(dom2, retArr, this);
                            findedMap.set(dom2.key, true);
                        }
                        else {
                            retArr.push(new types_1.ChangedDom(dom1, 'add', this, ind));
                        }
                    });
                    if (dst.children && dst.children.length > 0) {
                        dst.children.forEach((item) => {
                            if (!findedMap.has(item.key)) {
                                retArr.push(new types_1.ChangedDom(item, 'del', dst));
                            }
                        });
                    }
                }
            }
        }
        addEvent(event) {
            if (this.events.has(event.name)) {
                let ev = this.events.get(event.name);
                let evs;
                if (util_12.Util.isArray(ev)) {
                    evs = ev;
                }
                else {
                    evs = [ev];
                }
                evs.push(event);
                this.events.set(event.name, evs);
            }
            else {
                this.events.set(event.name, event);
            }
        }
        doDontRender() {
            if (this.hasDirective('module')) {
                let d = this.getDirective('module');
                if (d.extra && d.extra.moduleId) {
                    let mdl = modulefactory_9.ModuleFactory.get(d.extra.moduleId);
                    if (mdl) {
                        mdl.unactive();
                    }
                }
            }
            for (let c of this.children) {
                c.doDontRender();
            }
        }
    }
    exports.Element = Element;
});
define("factory", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NFactory = void 0;
    class NFactory {
        constructor(module) {
            this.items = new Map();
            if (module !== undefined) {
                this.moduleId = module.id;
            }
        }
        add(name, item) {
            this.items.set(name, item);
        }
        get(name) {
            return this.items.get(name);
        }
        remove(name) {
            this.items.delete(name);
        }
        has(name) {
            return this.items.has(name);
        }
    }
    exports.NFactory = NFactory;
});
define("methodfactory", ["require", "exports", "error", "factory", "nodom", "util"], function (require, exports, error_8, factory_1, nodom_7, util_13) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MethodFactory = void 0;
    class MethodFactory extends factory_1.NFactory {
        invoke(name, params) {
            const foo = this.get(name);
            if (!util_13.Util.isFunction(foo)) {
                throw new error_8.NError(nodom_7.Nodom.tipMessage.ErrorMsgs['notexist1'], nodom_7.Nodom.tipMessage.TipWords['method'], name);
            }
            return util_13.Util.apply(foo, this.module.model, params);
        }
    }
    exports.MethodFactory = MethodFactory;
});
define("module", ["require", "exports", "application", "compiler", "messagequeue", "methodfactory", "model", "modelmanager", "modulefactory", "nodom", "renderer", "resourcemanager", "util"], function (require, exports, application_4, compiler_2, messagequeue_2, methodfactory_1, model_3, modelmanager_1, modulefactory_10, nodom_8, renderer_3, resourcemanager_2, util_14) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Module = void 0;
    class Module {
        constructor(config) {
            this.firstRender = true;
            this.children = [];
            this.createOps = [];
            this.state = 0;
            this.loadNewData = false;
            this.renderDoms = [];
            this.container = null;
            this.moduleMap = new Map();
            this.plugins = new Map();
            this.id = util_14.Util.genId();
            if (config && config.name) {
                this.name = config.name;
            }
            else {
                this.name = 'Module' + this.id;
            }
            modulefactory_10.ModuleFactory.add(this);
            this.methodFactory = new methodfactory_1.MethodFactory(this);
            this.modelManager = new modelmanager_1.ModelManager(this);
            for (let foo of this.createOps) {
                foo.call(this);
            }
            this.doModuleEvent('onCreate');
            if (!config) {
                return;
            }
            this.initConfig = config;
            this.selector = config.el;
            if (util_14.Util.isObject(config.methods)) {
                util_14.Util.getOwnProps(config.methods).forEach((item) => {
                    this.methodFactory.add(item, config.methods[item]);
                });
            }
            if (this.getContainer()) {
                this.template = this.container.innerHTML.trim();
                this.container.innerHTML = '';
            }
        }
        init() {
            return __awaiter(this, void 0, void 0, function* () {
                let config = this.initConfig;
                let urlArr = [];
                let cssPath = application_4.Application.getPath('css');
                let templatePath = application_4.Application.getPath('template');
                let jsPath = application_4.Application.getPath('js');
                if (config && util_14.Util.isArray(config.requires) && config.requires.length > 0) {
                    config.requires.forEach((item) => {
                        let type;
                        let url = '';
                        if (util_14.Util.isObject(item)) {
                            type = item['type'] || 'js';
                            url = item['url'];
                        }
                        else {
                            type = 'js';
                            url = item;
                        }
                        let path = type === 'js' ? jsPath : cssPath;
                        urlArr.push({ url: util_14.Util.mergePath([path, url]), type: type });
                    });
                }
                let templateStr = this.template;
                if (config.template) {
                    config.template = config.template.trim();
                    if (config.template.startsWith('<')) {
                        templateStr = config.template;
                    }
                    else {
                        urlArr.push({
                            url: util_14.Util.mergePath([templatePath, config.template]),
                            type: config.template.endsWith('.nd') ? 'nd' : 'template'
                        });
                    }
                }
                delete this.template;
                if (!util_14.Util.isEmpty(templateStr)) {
                    this.virtualDom = compiler_2.Compiler.compile(templateStr);
                }
                if (config.data) {
                    if (util_14.Util.isObject(config.data)) {
                        this.model = new model_3.Model(config.data, this);
                    }
                    else {
                        urlArr.push({
                            url: config.data,
                            type: 'data'
                        });
                        this.dataUrl = config.data;
                    }
                }
                else {
                    this.model = new model_3.Model({}, this);
                }
                if (urlArr.length > 0) {
                    let rets = yield resourcemanager_2.ResourceManager.getResources(urlArr);
                    for (let r of rets) {
                        if (r.type === 'template' || r.type === 'nd') {
                            this.virtualDom = r.content;
                        }
                        else if (r.type === 'data') {
                            this.model = new model_3.Model(r.content, this);
                        }
                    }
                }
                if (this.initConfig.modules) {
                    for (let cfg of this.initConfig.modules) {
                        let mdl = new Module(cfg);
                        mdl.parentId = this.id;
                        this.addChild(mdl.id);
                    }
                }
                changeState(this);
                delete this.initConfig;
                function changeState(mod) {
                    if (mod.isMain) {
                        mod.state = 3;
                        renderer_3.Renderer.add(mod);
                    }
                    else if (mod.parentId) {
                        mod.state = modulefactory_10.ModuleFactory.get(mod.parentId).state;
                    }
                    else {
                        mod.state = 1;
                    }
                }
            });
        }
        render() {
            if (this.state === 2) {
                return true;
            }
            if (this.state !== 3 || !this.virtualDom || !this.getContainer()) {
                return false;
            }
            let root = this.virtualDom.clone();
            if (this.firstRender) {
                if (this.loadNewData && this.dataUrl) {
                    nodom_8.Nodom.request({
                        url: this.dataUrl,
                        type: 'json'
                    }).then((r) => {
                        this.model = new model_3.Model(r, this);
                        this.doFirstRender(root);
                        this.loadNewData = false;
                    });
                }
                else {
                    this.doFirstRender(root);
                }
            }
            else {
                this.doModuleEvent('onBeforeRender');
                if (this.model) {
                    root.model = this.model;
                    let oldTree = this.renderTree;
                    this.renderTree = root;
                    root.render(this, null);
                    this.clearDontRender(root);
                    this.doModuleEvent('onBeforeRenderToHtml');
                    root.compare(oldTree, this.renderDoms);
                    for (let i = this.renderDoms.length - 1; i >= 0; i--) {
                        let item = this.renderDoms[i];
                        if (item.type === 'del') {
                            item.node.removeFromHtml(this);
                            this.renderDoms.splice(i, 1);
                        }
                    }
                    this.renderDoms.forEach((item) => {
                        item.node.renderToHtml(this, item);
                    });
                }
                this.doModuleEvent('onRender');
            }
            this.renderDoms = [];
            return true;
        }
        doFirstRender(root) {
            this.doModuleEvent('onBeforeFirstRender');
            this.renderTree = root;
            if (this.model) {
                root.model = this.model;
            }
            root.render(this, null);
            this.clearDontRender(root);
            this.doModuleEvent('onBeforeFirstRenderToHTML');
            util_14.Util.empty(this.container);
            root.renderToHtml(this, { type: 'fresh' });
            delete this.firstRender;
            this.doModuleEvent('onFirstRender');
        }
        clone(moduleName) {
            let me = this;
            let m = new Module({ name: moduleName });
            let excludes = ['id', 'name', 'model', 'virtualDom', 'container', 'containerKey', 'modelFactory', 'plugins'];
            Object.getOwnPropertyNames(this).forEach((item) => {
                if (excludes.includes(item)) {
                    return;
                }
                m[item] = me[item];
            });
            m.virtualDom = this.virtualDom.clone(true);
            return m;
        }
        getContainer() {
            if (this.selector) {
                this.container = document.querySelector(this.selector);
            }
            else {
                this.container = document.querySelector("[key='" + this.containerKey + "']");
            }
            return this.container;
        }
        setContainerKey(key) {
            this.containerKey = key;
        }
        getContainerKey() {
            return (this.containerKey);
        }
        dataChange() {
            renderer_3.Renderer.add(this);
        }
        addChild(moduleId) {
            if (!this.children.includes(moduleId)) {
                this.children.push(moduleId);
                let m = modulefactory_10.ModuleFactory.get(moduleId);
                if (m) {
                    m.parentId = this.id;
                }
                this.moduleMap.set(m.name, moduleId);
                messagequeue_2.MessageQueue.move(m.name, moduleId, this.id);
            }
        }
        send(toName, data, type) {
            if (typeof toName === 'number') {
                messagequeue_2.MessageQueue.add(this.id, toName, data);
                return;
            }
            let toId;
            let parentId;
            let m;
            switch (type) {
                case 1:
                    m = this.getChild(toName);
                    if (m) {
                        toId = m.id;
                    }
                    parentId = this.id;
                    break;
                case 2:
                    toId = this.parentId || 0;
                default:
                    parentId = this.parentId || 0;
                    m = modulefactory_10.ModuleFactory.get(parentId);
                    if (m) {
                        m = m.getChild(toName);
                        if (m) {
                            toId = m.id;
                        }
                    }
            }
            if (toId) {
                messagequeue_2.MessageQueue.add(this.id, toId, data);
            }
            else {
                messagequeue_2.MessageQueue.add(this.id, toName, data, parentId);
            }
        }
        broadcast(data) {
            if (this.parentId) {
                let pmod = modulefactory_10.ModuleFactory.get(this.parentId);
                if (pmod) {
                    this.send(this.parentId, data);
                    if (pmod.children) {
                        pmod.children.forEach((item) => {
                            if (item === this.id) {
                                return;
                            }
                            let m = modulefactory_10.ModuleFactory.get(item);
                            this.send(m.id, data);
                        });
                    }
                }
            }
            if (this.children !== undefined) {
                this.children.forEach((item) => {
                    let m = modulefactory_10.ModuleFactory.get(item);
                    this.send(m.id, data);
                });
            }
        }
        receive(fromName, data) {
            this.doModuleEvent('onReceive', [fromName, data]);
        }
        active() {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.state === 3) {
                    return;
                }
                if (this.state === 0) {
                    yield this.init();
                }
                this.state = 3;
                renderer_3.Renderer.add(this);
                if (util_14.Util.isArray(this.children)) {
                    this.children.forEach((item) => __awaiter(this, void 0, void 0, function* () {
                        let m = modulefactory_10.ModuleFactory.get(item);
                        if (m) {
                            yield m.active();
                        }
                    }));
                }
            });
        }
        unactive() {
            if (this.isMain || this.state === 2) {
                return;
            }
            this.state = 2;
            this.firstRender = true;
            if (util_14.Util.isArray(this.children)) {
                this.children.forEach((item) => {
                    let m = modulefactory_10.ModuleFactory.get(item);
                    if (m) {
                        m.unactive();
                    }
                });
            }
        }
        destroy() {
            if (util_14.Util.isArray(this.children)) {
                this.children.forEach((item) => {
                    let m = modulefactory_10.ModuleFactory.get(item);
                    if (m) {
                        m.destroy();
                    }
                });
            }
            modulefactory_10.ModuleFactory.remove(this.id);
        }
        doModuleEvent(eventName, param) {
            const foo = this.methodFactory.get(eventName);
            if (!foo) {
                return;
            }
            util_14.Util.apply(foo, this.model, param);
        }
        addCreateOperation(foo) {
            if (!util_14.Util.isFunction(foo)) {
                return;
            }
            if (!this.createOps.includes(foo)) {
                this.createOps.push(foo);
            }
        }
        clearDontRender(dom) {
            for (let i = 0; i < dom.children.length; i++) {
                let item = dom.children[i];
                if (item.dontRender) {
                    dom.children.splice(i, 1);
                    return;
                }
                if (item.dontRenderSelf) {
                    let arr = [];
                    for (let d of item.children) {
                        d.parent = dom.parent;
                        d.parentKey = dom.parentKey;
                        arr.push(d);
                    }
                    dom.children.splice.apply(dom.children, [i, 1].concat(arr));
                    continue;
                }
                this.clearDontRender(item);
            }
        }
        getChild(name, descendant) {
            if (this.moduleMap.has(name)) {
                let mid = this.moduleMap.get(name);
                return modulefactory_10.ModuleFactory.get(mid);
            }
            else if (descendant) {
                for (let id of this.children) {
                    let m = modulefactory_10.ModuleFactory.get(id);
                    if (m) {
                        let m1 = m.getChild(name, descendant);
                        if (m1) {
                            return m1;
                        }
                    }
                }
            }
            return null;
        }
        getMethod(name) {
            return this.methodFactory.get(name);
        }
        addMethod(name, foo) {
            this.methodFactory.add(name, foo);
        }
        removeMethod(name) {
            this.methodFactory.remove(name);
        }
        addNPlugin(name, plugin) {
            if (name) {
                this.plugins.set(name, plugin);
            }
        }
        getNPlugin(name) {
            return this.plugins.get(name);
        }
        setDataUrl(url) {
            this.dataUrl = url;
            this.loadNewData = true;
        }
        getNode(key, notNull) {
            let keyName;
            let value;
            if (typeof key === 'string') {
                keyName = 'key';
                value = key;
            }
            else {
                keyName = Object.getOwnPropertyNames(key)[0];
                value = key[keyName];
            }
            let qs = "[" + keyName + "='" + value + "']";
            let el = this.container ? this.container.querySelector(qs) : null;
            if (!el && notNull) {
                return this.container;
            }
            return el;
        }
        getElement(key, fromVirtualDom) {
            let tree = fromVirtualDom ? this.virtualDom : this.renderTree;
            return tree.query(key);
        }
        isContainerKey(key) {
            return this.containerKey === key;
        }
        setFirstRender(flag) {
            this.firstRender = flag;
        }
        setMain() {
            this.isMain = true;
        }
        setSelector(selector) {
            this.selector = selector;
        }
    }
    exports.Module = Module;
});
define("directivetype", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DirectiveType = void 0;
    class DirectiveType {
        constructor(name, prio, init, handle) {
            this.name = name;
            this.prio = prio || 10;
            this.init = init;
            this.handle = handle;
        }
    }
    exports.DirectiveType = DirectiveType;
});
define("directivemanager", ["require", "exports", "directivetype", "util"], function (require, exports, directivetype_1, util_15) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DirectiveManager = void 0;
    class DirectiveManager {
        static addType(name, prio, init, handle) {
            this.directiveTypes.set(name, new directivetype_1.DirectiveType(name, prio, init, handle));
        }
        static removeType(name) {
            this.directiveTypes.delete(name);
        }
        static getType(name) {
            return this.directiveTypes.get(name);
        }
        static hasType(name) {
            return this.directiveTypes.has(name);
        }
        static init(directive, dom) {
            let dt = directive.type;
            if (dt) {
                return dt.init(directive, dom);
            }
        }
        static exec(directive, dom, module, parent) {
            return util_15.Util.apply(directive.type.handle, null, [directive, dom, module, parent]);
        }
    }
    exports.DirectiveManager = DirectiveManager;
    DirectiveManager.directiveTypes = new Map();
});
define("filter", ["require", "exports", "filtermanager", "util"], function (require, exports, filtermanager_2, util_16) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Filter = void 0;
    class Filter {
        constructor(src) {
            if (src) {
                let arr = util_16.Util.isString(src) ? filtermanager_2.FilterManager.explain(src) : src;
                if (arr) {
                    this.type = arr[0];
                    this.params = arr.slice(1);
                }
            }
        }
        exec(value, module) {
            let args = [module, this.type, value].concat(this.params);
            return util_16.Util.apply(filtermanager_2.FilterManager.exec, module, args);
        }
        clone() {
            let filter = new Filter();
            filter.type = this.type;
            if (this.params) {
                filter.params = util_16.Util.clone(this.params);
            }
            return filter;
        }
    }
    exports.Filter = Filter;
});
define("directive", ["require", "exports", "directivemanager", "filter", "util"], function (require, exports, directivemanager_2, filter_1, util_17) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Directive = void 0;
    class Directive {
        constructor(type, value, dom, filters, notSort) {
            this.id = util_17.Util.genId();
            this.type = directivemanager_2.DirectiveManager.getType(type);
            if (util_17.Util.isString(value)) {
                value = value.trim();
            }
            this.value = value;
            if (filters) {
                this.filters = [];
                if (typeof filters === 'string') {
                    let fa = filters.split('|');
                    for (let f of fa) {
                        this.filters.push(new filter_1.Filter(f));
                    }
                }
                else if (util_17.Util.isArray(filters)) {
                    for (let f of filters) {
                        if (typeof f === 'string') {
                            this.filters.push(new filter_1.Filter(f));
                        }
                        else if (f instanceof filter_1.Filter) {
                            this.filters.push(f);
                        }
                    }
                }
            }
            if (type !== undefined && dom) {
                directivemanager_2.DirectiveManager.init(this, dom);
                dom.addDirective(this, !notSort);
            }
        }
        exec(module, dom, parent) {
            return __awaiter(this, void 0, void 0, function* () {
                return directivemanager_2.DirectiveManager.exec(this, dom, module, parent);
            });
        }
        clone(dst) {
            let dir = new Directive(this.type.name, this.value);
            if (this.filters) {
                dir.filters = [];
                for (let f of this.filters) {
                    dir.filters.push(f.clone());
                }
            }
            if (this.params) {
                dir.params = util_17.Util.clone(this.params);
            }
            if (this.extra) {
                dir.extra = util_17.Util.clone(this.extra);
            }
            directivemanager_2.DirectiveManager.init(dir, dst);
            return dir;
        }
    }
    exports.Directive = Directive;
});
define("pluginmanager", ["require", "exports", "error", "nodom"], function (require, exports, error_9, nodom_9) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PluginManager = void 0;
    class PluginManager {
        static add(name, cfg) {
            if (this.plugins.has(name)) {
                throw new error_9.NError('exist1', nodom_9.Nodom.tipMessage.TipWords['element'], name);
            }
            this.plugins.set(name, cfg);
        }
        static get(tagName) {
            return this.plugins.get(tagName);
        }
    }
    exports.PluginManager = PluginManager;
    PluginManager.plugins = new Map();
});
define("compiler", ["require", "exports", "directive", "expression", "event", "pluginmanager", "element", "util"], function (require, exports, directive_1, expression_2, event_1, pluginmanager_1, element_1, util_18) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Compiler = void 0;
    class Compiler {
        static compile(elementStr) {
            const div = util_18.Util.newEl('div');
            try {
                div.innerHTML = elementStr;
            }
            catch (e) { }
            let oe = new element_1.Element('div');
            oe.setProp('role', 'moduleContainer');
            this.handleChildren(oe, div);
            return oe;
        }
        static compileDom(ele) {
            let oe;
            let isComment = false;
            switch (ele.nodeType) {
                case Node.ELEMENT_NODE:
                    let el = ele;
                    oe = this.handleDefineEl(el);
                    if (!oe) {
                        oe = this.handleEl(el);
                    }
                    break;
                case Node.TEXT_NODE:
                    oe = new element_1.Element();
                    let txt = ele.textContent;
                    let expA = this.compileExpression(txt);
                    if (typeof expA === 'string') {
                        oe.textContent = expA;
                    }
                    else {
                        oe.expressions = expA;
                    }
                    break;
                case Node.COMMENT_NODE:
                    isComment = true;
                    break;
            }
            if (!isComment) {
                return oe;
            }
        }
        static handleEl(el) {
            let oe = new element_1.Element(el.tagName);
            this.handleAttributes(oe, el);
            this.handleChildren(oe, el);
            return oe;
        }
        static handleDefineEl(el) {
            let de = pluginmanager_1.PluginManager.get(el.tagName);
            if (!de) {
                return;
            }
            return Reflect.construct(de, [el]).element;
        }
        static handleAttributes(oe, el) {
            let directives = [];
            for (let i = 0; i < el.attributes.length; i++) {
                let attr = el.attributes[i];
                if (attr.name.startsWith('x-')) {
                    directives.push(attr);
                }
                else if (attr.name.startsWith('e-')) {
                    let en = attr.name.substr(2);
                    oe.addEvent(new event_1.NEvent(en, attr.value.trim()));
                }
                else {
                    let isExpr = false;
                    let v = attr.value.trim();
                    if (v !== '') {
                        let ra = this.compileExpression(v);
                        if (util_18.Util.isArray(ra)) {
                            oe.setProp(attr.name, ra, true);
                            isExpr = true;
                        }
                    }
                    if (!isExpr) {
                        oe.setProp(attr.name, v);
                    }
                }
            }
            for (let attr of directives) {
                new directive_1.Directive(attr.name.substr(2), attr.value.trim(), oe, null, true);
            }
            if (directives.length > 1) {
                oe.directives.sort((a, b) => {
                    return a.type.prio - b.type.prio;
                });
            }
        }
        static handleChildren(oe, el) {
            for (let i = 0; i < el.childNodes.length; i++) {
                let nd = el.childNodes[i];
                let o = this.compileDom(nd);
                if (o) {
                    if (o.tagName && oe.isSvgNode) {
                        o.isSvgNode = true;
                    }
                    oe.children.push(o);
                }
            }
        }
        static compileExpression(exprStr) {
            if (/\{\{.+?\}\}/.test(exprStr) === false) {
                return exprStr;
            }
            let reg = /\{\{.+?\}\}/g;
            let retA = new Array();
            let re;
            let oIndex = 0;
            while ((re = reg.exec(exprStr)) !== null) {
                let ind = re.index;
                if (ind > oIndex) {
                    let s = exprStr.substring(oIndex, ind);
                    retA.push(s);
                }
                let exp = new expression_2.Expression(re[0].substring(2, re[0].length - 2));
                retA.push(exp);
                oIndex = ind + re[0].length;
            }
            if (oIndex < exprStr.length - 1) {
                retA.push(exprStr.substr(oIndex));
            }
            return retA;
        }
    }
    exports.Compiler = Compiler;
});
define("extend/directiveinit", ["require", "exports", "element", "directive", "directivemanager", "modulefactory", "router", "util", "expression", "filter", "renderer", "error", "event", "nodom"], function (require, exports, element_2, directive_2, directivemanager_3, modulefactory_11, router_2, util_19, expression_3, filter_2, renderer_4, error_10, event_2, nodom_10) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var nodom;
    (function (nodom) {
        directivemanager_3.DirectiveManager.addType('module', 0, (directive, dom) => {
            let value = directive.value;
            let valueArr = value.split('|');
            directive.value = valueArr[0];
            dom.setProp('role', 'module');
            if (valueArr.length > 1) {
                dom.setProp('modulename', valueArr[1]);
            }
            directive.extra = {};
        }, (directive, dom, module, parent) => __awaiter(this, void 0, void 0, function* () {
            const ext = directive.extra;
            let needNew = ext.moduleId === undefined;
            let subMdl;
            if (ext && ext.moduleId) {
                subMdl = modulefactory_11.ModuleFactory.get(ext.moduleId);
                needNew = subMdl.getContainerKey() !== dom.key;
            }
            if (needNew) {
                let m = yield modulefactory_11.ModuleFactory.getInstance(directive.value, dom.getProp('modulename'), dom.getProp('data'));
                if (m) {
                    m.setContainerKey(dom.key);
                    let dom1 = module.getElement(dom.key, true);
                    if (dom1) {
                        let dir = dom1.getDirective('module');
                        dir.extra.moduleId = m.id;
                    }
                    module.addChild(m.id);
                    yield m.active();
                }
            }
            else if (subMdl && subMdl.state !== 3) {
                yield subMdl.active();
            }
        }));
        directivemanager_3.DirectiveManager.addType('model', 1, (directive, dom) => {
            let value = directive.value;
            if (util_19.Util.isString(value)) {
                if (value.startsWith('$$')) {
                    directive.extra = 1;
                    value = value.substr(2);
                }
                directive.value = value;
            }
        }, (directive, dom, module, parent) => {
            let startIndex = 0;
            let model = dom.model;
            if (directive.extra === 1) {
                model = module.model;
                startIndex = 1;
            }
            model = model[directive.value];
            if (model) {
                dom.model = model;
            }
        });
        directivemanager_3.DirectiveManager.addType('repeat', 2, (directive, dom) => {
            let value = directive.value;
            if (!value) {
                throw new error_10.NError("paramException", "x-repeat");
            }
            let modelName;
            let fa = value.split('|');
            modelName = fa[0];
            if (fa.length > 1) {
                directive.filters = [];
                for (let i = 1; i < fa.length; i++) {
                    directive.filters.push(new filter_2.Filter(fa[i]));
                }
            }
            if (modelName.startsWith('$$')) {
                modelName = modelName.substr(2);
            }
            directive.value = modelName;
        }, (directive, dom, module, parent) => {
            let model = dom.model;
            dom.dontRender = true;
            let rows = model[directive.value];
            if (!util_19.Util.isArray(rows) || rows.length === 0) {
                return;
            }
            dom.dontRender = false;
            if (directive.filters && directive.filters.length > 0) {
                for (let f of directive.filters) {
                    rows = f.exec(rows, module);
                }
            }
            let chds = [];
            let key = dom.key;
            dom.removeDirectives(['repeat']);
            for (let i = 0; i < rows.length; i++) {
                let node = dom.clone();
                node.model = rows[i];
                setKey(node, key, i);
                rows[i].$index = i;
                chds.push(node);
            }
            if (chds.length > 0) {
                for (let i = 0, len = parent.children.length; i < len; i++) {
                    if (parent.children[i] === dom) {
                        chds = [i + 1, 0].concat(chds);
                        Array.prototype.splice.apply(parent.children, chds);
                        break;
                    }
                }
            }
            dom.dontRender = true;
            function setKey(node, key, id) {
                node.key = key + '_' + id;
                node.children.forEach((dom) => {
                    setKey(dom, dom.key, id);
                });
            }
        });
        directivemanager_3.DirectiveManager.addType('if', 10, (directive, dom) => {
            if (typeof directive.value === 'string') {
                let value = directive.value;
                if (!value) {
                    throw new error_10.NError("paramException", "x-repeat");
                }
                let expr = new expression_3.Expression(value);
                directive.value = expr;
            }
        }, (directive, dom, module, parent) => {
            let model = dom.model;
            let v = directive.value.val(model);
            let indif = -1, indelse = -1;
            for (let i = 0; i < parent.children.length; i++) {
                if (parent.children[i] === dom) {
                    indif = i;
                }
                else if (indelse === -1 && parent.children[i].hasDirective('else')) {
                    indelse = i;
                }
                if (i !== indif && indif !== -1 && indelse === -1 && parent.children[i].tagName !== undefined) {
                    indelse = -2;
                }
                if (indif !== -1 && indelse !== -1) {
                    break;
                }
            }
            if (v && v !== 'false') {
                let ind = 0;
                if (indelse > 0) {
                    parent.children[indelse].dontRender = true;
                }
            }
            else {
                dom.dontRender = true;
                if (indelse > 0) {
                    parent.children[indelse].dontRender = false;
                }
            }
        });
        directivemanager_3.DirectiveManager.addType('else', 10, (directive) => {
            return;
        }, (directive, dom, module, parent) => {
            return;
        });
        directivemanager_3.DirectiveManager.addType('show', 10, (directive, dom) => {
            if (typeof directive.value === 'string') {
                let value = directive.value;
                if (!value) {
                    throw new error_10.NError("paramException", "x-show");
                }
                let expr = new expression_3.Expression(value);
                directive.value = expr;
            }
        }, (directive, dom, module, parent) => {
            let model = dom.model;
            let v = directive.value.val(model);
            if (v && v !== 'false') {
                dom.dontRender = false;
            }
            else {
                dom.dontRender = true;
            }
        });
        directivemanager_3.DirectiveManager.addType('class', 10, (directive, dom) => {
            if (typeof directive.value === 'string') {
                let obj = eval('(' + directive.value + ')');
                if (!util_19.Util.isObject(obj)) {
                    return;
                }
                let robj = {};
                util_19.Util.getOwnProps(obj).forEach(function (key) {
                    if (util_19.Util.isString(obj[key])) {
                        robj[key] = new expression_3.Expression(obj[key]);
                    }
                    else {
                        robj[key] = obj[key];
                    }
                });
                directive.value = robj;
            }
        }, (directive, dom, module, parent) => {
            let obj = directive.value;
            let clsArr = [];
            let cls = dom.getProp('class');
            let model = dom.model;
            if (util_19.Util.isString(cls) && !util_19.Util.isEmpty(cls)) {
                clsArr = cls.trim().split(/\s+/);
            }
            util_19.Util.getOwnProps(obj).forEach(function (key) {
                let r = obj[key];
                if (r instanceof expression_3.Expression) {
                    r = r.val(model);
                }
                let ind = clsArr.indexOf(key);
                if (!r || r === 'false') {
                    if (ind !== -1) {
                        clsArr.splice(ind, 1);
                    }
                }
                else if (ind === -1) {
                    clsArr.push(key);
                }
            });
            dom.setProp('class', clsArr.join(' '));
        });
        directivemanager_3.DirectiveManager.addType('field', 10, (directive, dom) => {
            dom.setProp('name', directive.value);
            let type = dom.getProp('type') || 'text';
            let eventName = dom.tagName === 'input' && ['text', 'checkbox', 'radio'].includes(type) ? 'input' : 'change';
            if (!dom.hasProp('value') && ['text', 'number', 'date', 'datetime', 'datetime-local', 'month', 'week', 'time', 'email', 'password', 'search', 'tel', 'url', 'color', 'radio'].includes(type)
                || dom.tagName === 'TEXTAREA') {
                dom.setProp('value', new expression_3.Expression(directive.value), true);
            }
            dom.addEvent(new event_2.NEvent(eventName, function (dom, model, module, e, el) {
                if (!el) {
                    return;
                }
                let type = dom.getProp('type');
                let field = dom.getDirective('field').value;
                let v = el.value;
                if (type === 'checkbox') {
                    if (dom.getProp('yes-value') == v) {
                        v = dom.getProp('no-value');
                    }
                    else {
                        v = dom.getProp('yes-value');
                    }
                }
                else if (type === 'radio') {
                    if (!el.checked) {
                        v = undefined;
                    }
                }
                model.set(field, v);
                if (type !== 'radio') {
                    dom.setProp('value', v);
                    el.value = v;
                }
            }));
        }, (directive, dom, module, parent) => {
            const type = dom.getProp('type');
            const tgname = dom.tagName.toLowerCase();
            const model = dom.model;
            let dataValue = model[directive.value];
            if (dataValue !== undefined && dataValue !== null) {
                dataValue += '';
            }
            let value = dom.getProp('value');
            if (type === 'radio') {
                if (dataValue + '' === value) {
                    dom.assets.set('checked', true);
                    dom.setProp('checked', 'checked');
                }
                else {
                    dom.assets.set('checked', false);
                    dom.delProp('checked');
                }
            }
            else if (type === 'checkbox') {
                let yv = dom.getProp('yes-value');
                if (dataValue + '' === yv) {
                    dom.setProp('value', yv);
                    dom.assets.set('checked', true);
                }
                else {
                    dom.setProp('value', dom.getProp('no-value'));
                    dom.assets.set('checked', false);
                }
            }
            else if (tgname === 'select') {
                if (!directive.extra || !directive.extra.inited) {
                    setTimeout(() => {
                        directive.extra = { inited: true };
                        dom.setProp('value', dataValue);
                        dom.setAsset('value', dataValue);
                        renderer_4.Renderer.add(module);
                    }, 0);
                }
                else {
                    if (dataValue !== value) {
                        dom.setProp('value', dataValue);
                        dom.setAsset('value', dataValue);
                    }
                }
            }
            else {
                dom.assets.set('value', dataValue === undefined || dataValue === null ? '' : dataValue);
            }
        });
        directivemanager_3.DirectiveManager.addType('validity', 10, (directive, dom) => {
            let ind, fn, method;
            let value = directive.value;
            if ((ind = value.indexOf('|')) !== -1) {
                fn = value.substr(0, ind);
                method = value.substr(ind + 1);
            }
            else {
                fn = value;
            }
            directive.extra = { initEvent: false };
            directive.value = fn;
            directive.params = {
                enabled: false
            };
            if (method) {
                directive.params.method = method;
            }
            if (dom.children.length === 0) {
                let vd1 = new element_2.Element();
                vd1.textContent = '';
                dom.add(vd1);
            }
            else {
                dom.children.forEach((item) => {
                    if (item.children.length === 0) {
                        let vd1 = new element_2.Element();
                        vd1.textContent = '   ';
                        item.add(vd1);
                    }
                });
            }
        }, (directive, dom, module, parent) => {
            setTimeout(() => {
                const el = module.getNode({ name: directive.value });
                if (!directive.extra.initEvent) {
                    directive.extra.initEvent = true;
                    el.addEventListener('focus', function () {
                        setTimeout(() => { directive.params.enabled = true; }, 0);
                    });
                    el.addEventListener('blur', function () {
                        renderer_4.Renderer.add(module);
                    });
                }
            }, 0);
            if (!directive.params.enabled) {
                dom.dontRender = true;
                return;
            }
            const el = module.getNode({ name: directive.value });
            if (!el) {
                return;
            }
            let chds = [];
            dom.children.forEach((item) => {
                if (item.tagName !== undefined && item.hasProp('rel')) {
                    chds.push(item);
                }
            });
            let resultArr = [];
            if (directive.params.method) {
                const foo = module.getMethod(directive.params.method);
                if (util_19.Util.isFunction(foo)) {
                    let r = foo.call(module.model, el.value);
                    if (!r) {
                        resultArr.push('custom');
                    }
                }
            }
            let vld = el.validity;
            if (!vld.valid) {
                for (var o in vld) {
                    if (vld[o] === true) {
                        resultArr.push(o);
                    }
                }
            }
            if (resultArr.length > 0) {
                let vn = handle(resultArr);
                if (chds.length === 0) {
                    setTip(dom, vn, el);
                }
                else {
                    for (let i = 0; i < chds.length; i++) {
                        let rel = chds[i].getProp('rel');
                        if (rel === vn) {
                            setTip(chds[i], vn, el);
                        }
                        else {
                            chds[i].dontRender = true;
                        }
                    }
                }
            }
            else {
                dom.dontRender = true;
            }
            function setTip(vd, vn, el) {
                let text = vd.children[0].textContent.trim();
                if (text === '') {
                    text = util_19.Util.compileStr(nodom_10.Nodom.tipMessage.FormMsgs[vn], el.getAttribute(vn));
                }
                vd.children[0].textContent = text;
            }
            function handle(arr) {
                for (var i = 0; i < arr.length; i++) {
                    switch (arr[i]) {
                        case 'valueMissing':
                            return 'required';
                        case 'typeMismatch':
                            return 'type';
                        case 'tooLong':
                            return 'maxLength';
                        case 'tooShort':
                            return 'minLength';
                        case 'rangeUnderflow':
                            return 'min';
                        case 'rangeOverflow':
                            return 'max';
                        case 'patternMismatch':
                            return 'pattern';
                        default:
                            return arr[i];
                    }
                }
            }
        });
        directivemanager_3.DirectiveManager.addType('route', 10, (directive, dom) => {
            let value = directive.value;
            if (util_19.Util.isEmpty(value)) {
                return;
            }
            if (dom.tagName === 'A') {
                dom.setProp('href', 'javascript:void(0)');
            }
            if (typeof value === 'string' && /^\{\{.+\}\}$/.test(value)) {
                value = new expression_3.Expression(value.substring(2, value.length - 2));
            }
            if (value instanceof expression_3.Expression) {
                dom.setProp('path', value, true);
                directive.value = value;
            }
            else {
                dom.setProp('path', value);
            }
            if (dom.hasProp('activename')) {
                let an = dom.getProp('activename');
                dom.setProp('active', new expression_3.Expression(an), true);
                if (dom.hasProp('activeclass')) {
                    new directive_2.Directive('class', "{" + dom.getProp('activeclass') + ":'" + an + "'}", dom);
                }
            }
            dom.addEvent(new event_2.NEvent('click', (dom, model, module, e) => {
                let path = dom.getProp('path');
                if (util_19.Util.isEmpty(path)) {
                    return;
                }
                router_2.Router.go(path);
            }));
        }, (directive, dom, module, parent) => {
            let path = dom.getProp('path');
            let domArr = router_2.Router.activeDomMap.get(module.id);
            if (!domArr) {
                router_2.Router.activeDomMap.set(module.id, [dom.key]);
            }
            else {
                if (!domArr.includes(dom.key)) {
                    domArr.push(dom.key);
                }
            }
            if (!path || path === router_2.Router.currentPath) {
                return;
            }
            if (dom.hasProp('active') && dom.getProp('active') && (!router_2.Router.currentPath || path.indexOf(router_2.Router.currentPath) === 0)) {
                setTimeout(() => { router_2.Router.go(path); }, 0);
            }
        });
        directivemanager_3.DirectiveManager.addType('router', 10, (directive, dom) => {
            dom.setProp('role', 'module');
        }, (directive, dom, module, parent) => {
            router_2.Router.routerKeyMap.set(module.id, dom.key);
        });
        directivemanager_3.DirectiveManager.addType('ignoreself', 10, (directive, dom) => {
            dom.dontRenderSelf = true;
        }, (directive, dom, module, parent) => {
        });
    })(nodom || (nodom = {}));
});
define("extend/filterinit", ["require", "exports", "error", "filtermanager", "nodom", "util"], function (require, exports, error_11, filtermanager_3, nodom_11, util_20) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var nodom;
    (function (nodom) {
        filtermanager_3.FilterManager.addType('date', (value, param) => {
            if (util_20.Util.isEmpty(value)) {
                return '';
            }
            param = param.substr(1, param.length - 2);
            return util_20.Util.formatDate(value, param);
        });
        filtermanager_3.FilterManager.addType('currency', (value, sign) => {
            if (isNaN(value)) {
                return '';
            }
            sign = sign || '¥';
            if (typeof value === 'string') {
                value = parseFloat(value);
            }
            return sign + ((value * 100 + 0.5 | 0) / 100);
        });
        filtermanager_3.FilterManager.addType('number', (value, param) => {
            let digits = param || 0;
            if (isNaN(value) || digits < 0) {
                return '';
            }
            if (typeof value === 'string') {
                value = parseFloat(value);
            }
            let x = 1;
            for (let i = 0; i < digits; i++) {
                x *= 10;
            }
            return ((value * x + 0.5) | 0) / x;
        });
        filtermanager_3.FilterManager.addType('tolowercase', (value) => {
            if (util_20.Util.isEmpty(value)) {
                return '';
            }
            if (!util_20.Util.isString(value) || util_20.Util.isEmpty(value)) {
                throw new error_11.NError('invoke1', nodom_11.Nodom.tipMessage.TipWords['filter'] + ' tolowercase', '0', 'string');
            }
            return value.toLowerCase();
        });
        filtermanager_3.FilterManager.addType('touppercase', (value) => {
            if (util_20.Util.isEmpty(value)) {
                return '';
            }
            if (!util_20.Util.isString(value) || util_20.Util.isEmpty(value)) {
                throw new error_11.NError('invoke1', nodom_11.Nodom.tipMessage.TipWords['filter'] + ' touppercase', '0', 'string');
            }
            return value.toUpperCase();
        });
        filtermanager_3.FilterManager.addType('orderby', function () {
            let args = arguments;
            let arr = args[0];
            let field = args[1];
            let odr = args[2] || 'asc';
            if (!util_20.Util.isArray(arr)) {
                throw new error_11.NError('invoke1', nodom_11.Nodom.tipMessage.TipWords['filter'] + ' orderby', '0', 'array');
            }
            let ret = arr.concat([]);
            if (field && util_20.Util.isObject(arr[0])) {
                if (odr === 'asc') {
                    ret.sort((a, b) => a[field] >= b[field] ? 1 : -1);
                }
                else {
                    ret.sort((a, b) => a[field] <= b[field] ? 1 : -1);
                }
            }
            else {
                if (odr === 'asc') {
                    ret.sort((a, b) => a >= b ? 1 : -1);
                }
                else {
                    ret.sort((a, b) => a <= b ? 1 : -1);
                }
            }
            return ret;
        });
        filtermanager_3.FilterManager.addType('select', function () {
            if (!util_20.Util.isArray(arguments[0])) {
                throw new error_11.NError('invoke1', nodom_11.Nodom.tipMessage.TipWords['filter'] + ' filter', '0', 'array');
            }
            let params = new Array();
            for (let i = 0; i < arguments.length; i++) {
                params.push(arguments[i]);
            }
            let handler = {
                odd: function () {
                    let arr = arguments[0];
                    let ret = [];
                    for (let i = 0; i < arr.length; i++) {
                        if (i % 2 === 1) {
                            ret.push(arr[i]);
                        }
                    }
                    return ret;
                },
                even: function () {
                    let arr = arguments[0];
                    let ret = [];
                    for (let i = 0; i < arr.length; i++) {
                        if (i % 2 === 0) {
                            ret.push(arr[i]);
                        }
                    }
                    return ret;
                },
                range: function () {
                    let args = arguments;
                    let arr = args[0];
                    let ret = [];
                    let first = args[1];
                    let last = args[2];
                    if (isNaN(first)) {
                        throw new error_11.NError('paramException', nodom_11.Nodom.tipMessage.TipWords['filter'], 'filter range');
                    }
                    if (!util_20.Util.isNumber(first)) {
                        first = parseInt(first);
                    }
                    if (isNaN(last)) {
                        throw new error_11.NError('paramException', nodom_11.Nodom.tipMessage.TipWords['filter'], 'filter range');
                    }
                    if (!util_20.Util.isNumber(last)) {
                        last = parseInt(last);
                    }
                    if (first > last) {
                        throw new error_11.NError('paramException', nodom_11.Nodom.tipMessage.TipWords['filter'], 'filter range');
                    }
                    return arr.slice(first, last + 1);
                },
                index: function () {
                    let args = arguments;
                    let arr = args[0];
                    if (!util_20.Util.isArray(args[0])) {
                        throw new error_11.NError('paramException', nodom_11.Nodom.tipMessage.TipWords['filter'], 'filter index');
                    }
                    let ret = [];
                    if (arr.length > 0) {
                        for (let i = 1; i < args.length; i++) {
                            if (isNaN(args[i])) {
                                continue;
                            }
                            let k = parseInt(args[i]);
                            if (k < arr.length) {
                                ret.push(arr[k]);
                            }
                        }
                    }
                    return ret;
                },
                func: function (arr, param) {
                    if (!util_20.Util.isArray(arr) || util_20.Util.isEmpty(param)) {
                        throw new error_11.NError('paramException', nodom_11.Nodom.tipMessage.TipWords['filter'], 'filter func');
                    }
                    let foo = this.methodFactory.get(param);
                    if (util_20.Util.isFunction(foo)) {
                        return util_20.Util.apply(foo, this, [arr]);
                    }
                    return arr;
                },
                value: function (arr, param) {
                    if (!util_20.Util.isArray(arr) || util_20.Util.isEmpty(param)) {
                        throw new error_11.NError('paramException', nodom_11.Nodom.tipMessage.TipWords['filter'], 'filter value');
                    }
                    if (util_20.Util.isObject(param)) {
                        let keys = util_20.Util.getOwnProps(param);
                        return arr.filter(function (item) {
                            for (let i = 0; i < keys.length; i++) {
                                let v = item[keys[i]];
                                let v1 = param[keys[i]];
                                if (v === undefined || v !== v1 || typeof v === 'string' && v.indexOf(v1) === -1) {
                                    return false;
                                }
                            }
                            return true;
                        });
                    }
                    else {
                        return arr.filter(function (item) {
                            let props = util_20.Util.getOwnProps(item);
                            for (let i = 0; i < props.length; i++) {
                                let v = item[props[i]];
                                if (util_20.Util.isString(v) && v.indexOf(param) !== -1) {
                                    return item;
                                }
                            }
                        });
                    }
                }
            };
            let type;
            if (util_20.Util.isString(params[1])) {
                type = params[1].trim();
                if (handler.hasOwnProperty(type)) {
                    params.splice(1, 1);
                }
                else {
                    type = 'value';
                }
            }
            else {
                type = 'value';
            }
            if (type === 'range' || type === 'index' || type === 'func') {
                if (params.length < 2) {
                    throw new error_11.NError('paramException', nodom_11.Nodom.tipMessage.TipWords['filter']);
                }
            }
            return util_20.Util.apply(handler[type], this, params);
        });
    })(nodom || (nodom = {}));
});
define("locales/msg_en", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TipMessage_en = void 0;
    exports.TipMessage_en = {
        TipWords: {
            application: "Application",
            system: "System",
            module: "Module",
            moduleClass: 'ModuleClass',
            model: "Model",
            directive: "Directive",
            directiveType: "Directive-type",
            expression: "Expression",
            event: "Event",
            method: "Method",
            filter: "Filter",
            filterType: "Filter-type",
            data: "Data",
            dataItem: 'Data-item',
            route: 'Route',
            routeView: 'Route-container',
            plugin: 'Plugin',
            resource: 'Resource',
            root: 'Root',
            element: 'Element'
        },
        ErrorMsgs: {
            unknown: "unknown error",
            paramException: "{0} '{1}' parameter error，see api",
            invoke: "method {0} parameter {1} must be {2}",
            invoke1: "method {0} parameter {1} must be {2} or {3}",
            invoke2: "method {0} parameter {1} or {2} must be {3}",
            invoke3: "method {0} parameter {1} not allowed empty",
            exist: "{0} is already exist",
            exist1: "{0} '{1}' is already exist",
            notexist: "{0} is not exist",
            notexist1: "{0} '{1}' is not exist",
            notupd: "{0} not allow to change",
            notremove: "{0} not allow to delete",
            notremove1: "{0} {1} not allow to delete",
            namedinvalid: "{0} {1} name error，see name rules",
            initial: "{0} init parameter error",
            jsonparse: "JSON parse error",
            timeout: "request overtime",
            config: "{0} config parameter error",
            config1: "{0} config parameter '{1}' error"
        },
        FormMsgs: {
            type: "please input valid {0}",
            unknown: "input error",
            required: "is required",
            min: "min value is {0}",
            max: "max value is {0}"
        },
        WeekDays: {
            "0": "Sun",
            "1": "Mon",
            "2": "Tue",
            "3": "Wed",
            "4": "Thu",
            "5": "Fri",
            "6": "Sat"
        }
    };
});
define("locales/msg_zh", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TipMessage_zh = void 0;
    exports.TipMessage_zh = {
        TipWords: {
            application: "应用",
            system: "系统",
            module: "模块",
            moduleClass: '模块类',
            model: "模型",
            directive: "指令",
            directiveType: "指令类型",
            expression: "表达式",
            event: "事件",
            method: "方法",
            filter: "过滤器",
            filterType: "过滤器类型",
            data: "数据",
            dataItem: '数据项',
            route: '路由',
            routeView: '路由容器',
            plugin: '插件',
            resource: '资源',
            root: '根',
            element: '元素'
        },
        ErrorMsgs: {
            unknown: "未知错误",
            paramException: "{0}'{1}'方法参数错误，请参考api",
            invoke: "{0}方法调用参数{1}必须为{2}",
            invoke1: "{0}方法调用参数{1}必须为{2}或{3}",
            invoke2: "{0}方法调用参数{1}或{2}必须为{3}",
            invoke3: "{0}方法调用参数{1}不能为空",
            exist: "{0}已存在",
            exist1: "{0}'{1}'已存在",
            notexist: "{0}不存在",
            notexist1: "{0}'{1}'不存在",
            notupd: "{0}不可修改",
            notremove: "{0}不可删除",
            notremove1: "{0}{1}不可删除",
            namedinvalid: "{0}{1}命名错误，请参考用户手册对应命名规范",
            initial: "{0}初始化参数错误",
            jsonparse: "JSON解析错误",
            timeout: "请求超时",
            config: "{0}配置参数错误",
            config1: "{0}配置参数'{1}'错误"
        },
        FormMsgs: {
            type: "请输入有效的{0}",
            unknown: "输入错误",
            required: "不能为空",
            min: "最小输入值为{0}",
            max: "最大输入值为{0}"
        },
        WeekDays: {
            "0": "日",
            "1": "一",
            "2": "二",
            "3": "三",
            "4": "四",
            "5": "五",
            "6": "六"
        }
    };
});
//# sourceMappingURL=nodom.js.map