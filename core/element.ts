import { Directive } from "./directive";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { Model } from "./model";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { ChangedDom } from "./types";
import { Util } from "./util";

/**
 * 虚拟dom
 */
export class Element {
    /**
     * key，整颗虚拟dom树唯一
     */
    public key: string;

    /**
     * 绑定模型
     */
    public model: Model;

    /**
     * element为textnode时有效
     */
    public textContent: string | HTMLElement;

    /**
     * 指令集
     */
    public directives: Array<Directive> = [];

    /**
     * 直接属性 不是来自于attribute，而是直接作用于html element，如el.checked,el.value等
     */
    public assets: Map<string, any> = new Map();

    /**
     * 静态属性(attribute)集合
     * {prop1:value1,...}
     */
    public props: Object = {};

    /**
     * 含表达式的属性集合
     * {prop1:value1,...}
     */
    public exprProps: Object = {};

    /**
     * 事件集合,{eventName1:nodomNEvent1,...}
     * 一个事件名，可以绑定多个事件方法对象
     */
    public events: Map<string, NEvent | NEvent[]> = new Map();

    /**
     * 表达式+字符串数组，用于textnode
     */
    public expressions: Array<Expression | string> = [];

    /**
     * 子element
     */
    public children: Array<Element> = [];

    /**
     * 父虚拟dom
     */
    public parent: Element;

    /**
     * 元素名，如div
     */
    public tagName: string;

    /**
     * 不渲染标志，单次渲染有效
     */
    public dontRender: boolean = false;

    /**
     * 模块外部数据集，d- 开头的属性，用于从父、兄和子模块获取数据，该element为模块容器时有效，
     */
    public moduleDatas = {};

    /**
     * 渲染前（获取model后）执行方法集合,可以是方法名（在module的methods中定义），也可以是函数
     * 函数的this指向element的model，参数为(element,module)
     */
    private beforeRenderOps: any[] = [];

    /**
     * 渲染后（renderToHtml前）执行方法集合，可以是方法名（在module的methods中定义），也可以是函数
     * 函数的this指向element的model，参数为(element,module)
     */
    private afterRenderOps: any[] = [];

    /**
     * 临时参数 map
     */
    private tmpParamMap: Map<string, any> = new Map();

    /**
     * @param tag 标签名
     */
    constructor(tag?: string) {
        this.tagName = tag; //标签
        //检查是否为svg
        if (tag && tag.toLowerCase() === 'svg') {
            this.setTmpParam('isSvgNode', true);
        }
        //key
        this.key = Util.genId() + '';
    }

    /**
     * 渲染到virtualdom树
     * @param module 	模块
     * @param parent 	父节点
     * @returns         渲染成功（dontRender=false） true,否则false
     */
    public render(module: Module, parent?: Element): Boolean {
        if (this.dontRender) {
            this.doDontRender(parent);
            return false;
        }

        // 设置父对象
        if (parent) {
            // 设置modelId
            if (!this.model) {
                this.model = parent.model;
            }
            this.parent = parent;
        }
        //设置model为模块model
        if (!this.model) {
            this.model = module.model;
        }
        //先执行model指令
        if(this.hasDirective('model')){
            let d = this.getDirective('model');
            d.exec(module, this, this.parent);
        }
        //前置方法集合执行
        this.doRenderOp(module, 'before');

        if (this.tagName !== undefined) { //element
            if (!this.handleDirectives(module)) {
                this.doDontRender(parent);
                return false;
            }
            this.handleProps(module);
            
        } else { //textContent
            this.handleTextContent(module);
        }

        //子节点渲染，子模块不渲染
        if (!this.hasDirective('module')) {
            for (let i = 0; i < this.children.length; i++) {
                let item = this.children[i];
                if (!item.render(module, this)) {
                    item.doDontRender(this);
                    i--;
                }
            }
        }
        //后置方法集执行
        this.doRenderOp(module, 'after');
        return true;
    }

