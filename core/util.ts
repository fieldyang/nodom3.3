import { NError } from "./error";
import { NodomMessage } from "./nodom";
import { Element } from "./element";

/**
 * 基础服务库
 * @since       1.0.0
 */
export class Util {
    private static generatedId: number = 1;
    //唯一主键
    public static genId() {
        return this.generatedId++;
    }

    /**
     * js 保留关键字
     */
    static keyWords = [
        'arguments','boolean','break','byte','catch','char','const','default','delete','do',
        'double','else','enum','eval','false','float','for','function','goto','if',
        'in','instanceof','int','let','long','new','null','return','short','switch',
        'this','throw','throws','true','try','typeof','var','void','while','with',
        'Array','Date','eval','function','hasOwnProperty','Infinity','isFinite','isNaN',
        'isPrototypeOf','length','Math','NaN','Number','Object','prototype','String','undefined','valueOf'
    ];

    /******对象相关******/

    /**
     * 对象复制
     * @param srcObj    源对象
     * @param expKey    不复制的键正则表达式或名
     * @param extra     clone附加参数
     * @returns         复制的对象
     */

    public static clone(srcObj: Object, expKey?: RegExp | string[], extra?: any): any {
        let me = this;
        let map: WeakMap<Object, any> = new WeakMap();
        // let map: Map<Object, any> = new Map();
        return clone(srcObj, expKey, extra);

        /**
         * clone对象
         * @param src   待clone对象
         * @param extra clone附加参数
         * @returns     克隆后的对象
         */
        function clone(src, expKey, extra?) {
            //非对象或函数，直接返回            
            if (!src || typeof src !== 'object' || Util.isFunction(src)) {
                return src;
            }
            let dst;
            //带有clone方法，则直接返回clone值
            if (src.clone && Util.isFunction(src.clone)) {
                return src.clone(extra);
            } else if (me.isObject(src)) {
                dst = new Object();
                //把对象加入map，如果后面有新克隆对象，则用新克隆对象进行覆盖
                map.set(src, dst);
                Object.getOwnPropertyNames(src).forEach((prop) => {
                    //不克隆的键
                    if (expKey) {
                        if (expKey.constructor === RegExp && (<RegExp>expKey).test(prop) //正则表达式匹配的键不复制
                            || Util.isArray(expKey) && (<any[]>expKey).includes(prop)                        //被排除的键不复制
                        ) {
                            return;
                        }
                    }
                    dst[prop] = getCloneObj(src[prop], expKey, extra);
                });
            } else if (me.isMap(src)) {
                dst = new Map();
                //把对象加入map，如果后面有新克隆对象，则用新克隆对象进行覆盖
                src.forEach((value, key) => {
                    //不克隆的键
                    if (expKey) {
                        if (expKey.constructor === RegExp && (<RegExp>expKey).test(key)       //正则表达式匹配的键不复制
                            || (<any[]>expKey).includes(key)) {     //被排除的键不复制
                            return;
                        }
                    }
                    dst.set(key, getCloneObj(value, expKey, extra));
                });
            } else if (me.isArray(src)) {
                dst = new Array();
                //把对象加入map，如果后面有新克隆对象，则用新克隆对象进行覆盖
                src.forEach(function (item, i) {
                    dst[i] = getCloneObj(item, expKey, extra);
                });
            }
            return dst;
        }

        /**
         * 获取clone对象
         * @param value     待clone值
         * @param expKey    排除键
         * @param extra     附加参数
         */
        function getCloneObj(value, expKey, extra) {
            if (typeof value === 'object' && !Util.isFunction(value)) {
                let co = null;
                if (!map.has(value)) {  //clone新对象
                    co = clone(value, expKey, extra);
                } else {                    //从map中获取对象
                    co = map.get(value);
                }
                return co;
            }
            return value;
        }
    }
    /**
     * 合并多个对象并返回
     * @param   参数数组
     * @returns 返回对象
     */
    public static merge(o1?: Object, o2?: Object, o3?: Object, o4?: Object, o5?: Object, o6?: Object) {
        let me = this;
        for (let i = 0; i < arguments.length; i++) {
            if (!this.isObject(arguments[i])) {
                throw new NError('invoke', 'Util.merge', i + '', 'object');
            }
        }
        let retObj = Object.assign.apply(null, arguments);
        subObj(retObj);
        return retObj;
        //处理子对象
        function subObj(obj) {
            for (let o in obj) {
                if (me.isObject(obj[o]) || me.isArray(obj[o])) { //对象或数组
                    retObj[o] = me.clone(retObj[o]);
                }
            }
        }
    }

    /**
     * 把obj2对象所有属性赋值给obj1
     */
    public static assign(obj1, obj2) {
        if (Object.assign) {
            Object.assign(obj1, obj2);
        } else {
            this.getOwnProps(obj2).forEach(function (p) {
                obj1[p] = obj2[p];
            });
        }
        return obj1;
    }

    /**
     * 获取对象自有属性
     */
    public static getOwnProps(obj): Array<string> {
        if (!obj) {
            return [];
        }
        return Object.getOwnPropertyNames(obj);
    }
    /**************对象判断相关************/
    /**
     * 是否为函数
     * @param foo   检查的对象
     * @returns     true/false
     */
    public static isFunction(foo): boolean {
        return foo !== undefined && foo !== null && foo.constructor === Function;
    }

    /**
     * 是否为数组
     * @param obj   检查的对象
     * @returns     true/false
     */
    public static isArray(obj): boolean {
        return Array.isArray(obj);
    }

    /**
     * 判断是否为map
     * @param obj 
     */
    public static isMap(obj): boolean {
        return obj !== null && obj !== undefined && obj.constructor === Map;
    }

    /**
     * 是否为对象
     * @param obj   检查的对象
     * @returns true/false
     */
    public static isObject(obj): boolean {
        return obj !== null && obj !== undefined && obj.constructor === Object;
    }

    /**
     * 判断是否为整数
     * @param v 检查的值
     * @returns true/false
     */
    public static isInt(v): boolean {
        return Number.isInteger(v);
    }
    /**
     * 判断是否为number
     * @param v 检查的值
     * @returns true/false
     */
    public static isNumber(v): boolean {
        return typeof v === 'number';
    }

    /**
     * 判断是否为boolean
     * @param v 检查的值
     * @returns true/false
     */
    public static isBoolean(v): boolean {
        return typeof v === 'boolean';
    }
    /**
     * 判断是否为字符串
     * @param v 检查的值
     * @returns true/false
     */
    public static isString(v): boolean {
        return typeof v === 'string';
    }

    /**
     * 是否为数字串
     * @param v 检查的值
     * @returns true/false
     */
    public static isNumberString(v): boolean {
        return /^\d+\.?\d*$/.test(v);
    }

    /**
     * 对象/字符串是否为空
     * @param obj   检查的对象
     * @returns     true/false
     */
    public static isEmpty(obj): boolean {
        if (obj === null || obj === undefined)
            return true;
        let tp = typeof obj;
        if (this.isObject(obj)) {
            let keys = Object.keys(obj);
            if (keys !== undefined) {
                return keys.length === 0;
            }
        } else if (tp === 'string') {
            return obj === '';
        }
        return false;
    }


    /***********************对象相关******************/