    /**
     * 渲染到html element
     * @param module 	模块
     * @param params 	配置对象{}
     *          type 		类型
     *          parent 	父虚拟dom
     */
    public renderToHtml(module: Module, params: ChangedDom) {
        let el: HTMLElement;
        let el1: Node;
        let type = params.type;
        let parent = params.parent;
        //重置dontRender
        //构建el
        if (type === 'fresh' || type === 'add' || type === 'text') {
            if (parent) {
                el = module.getNode(parent.key);
            } else {
                el = module.getContainer();
                // console.log(el);
            }
        } else if (this.tagName !== undefined) { //element节点才可以查找
            el = module.getNode(this.key);
            this.handleAssets(el);
        }

        if (!el) {
            return;
        }

        switch (type) {
            case 'fresh': //首次渲染
                if (this.tagName) {
                    el1 = newEl(this, null, el);
                    //首次渲染需要生成子孙节点
                    genSub(el1, this);
                } else {
                    el1 = newText(<string>this.textContent);
                }
                el.appendChild(el1);

                break;
            case 'text': //文本更改
                if (!parent || !parent.children) {
                    break;
                }
                let indexArr = [];
                parent.children.forEach(v => [
                    indexArr.push(v.key)
                ])
                let ind = indexArr.indexOf(this.key);
                if (ind !== -1) {
                    el.childNodes[ind].textContent = <string>this.textContent;
                }
                break;
            case 'upd': //修改属性
                //删除属性
                if (params.removeProps) {
                    params.removeProps.forEach((p) => {
                        el.removeAttribute(p);
                    });
                }
                //修改属性
                if (params.changeProps) {
                    params.changeProps.forEach((p) => {
                        el.setAttribute(p['k'], p['v']);
                    });
                }

                //修改直接绑定el上的属性（不是attribute）
                if (params.changeAssets) {
                    params.changeAssets.forEach((p) => {
                        el[p['k']] = p['v'];
                    });
                }
                break;
            case 'rep': //替换节点
                el1 = newEl(this, parent);
                Util.replaceNode(el, el1);
                break;
            case 'add': //添加
                if (this.tagName) {
                    el1 = newEl(this, parent, el);
                    genSub(el1, this);
                } else {
                    el1 = newText(this.textContent);
                }
                if (params.index === el.childNodes.length) {
                    el.appendChild(el1);
                } else {
                    el.insertBefore(el1, el.childNodes[params.index]);
                }
        }

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
        function newText(text: string | HTMLElement | DocumentFragment): any {
            return document.createTextNode(<string>text || '');
           
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
                        el1 = newText(item.textContent);
                    }
                    pEl.appendChild(el1);
                });
            }
        }
    }

    /**
     * 克隆
     * changeKey    是否更改key，主要用于创建时克隆，渲染时克隆不允许修改key
     */
    public clone(changeKey?: boolean): Element {
        let dst: Element = new Element();
        //不直接拷贝的属性
        let notCopyProps: string[] = ['parent', 'directives', 'defineEl', 'children', 'model'];
        //简单属性
        Util.getOwnProps(this).forEach((p) => {
            if (notCopyProps.includes(p)) {
                return;
            }
            if (typeof this[p] === 'object') {
                dst[p] = Util.clone(this[p]);
            } else {
                dst[p] = this[p];
            }
        });

        //表示clone后进行新建节点
        if (changeKey) {
            dst.key = Util.genId() + '';
        }

        //指令复制
        for (let d of this.directives) {
            dst.directives.push(d.clone(dst));
        }
        //孩子节点
        for (let c of this.children) {
            dst.add(c.clone(changeKey));
        }
        
        return dst;
    }

    /**
     * 处理指令
     * @param module    模块
     */
    public handleDirectives(module: Module) {
        for (let d of this.directives.values()) {
            //model指令已经执行，不再执行
            if(d.type.name === 'model'){
                continue;
            }
            if(d.expression){
                d.value = d.expression.val(this.model);
            }
            d.exec(module, this, this.parent);
            //指令可能改变render标志
            if (this.dontRender) {
                return false;
            }
        }
        return true;
    }

    /**
     * 表达式处理，添加到expression计算队列
     * @param exprArr   表达式或字符串数组
     * @param module    模块
     */
    public handleExpression(exprArr: Array<Expression | string>, module: Module) {
        let model: Model = this.model;
        let value = '';
        if (exprArr.length === 1 && typeof exprArr[0] !== 'string') {
            let v1 = exprArr[0].val(model);
            return v1 !== undefined ? v1 : '';
        }
        exprArr.forEach((v) => {
            if (v instanceof Expression) { //处理表达式
                let v1 = v.val(model);
                value += v1 !== undefined ? v1 : '';
            } else {
                value += v;
            }
        });
        return value;
    }

    /**
      * 处理属性（带表达式）
      * @param module    模块
      */
    public handleProps(module: Module) {
        for (let k of Util.getOwnProps(this.exprProps)) {
            //属性值为数组，则为表达式
            if (Util.isArray(this.exprProps[k])) {
                let pv = this.handleExpression(this.exprProps[k], module);
                if (k === 'style') {
                    this.addStyle(pv);
                } else {
                    this.props[k] = pv;
                }
            } else if (this.exprProps[k] instanceof Expression) { //单个表达式
                if (k === 'style') {
                    this.addStyle(this.exprProps[k].val(this.model))
                } else {
                    // console.log('prop is',k,this.exprProps[k].execFunc);
                    this.props[k] = this.exprProps[k].val(this.model);
                }
            }
        }
    }

    /**
     * 处理asset，在渲染到html时执行
     * @param el    dom对应的html element
     */
    public handleAssets(el: HTMLElement | SVGElement) {
        if (!this.tagName || !el) {
            return;
        }

        for (let key of this.assets) {
            el[key[0]] = key[1];
        }
    }

    /**
     * 处理文本（表达式）
     * @param module    模块
     */
    public handleTextContent(module) {
        if (this.expressions !== undefined && this.expressions.length > 0) {
            this.textContent = this.handleExpression(this.expressions, module) || '';
        }
    }

    /**
     * 处理事件
     * @param module    模块
     * @param el        html element
     * @param parent    父virtual dom
     * @param parentEl  父html element
     */
    public handleNEvents(module: Module, el: Node, parent: Element, parentEl?: Node) {
        if (this.events.size === 0) {
            return;
        }
        for (let evt of this.events.values()) {
            if (Util.isArray(evt)) {
                for (let evo of <NEvent[]>evt) {
                    evo.bind(module, this, <HTMLElement>el, parent, parentEl);
                }
            } else {
                (<NEvent>evt).bind(module, this, <HTMLElement>el, parent, parentEl);
            }
        }
    }

    /**
     * 移除指令
     * @param directives 	待删除的指令类型数组或指令类型
     */
    public removeDirectives(directives: string | string[]) {
        if (typeof directives === 'string') {
            let ind;
            if ((ind = this.directives.findIndex(item => item.type.name === directives)) !== -1) {
                this.directives.splice(ind, 1);
            }
            return;
        }
        for (let d of directives) {
            let ind;
            if ((ind = this.directives.findIndex(item => item.type.name === d)) !== -1) {
                this.directives.splice(ind, 1);
            }
        }
    }

    /**
     * 添加指令
     * @param directive     指令对象
     * @param sort          是否排序
     */
    public addDirective(directive: Directive, sort?: boolean) {
        let finded: boolean = false;
        for (let i = 0; i < this.directives.length; i++) {
            //如果存在相同类型，则直接替换
            if (this.directives[i].type === directive.type) {
                this.directives[i] = directive;
                finded = true;
                break;
            }
        }
        if (!finded) {
            this.directives.push(directive);
        }

        //指令按优先级排序
        if (sort) {
            if (this.directives.length > 1) {
                this.directives.sort((a, b) => {
                    return a.type.prio - b.type.prio;
                });
            }
        }
    }

    /**
     * 是否有某个类型的指令
     * @param directiveType 	指令类型名
     * @return true/false
     */
    public hasDirective(directiveType): boolean {
        return this.directives.findIndex(item => item.type.name === directiveType) !== -1;
    }

    /**
     * 获取某个类型的指令
     * @param directiveType 	指令类型名
     * @return directive
     */
    public getDirective(directiveType): Directive {
        return this.directives.find(item => item.type.name === directiveType);
    }

    /**
     * 添加子节点
     * @param dom 	子节点
     */
    public add(dom: Element | Array<Element>) {
        if (Array.isArray(dom)) {
            dom.forEach(v => {
                //将parent也附加上，增量渲染需要
                v.parent = this;
            });
            this.children.push(...dom);
        } else {
            this.children.push(dom);
            dom.parent = this;
        }
    }

    /**
     * 移除子节点
     * @param dom   子dom
     */
    public removeChild(dom: Element) {
        let ind: number;
        // 移除
        if (Util.isArray(this.children) && (ind = this.children.indexOf(dom)) !== -1) {
            this.children.splice(ind, 1);
        }
    }

    /**
     * 替换目标节点
     * @param dst 	目标节点　
     */
    public replace(dst: Element) {
        if (!dst.parent) {
            return false;
        }
        let ind = dst.parent.children.indexOf(dst);
        if (ind === -1) {
            return false;
        }
        //替换
        dst.parent.children.splice(ind, 1, this);
        return true;
    }

    /**
     * 是否包含节点
     * @param dom 	包含的节点 
     */
    public contains(dom: Element) {
        for (; dom !== undefined && dom !== this; dom = dom.parent);
        return dom !== undefined;
    }

    /**
     * 是否存在某个class
     * @param cls   classname
     * @return      true/false
     */
    public hasClass(cls: string): boolean {
        let clazz = this.props['class'];
        if (!clazz) {
            return false;
        } else {
            return clazz.trim().split(/\s+/).includes(cls);
        }
    }

    /**
     * 添加css class
     * @param cls class名
     */
    public addClass(cls: string) {
        let clazz = this.props['class'];
        if (!clazz) {
            this.props['class'] = cls;
        } else {
            let sa: any[] = clazz.trim().split(/\s+/);
            if (!sa.includes(cls)) {
                sa.push(cls);
                clazz = sa.join(' ');
                this.props['class'] = clazz;
            }
        }
    }

    /**
     * 删除css class
     * @param cls class名
     */
    public removeClass(cls: string) {
        let clazz = this.props['class'];
        if (!clazz) {
            return;
        } else {
            let sa: string[] = clazz.trim().split(/\s+/);
            let index;
            if ((index = sa.indexOf(cls)) !== -1) {
                sa.splice(index, 1);
                clazz = sa.join(' ');
            }
        }
        this.props['class'] = clazz;
    }
    /**
         * 查询style
         * @param styStr style字符串
         */
    public hasStyle(styStr: string) {
        let styleStr = this.props['style'];
        if (!styleStr) {
            return false;
        } else {
            return styleStr.trim().split(/;\s+/).includes(styStr);
        }
    }

    /**
     * 添加style
     *  @param styStr style字符串
     */
    public addStyle(styStr: string) {
        let styleStr = this.props['style'];
        if (!styleStr) {
            this.props['style'] = styStr;
        } else {
            let sa: any[] = styleStr.trim().split(/;\s+/);
            if (!sa.includes(styStr)) {
                sa.push(styStr);
                styleStr = sa.join(';');
                this.props['style'] = styleStr;
            }
        }
    }

    /**
     * 删除style
     * @param styStr style字符串
     */
    public removeStyle(styStr: string) {
        let styleStr = this.props['style'];
        if (!styleStr) {
            return;
        } else {
            let sa: string[] = styleStr.trim().split(/;\s+/);
            let index;
            if ((index = sa.indexOf(styStr)) !== -1) {
                sa.splice(index, 1);
                styleStr = sa.join(';');
            }
        }
        this.props['style'] = styleStr;
    }
    /**
     * 是否拥有属性
     * @param propName  属性名
     */
    public hasProp(propName: string) {
        return this.props.hasOwnProperty(propName) || this.exprProps.hasOwnProperty(propName);
    }

    /**
     * 获取属性值
     * @param propName  属性名
     */
    public getProp(propName: string, isExpr?: boolean) {
        if (isExpr) {
            return this.exprProps[propName];
        } else {
            return this.props[propName];
        }
    }

    /**
     * 设置属性值
     * @param propName  属性名
     * @param v         属性值
     * @param isExpr    是否是表达式属性 默认false  
     */
    public setProp(propName: string, v: any, isExpr?: boolean) {
        if (isExpr) {
            this.exprProps[propName] = v;
        } else {
            this.props[propName] = v;
        }
    }

    /**
     * 删除属性
     * @param props     属性名或属性名数组 
     */
    public delProp(props: string | string[]) {
        if (Util.isArray(props)) {
            for (let p of <string[]>props) {
                delete this.exprProps[p];
            }
            for (let p of <string[]>props) {
                delete this.props[p];
            }
        } else {
            delete this.exprProps[<string>props];
            delete this.props[<string>props];
        }
    }

    /**
     * 设置asset
     * @param assetName     asset name
     * @param value         asset value
     */
    public setAsset(assetName: string, value: any) {
        this.assets.set(assetName, value);
    }

    /**
     * 删除asset
     * @param assetName     asset name
     */
    public delAsset(assetName: string) {
        this.assets.delete(assetName);
    }

    /**
     * 查找子孙节点
     * @param key 	element key
     * @returns		虚拟dom/undefined
     */
    public query(key: string | Object) {
        //defineEl
        if (typeof key === 'object' && key != null) {
            let res: boolean = true;
            for (const [attr, value] of Object.entries(key)) {
                if (attr !== 'type' && (this.getProp(attr.toLocaleLowerCase()) || this[attr]) != value) {
                    res = false;
                    break;
                }
            };
            if (res) {
                return this;
            }
        } else {
            if (this.key === key) return this;
        }

        for (let i = 0; i < this.children.length; i++) {
            let dom = this.children[i].query(key);
            if (dom) {
                return dom;
            }
        }
    }

    /**
     * 比较节点
     * @param dst 	待比较节点
     * @returns	{type:类型 text/rep/add/upd,node:节点,parent:父节点, 
     * 			changeProps:改变属性,[{k:prop1,v:value1},...],removeProps:删除属性,[prop1,prop2,...],changeAssets:改变的asset}
     */
    public compare(dst: Element, retArr: Array<ChangedDom>, deleteMap?: Map<string, Array<any>>, parentNode?: Element) {
        if (!dst) {
            return;
        }
        let re: ChangedDom = new ChangedDom();
        let change: boolean = false;
        if (this.tagName === undefined) { //文本节点
            if (dst.tagName === undefined) {
                if (this.textContent !== dst.textContent) {
                    re.type = 'text';
                    change = true;
                }
            } else { //节点类型不同
                addDelKey(this, 'rep');
            }
        } else { //element节点
            if (this.tagName !== dst.tagName) { //节点类型不同
                addDelKey(this, 'rep');
            } else { //节点类型相同，可能属性不同
                //检查属性，如果不同则放到changeProps
                re.changeProps = [];
                re.changeAssets = [];
                //待删除属性
                re.removeProps = [];

                //删除或增加的属性
                Util.getOwnProps(dst.props).forEach((k) => {
                    if (!this.hasProp(k)) {
                        re.removeProps.push(k);
                    }
                });

                //修改后的属性
                Util.getOwnProps(this.props).forEach((k) => {
                    let v1 = dst.props[k];
                    if (this.props[k] !== v1) {
                        re.changeProps.push({ k: k, v: this.props[k] });
                    }
                });
                //修改后的asset
                for (let kv of this.assets) {
                    let v1 = dst.assets.get(kv[0]);
                    if (kv[0] !== v1) {
                        re.changeAssets.push({ k: kv[0], v: kv[1] });
                    }
                }

                // props assets 改变或删除，加入渲染
                if (re.changeProps.length > 0 || re.changeAssets.length > 0 || re.removeProps.length > 0) {
                    change = true;
                    re.type = 'upd';
                }
            }
        }
        //改变则加入数据
        if (change) {
            re.node = this;
            if (parentNode) {
                re.parent = parentNode;
            }
            retArr.push(re);
        }

        //子节点处理
        if (!this.children || this.children.length === 0) {
            // 旧节点的子节点全部删除
            if (dst.children && dst.children.length > 0) {
                dst.children.forEach(item => addDelKey(item));
            }
        } else {
            //全部新加节点
            if (!dst.children || dst.children.length === 0) {
                this.children.forEach(item => retArr.push(new ChangedDom(item, 'add', this)));
            } else { //都有子节点
                //子节点对比策略
                let [oldStartIdx, oldStartNode, oldEndIdx, oldEndNode] = [0, dst.children[0], dst.children.length - 1, dst.children[dst.children.length - 1]];
                let [newStartIdx, newStartNode, newEndIdx, newEndNode] = [0, this.children[0], this.children.length - 1, this.children[this.children.length - 1]];
                let [newMap, newKeyMap] = [new Map(), new Map()];
                while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                    if (sameKey(oldStartNode, newStartNode)) {
                        newStartNode.compare(oldStartNode, retArr, deleteMap, this);
                        newStartNode = this.children[++newStartIdx];
                        oldStartNode = dst.children[++oldStartIdx];
                    } else if (sameKey(oldEndNode, newEndNode)) {
                        newEndNode.compare(oldEndNode, retArr, deleteMap, this);
                        newEndNode = this.children[--newEndIdx];
                        oldEndNode = dst.children[--oldEndIdx];
                    } else if (sameKey(newStartNode, oldEndNode)) {
                        newStartNode.compare(oldEndNode, retArr, deleteMap, this);
                        newStartNode = this.children[++newStartIdx];
                        oldEndNode = dst.children[--oldEndIdx];
                    } else if (sameKey(newEndNode, oldStartNode)) {
                        newEndNode.compare(oldStartNode, retArr, deleteMap, this);
                        newEndNode = this.children[--newEndIdx];
                        oldStartNode = dst.children[++oldStartIdx];
                    } else {
                        newMap.set(newStartIdx, newStartNode);
                        newKeyMap.set(newStartNode.key, newStartIdx);
                        newStartNode = this.children[++newStartIdx];
                    }
                }
                if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
                    if (newStartIdx <= newEndIdx) {//新增节点
                        for (let i = newStartIdx; i <= newEndIdx; i++)  retArr.push(new ChangedDom(this.children[i], 'add', this, i));
                    } else {//有老节点
                        for (let i = oldStartIdx; i <= oldEndIdx; i++) {
                            let oldKey = dst.children[i].key;
                            if (newKeyMap.has(oldKey)) {
                                newMap.get(newKeyMap.get(oldKey)).compare(dst.children[i], retArr, deleteMap, this);
                                newMap.delete(newKeyMap.get(oldKey));
                                newKeyMap.delete(oldKey);
                            }
                            else {
                                addDelKey(dst.children[i]);
                            }
                        };
                    }
                }
                if (newMap.size) {
                    newMap.forEach((v, k) => {
                        retArr.push(new ChangedDom(v, 'add', this, k));
                    });
                }
            }
        }
        function sameKey(newElement, oldElement) {
            return newElement.key === oldElement.key;
        }
        //添加刪除替換的key
        function addDelKey(element: Element, type?: string) {
            let pKey: string = element.parent.key;
            if (!deleteMap.has(pKey)) {
                deleteMap.set(pKey, new Array());
            }
            deleteMap.get(pKey).push(type == 'rep' ? element.parent.children.indexOf(element) + '|' + this.key : element.parent.children.indexOf(element));
        }

    }

    /**
     * 添加事件
     * @param event         事件对象
     */
    public addEvent(event: NEvent) {
        //如果已经存在，则改为event数组，即同名event可以多个执行方法
        if (this.events.has(event.name)) {
            let ev = this.events.get(event.name);
            let evs: NEvent[];
            if (Util.isArray(ev)) {
                evs = <NEvent[]>ev;
            } else {
                evs = [<NEvent>ev];
            }
            evs.push(event);
            this.events.set(event.name, evs);
        } else {
            this.events.set(event.name, event);
        }
    }

    /**
     * 获取事件
     * @param eventName     事件名
     * @returns             事件对象或事件对象数组
     */
    public getEvent(eventName:string){
        return this.events.get(eventName);
    }
    /**
     * 执行不渲染关联操作
     * 关联操作，包括:
     *  1 节点(子节点)含有module指令，需要unactive
     */
    public doDontRender(parent?:Element) {
        //对于模块容器，对应module需unactive
        if (this.hasDirective('module')) {
            let d: Directive = this.getDirective('module');
            if (d.extra && d.extra.moduleId) {
                let mdl: Module = ModuleFactory.get(d.extra.moduleId);
                if (mdl) {
                    mdl.unactive();
                }
            }
        }
        
        //子节点递归
        for (let c of this.children) {
            c.doDontRender(this);
        }

        //从虚拟dom树中移除
        if(parent){
            parent.removeChild(this);
        }
    }

    /**
     * 设置临时参数
     * @param key       参数名
     * @param value     参数值
     */
    setTmpParam(key: string, value: any) {
        this.tmpParamMap.set(key, value);
    }

    /**
     * 获取临时参数
     * @param key       参数名
     * @returns         参数值
     */
    getTmpParam(key: string): any {
        return this.tmpParamMap.get(key);
    }

    /**
     * 删除临时参数
     * @param key       参数名
     */
    removeTmpParam(key: string) {
        this.tmpParamMap.delete(key);
    }


    /**
     * 是否有临时参数
     * @param key       参数名
     */
    hasTmpParam(key: string) {
        return this.tmpParamMap.has(key);
    }

    /**
     * 添加渲染附加操作
     * @param method    方法名 
     * @param type      类型 before,after
     */
    addRenderOp(method: any, type: string) {
        if (type === 'before') {
            this.beforeRenderOps.push(method);
        } else {
            this.afterRenderOps.push(method);
        }
    }

    /**
     * 执行渲染附加操作
     * @param module    模块
     * @param type      类型 before,after
     */
    doRenderOp(module: Module, type: string) {
        // 否则执行注册在element上的前置渲染方法
        let arr = type === 'before' ? this.beforeRenderOps : this.afterRenderOps;
        for (let m of arr) {
            //可能是字符串
            if (typeof m === 'string') {
                m = module.getMethod(m);
            }
            if (m) {
                m.apply(this.model, [this, module]);
            }
        }
    }
}