    /**
     * 找到符合符合属性值条件的对象（深度遍历）
     * @param obj       待查询对象
     * @param props     属性值对象
     * @param one       是否满足一个条件就可以，默认false
     */
    public static findObjByProps(obj: Object, props: Object, one: boolean): Array<Object> | Object {
        if (!this.isObject(obj)) {
            throw new NError('invoke', 'Util.findObjByProps', '0', 'Object');
        }

        //默认false
        one = one || false;
        let ps: Array<string> = this.getOwnProps(props);
        let find: boolean = false;
        if (one === false) {  //所有条件都满足
            find = true;
            for (let i = 0; i < ps.length; i++) {
                let p = ps[i];
                if (obj[p] !== props[p]) {
                    find = false;
                    break;
                }
            }
        } else {              //一个条件满足
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


        //子节点查找
        for (let p in obj) {
            let o = obj[p];
            if (o !== null) {
                if (this.isObject(o)) {      //子对象
                    //递归查找
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
                } else if (this.isArray(o)) { //数组对象
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

    /**********dom相关***********/
    /**
     * 获取dom节点
     * @param selector  选择器
     * @param findAll   是否获取所有，默认为false
     * @param pview     父html element
     * @returns         html element/null 或 nodelist或[]
     */
    public static get(selector: string, findAll?: boolean, pview?: HTMLElement | Document): Node | NodeList {
        pview = pview || document;
        if (findAll === true) {
            return pview.querySelectorAll(selector);
        }
        return pview.querySelector(selector);
    }

    /**
     * 是否为element
     * @param el    传入的对象
     * @returns     true/false
     */
    public static isEl(el: any): boolean {
        return el instanceof HTMLElement || el instanceof SVGElement;
    }

    /**
     * 是否为node
     * @param node 传入的对象
     * @returns true/false
     */
    public static isNode(node: any): boolean {
        return node !== undefined && node !== null && (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.DOCUMENT_FRAGMENT_NODE);
    }

    /**
     * 新建dom
     * @param tagName   标签名
     * @param config    属性集合
     * @param text      innerText
     * @returns         新建的elelment
     */
    public static newEl(tagName: string, config?: Object, text?: string): HTMLElement {
        if (!this.isString(tagName) || this.isEmpty(tagName)) {
            throw new NError('invoke', 'this.newEl', '0', 'string');
        }
        let el = document.createElement(tagName);

        if (this.isObject(config)) {
            this.attr(el, config);
        } else if (this.isString(text)) {
            el.innerHTML = text;
        }
        return el;
    }
    /**
     * 新建svg element
     * @param tagName   标签名
     * @returns         svg element
     */
    public static newSvgEl(tagName: string, config?: Object): SVGElement {
        let el: SVGElement = document.createElementNS("http://www.w3.org/2000/svg", tagName);
        if (this.isObject(config)) {
            this.attr(el, config);
        }
        return el;
    }
    /**
     * 把srcNode替换为nodes
     * @param srcNode       源dom
     * @param nodes         替换的dom或dom数组
     */
    public static replaceNode(srcNode: Node, nodes: Node | Array<Node>) {
        if (!this.isNode(srcNode)) {
            throw new NError('invoke', 'this.replaceNode', '0', 'Node');
        }

        if (!this.isNode(nodes) && !this.isArray(nodes)) {
            throw new NError('invoke1', 'this.replaceNode', '1', 'Node', 'Node Array');
        }
        let pnode: Node = srcNode.parentNode;
        let bnode: Node = srcNode.nextSibling;
        if (pnode === null) {
            return;
        }
        pnode.removeChild(srcNode);
        const nodeArr: Array<Node> = this.isArray(nodes) ? <Node[]>nodes : [<Node>nodes];
        nodeArr.forEach(function (node) {
            if (bnode === undefined || bnode === null) {
                pnode.appendChild(node);
            } else {
                pnode.insertBefore(node, bnode);
            }
        });
    }
    /**
     * 清空子节点
     * @param el
     */
    public static empty(el: HTMLElement) {
        const me = this;
        if (!me.isEl(el)) {
            throw new NError('invoke', 'this.empty', '0', 'Element');
        }
        let nodes: NodeList = el.childNodes;
        for (let i = nodes.length - 1; i >= 0; i--) {
            el.removeChild(nodes[i]);
        }
    }
    /**
     * 删除节点
     * @param node html node
     */
    public static remove(node: Node) {
        const me = this;
        if (!me.isNode(node)) {
            throw new NError('invoke', 'this.remove', '0', 'Node');
        }
        if (node.parentNode !== null) {
            node.parentNode.removeChild(node);
        }
    }


    /**
     * 获取／设置属性
     * @param el    element
     * @param param 属性名，设置多个属性时用对象
     * @param value 属性值，获取属性时不需要设置
     * @returns     属性值
     */
    public static attr(el, param: string | Object, value?: any): any {
        const me = this;
        if (!me.isEl(el)) {
            throw new NError('invoke', 'this.attr', '0', 'Element');
        }
        if (this.isEmpty(param)) {
            throw new NError('invoke', 'this.attr', '1', 'string', 'object');
        }
        if (value === undefined || value === null) {
            if (this.isObject(param)) { //设置多个属性
                this.getOwnProps(param).forEach(function (k) {
                    if (k === 'value') {
                        el[k] = param[k];
                    } else {
                        el.setAttribute(k, param[k]);
                    }
                });
            } else if (this.isString(param)) { //获取属性
                if (param === 'value') {
                    return param[value];
                }
                return el.getAttribute(<string>param);
            }
        } else { //设置属性
            if (param === 'value') {
                el[<string>param] = value;
            } else {
                el.setAttribute(<string>param, value);
            }
        }
    }


    /******日期相关******/
    /**
     * 日期格式化
     * @param srcDate   时间戳串
     * @param format    日期格式
     * @returns          日期串
     */
    public static formatDate(srcDate: string | number, format: string): string {
        //时间戳
        let timeStamp: number;
        if (this.isString(srcDate)) {
            //排除日期格式串,只处理时间戳
            let reg = /^\d+$/;
            if (reg.test(<string>srcDate) === true) {
                timeStamp = parseInt(<string>srcDate);
            }
        } else if (this.isNumber(srcDate)) {
            timeStamp = <number>srcDate;
        } else {
            throw new NError('invoke', 'this.formatDate', '0', 'date string', 'date');
        }
        //得到日期
        let date: Date = new Date(timeStamp);
        // invalid date
        if (isNaN(date.getDay())) {
            return '';
        }

        let o = {
            "M+": date.getMonth() + 1, //月份
            "d+": date.getDate(), //日
            "h+": date.getHours() % 12 === 0 ? 12 : date.getHours() % 12, //小时
            "H+": date.getHours(), //小时
            "m+": date.getMinutes(), //分
            "s+": date.getSeconds(), //秒
            "q+": Math.floor((date.getMonth() + 3) / 3), //季度
            "S": date.getMilliseconds() //毫秒
        };

        //年
        if (/(y+)/.test(format)) {
            format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        }
        //月日
        this.getOwnProps(o).forEach(function (k) {
            if (new RegExp("(" + k + ")").test(format)) {
                format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            }
        });

        //星期
        if (/(E+)/.test(format)) {
            format = format.replace(RegExp.$1, ((RegExp.$1.length > 1) ? (RegExp.$1.length > 2 ? "/u661f/u671f" : "/u5468") : "") + NodomMessage.WeekDays[date.getDay() + ""]);
        }
        return format;
    }

    /******字符串相关*****/
    /**
     * 编译字符串，把{n}替换成带入值
     * @param str 待编译的字符串
     * @param args1,args2,args3,... 待替换的参数
     * @returns 转换后的消息
     */
    public static compileStr(src: string, p1?: any, p2?: any, p3?: any, p4?: any, p5?: any): string {
        let reg: RegExp;
        let args = arguments;
        let index = 0;
        for (; ;) {
            if (src.indexOf('\{' + index + '\}') !== -1) {
                reg = new RegExp('\\{' + index + '\\}', 'g');
                src = src.replace(reg, args[index + 1]);
                index++;
            } else {
                break;
            }
        }
        return src;
    }

    /**
     * 函数调用
     * @param foo   函数
     * @param obj   this指向
     * @param args  参数数组
     */
    public static apply(foo: Function, obj: any, args?: Array<any>): any {
        if (!foo) {
            return;
        }
        return Reflect.apply(foo, obj || null, args);
    }

    /**
     * 合并并修正路径，即路径中出现'//','///','\/'的情况，统一置换为'/'
     * @param paths 待合并路径数组
     * @returns     返回路径
     */
    public static mergePath(paths: string[]): string {
        return paths.join('/').replace(/(\/{2,})|\\\//g, '\/');
    }

    /**
     * eval
     * @param evalStr   eval串
     * @returns         eval值
     */
    public static eval(evalStr: string): any {
        return new Function(`return(${evalStr})`)();
    }

    /**
     * 
     * @param vDom element元素
     * @param module 模块   
     * @param parent 父element  
     * @param parentEl 父真实dom
     * @returns 新建一个dom元素
     */
     public static newEls(vDom,module,parent,parentEl){
        let el1;
        if (vDom.tagName) {
            el1 = newEl(vDom,parent,parentEl);
            genSub(el1, vDom);
        } else {
            el1 = newText(vDom.textContent);
        }
        return el1;
            /**
         * 新建element节点
         * @param vdom 		虚拟dom
         * @param parent 	父虚拟dom
         * @param parentEl 	父element
         * @returns 		新的html element
         */
        function newEl(vdom: Element, parent: Element, parentEl?: Node): any {
        //创建element
            let el;
            if (vdom.getTmpParam('isSvgNode')) {  //如果为svg node，则创建svg element
                el = Util.newSvgEl(vdom.tagName);
            } else {
                el = Util.newEl(vdom.tagName);
            }
            //设置属性
            Util.getOwnProps(vdom.props).forEach((k) => {
                if (typeof vdom.props[k] != 'function')
                    el.setAttribute(k, vdom.props[k]);
            });

            el.setAttribute('key', vdom.key);
            vdom.handleNEvents(module, el, parent, parentEl);
            vdom.handleAssets(el);
            return el;
        }

        /**
         * 新建文本节点
         */
        function newText(text: string | HTMLElement | DocumentFragment, dom?: Element): any {
            if (!text) {
                text = '';
                dom = null;
            }
            return document.createTextNode(<string>text);
        }

        /**
         * 生成子节点
         * @param pEl 	父节点
         * @param vNode 虚拟dom父节点	
         */
        function genSub(pEl: Node, vNode: Element) {
            if (vNode.children && vNode.children.length > 0) {
                vNode.children.forEach((item) => {
                    let el1;
                    if (item.tagName) {
                        el1 = newEl(item, vNode, pEl);
                        genSub(el1, item);
                    } else {
                        el1 = newText(item.textContent, item);
                    }
                    pEl.appendChild(el1);
                });
            }
        }
    }
}
