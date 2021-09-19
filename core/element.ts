import { Directive } from "./directive";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { Model } from "./model";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
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
    public events: Map<string, NEvent[]> = new Map();

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
     * @param tag   标签名
     * @param key   key
     */
    constructor(tag?: string, key?: string) {
        this.tagName = tag; //标签
        if(key){
            this.key = key;
        }
    }

    /**
     * 渲染到virtualdom树
     * @param module 	模块
     * @param parent 	父节点
     * @returns         渲染成功（dontRender=false） true,否则false
     */
    public render(module: Module, parent?: Element): Boolean {
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
        if (this.hasDirective('model')) {
            let d = this.getDirective('model');
            d.exec();
        }
        
        if (this.tagName) { //element
            if (!this.handleDirectives(module)) {
                this.doDontRender(parent);
                return false;
            }
            this.handleProps(module);
        } else { //textContent
            this.handleTextContent(module);
        }

        //子节点渲染，子模块不渲染
        for (let i = 0; i < this.children.length; i++) {
            let item = this.children[i];
            if(!item.render(module, this)) {
                item.doDontRender(this);
                i--;
            }
        }
        return true;
    }

    /**
     * 渲染到html element
     * @param module 	模块
     * @param params 	配置对象{}
     *          type 		类型
     *          parent 	父虚拟dom
     */
    public renderToHtml(module: Module, parentEl: HTMLElement, isRenderChild?: boolean) {
        let el = module.getNode(this.key);
        if(el){   //html dom节点已存在
            if(this.tagName){
                //设置属性
                Util.getOwnProps(this.props).forEach((k) => {
                    if (typeof this.props[k] !== 'function'){
                        (<HTMLElement>el).setAttribute(k, this.props[k]);
                    }
                });
                this.handleAssets((<HTMLElement>el));
            }else{  //文本节点
                (<any>el).textContent = this.textContent;
            }
        }else{
            if(this.tagName){
                el = newEl(this,parentEl);
            }else{
                el = newText(this);
            }
            if(isRenderChild){
                genSub(el, this);
            }
            return el;
        }

        /**
         * 新建element节点
         * @param vdom 		虚拟dom
         * @param pEl 	    父element
         * @returns 		新的html element
         */
        function newEl(vdom: Element, pEl: Node): any {
            //创建element
            let el= Util.newEl(vdom.tagName);
            //设置属性
            Util.getOwnProps(vdom.props).forEach((k) => {
                if (typeof vdom.props[k] != 'function'){
                    el.setAttribute(k, vdom.props[k]);
                }
            });
            //如果存储node，则不需要key
            el.setAttribute('key', vdom.key);
            //把el引用与key关系存放到cache中
            module.setNode(vdom.key, el);
            vdom.handleAssets(el);
            vdom.handleEvents(module, pEl);
            return el;
        }

        /**
         * 新建文本节点
         */
        function newText(dom: Element): any {
            let node = document.createTextNode(<string>dom.textContent || '');
            module.setNode(dom.key, node);
            return node;
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
                        el1 = newEl(item, pEl);
                        genSub(el1, item);
                    } else {
                        el1 = newText(item);
                    }
                    pEl.appendChild(el1);
                });
            }
        }
    }

    /**
     * 克隆
     */
    public clone(): Element {
        let dst: Element = new Element();
        //不直接拷贝的属性
        let notCopyProps: string[] = ['parent', 'directives', 'children', 'model'];
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

        //指令复制
        for (let d of this.directives) {
            d.clone(dst);
        }
        //孩子节点
        for (let c of this.children) {
            dst.add(c.clone());
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
            if (d.type.name === 'model') {
                continue;
            }
            if (d.expression) {
                d.value = d.expression.val(this.model);
            }
            d.exec();
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
    public handleEvents(module: Module, parentEl?: Node) {
        if (this.events.size === 0) {
            return;
        }
        for (let evt of this.events) {
            if(evt[1]){
                for (let ev of evt[1]) {
                    ev.bind(module, this,parentEl);
                }
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
     * 移除 某个节点
     * @param key   节点key
     */
    public remove(key: string) {
        let r = find(this, key);
        if (r.length > 1) {
            r[1].removeChild(r[0]);
        }
        function find(dom: Element, key: string, parent?: Element) {
            if (dom.key === key) {
                return [dom, parent];
            }

            for (let c of dom.children) {
                let r = find(c, key, dom);
                if (r) {
                    return r;
                }
            }
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
    public getProp(propName: string) {
        return this.props[propName] || this.exprProps[propName]
    }

    /**
     * 设置属性值
     * @param propName  属性名
     * @param v         属性值
     */
    public setProp(propName: string, v: any) {
        if(v instanceof Expression){
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
     * @param dst 	    待比较节点
     * @param updArr    改变的节点数组
     * @param daArr     增删的节点数组
     * @returns	{type:类型 text/rep/add/upd,node:节点,parent:父节点, 
     * 			changeProps:改变属性,[{k:prop1,v:value1},...],removeProps:删除属性,[prop1,prop2,...],changeAssets:改变的asset}
     */
    public compare(dst: Element, changeArr: Array<any>) {
        if (!dst) {
            return;
        }
        if (!this.tagName) { //文本节点
            if (!dst.tagName) {
                if (this.textContent !== dst.textContent) {
                    addChange(2, this, dst);
                }
            } else { //节点类型不同
                addChange(5, this, dst);
            }
        } else { //element节点
            if (this.tagName !== dst.tagName) { //节点类型不同
                addChange(5, this, dst);
            } else { //节点类型相同，可能属性不同
                let change = false;

                //属性比较
                const [srcProps, dstProps] = [Util.getOwnProps(this.props), Util.getOwnProps(dst.props)];
                if (srcProps.length !== dstProps.length) {
                    change = true;
                } else {
                    for (let k of srcProps) {
                        if (this.props[k] !== dst.props[k]) {
                            change = true;
                            break;
                        }
                    }
                }

                //asset比较
                if (this.assets.size !== dst.assets.size) {
                    change = true;
                } else {
                    for (let v of this.assets) {
                        if (v[1] !== dst.assets.get(v[0])) {
                            change = true;
                            break;
                        }
                    }
                }

                if(change){
                    addChange(2,this,null,dst);
                }
            }
        }

        //子节点处理
        if (!this.children || this.children.length === 0) {
            // 旧节点的子节点全部删除
            if (dst.children && dst.children.length > 0) {
                dst.children.forEach(item => addChange(3, item, null, dst));
            }
        } else {
            //全部新加节点
            if (!dst.children || dst.children.length === 0) {
                this.children.forEach(item => addChange(1, item, null, dst));
            } else { //都有子节点
                //存储比较后需要add的key
                let addObj={};
                //子节点对比策略
                let [oldStartIdx, oldStartNode, oldEndIdx, oldEndNode] = [0, dst.children[0], dst.children.length - 1, dst.children[dst.children.length - 1]];
                let [newStartIdx, newStartNode, newEndIdx, newEndNode] = [0, this.children[0], this.children.length - 1, this.children[this.children.length - 1]];
                while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                    if (sameKey(oldStartNode, newStartNode)) {
                        newStartNode.compare(oldStartNode, changeArr);
                        newStartNode = this.children[++newStartIdx];
                        oldStartNode = dst.children[++oldStartIdx];
                    } else if (sameKey(oldEndNode, newEndNode)) {
                        newEndNode.compare(oldEndNode, changeArr);
                        newEndNode = this.children[--newEndIdx];
                        oldEndNode = dst.children[--oldEndIdx];
                    } else if (sameKey(newStartNode, oldEndNode)) {
                        //新前旧后
                        newStartNode.compare(oldEndNode, changeArr);
                       //跳过插入点会提前移动的节点
                        while(addObj.hasOwnProperty(oldStartNode.key)){
                            changeArr[addObj[oldStartNode.key]][0] = 4;
                            delete addObj[oldStartNode.key];
                            oldStartNode = dst.children[++oldStartIdx];
                        }
                         //接在待操作老节点前面
                        addChange(4,oldEndNode,  oldStartNode,dst)
                        newStartNode = this.children[++newStartIdx];
                        oldEndNode = dst.children[--oldEndIdx];
                    } else if (sameKey(newEndNode, oldStartNode)) {
                        newEndNode.compare(oldStartNode, changeArr);
                         //跳过插入点会提前移动的节点
                        while(addObj.hasOwnProperty(oldEndNode.key)){
                            changeArr[addObj[oldEndNode.key]][0] = 4;
                            delete addObj[oldEndNode.key];
                            oldEndNode = dst.children[--oldEndIdx];
                        }
                        //接在 oldEndIdx 之后，但是再下一个节点可能移动位置，所以记录oldEndIdx节点
                        addChange(4, oldStartNode, oldEndNode,dst,1);
                        newEndNode = this.children[--newEndIdx];
                        oldStartNode = dst.children[++oldStartIdx];
                    } else {
                        //跳过插入点会提前移动的节点
                        if(addObj.hasOwnProperty(oldStartNode.key)){
                            while(addObj.hasOwnProperty(oldStartNode.key)){
                                   changeArr[addObj[oldStartNode.key]][0] = 4;
                                   delete addObj[oldStartNode.key];
                                oldStartNode = dst.children[++oldStartIdx];
                            }
                            continue;//继续diff，暂不add
                        }
                       //加入到addObj
                        addObj[newStartNode.key]= addChange(1, newStartNode, oldStartNode,dst)-1;
                        newStartNode = this.children[++newStartIdx];
                    }
                }
                //有新增或删除节点
                if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
                    if (oldStartIdx > oldEndIdx) {
                        //没有老节点
                        for (let i = newStartIdx; i <= newEndIdx; i++) {
                            // 添加到dst.children[i]前面
                            addChange(1, this.children[i], i, dst);
                        }
                    } else {
                        //有老节点，需要删除
                        for (let i = oldStartIdx; i <= oldEndIdx; i++) {
                            let ch=dst.children[i];
                            //如果要删除的节点在addArr中，则表示move，否则表示删除
                            if(!addObj.hasOwnProperty(ch.key)){ 
                                addChange(3,ch,null,dst);
                            }else{
                                changeArr[addObj[ch.key]][0] = 4;
                            }
                        }
                    }
                }
            }
        }

        /**
         * 是否有相同key
         * @param src   源节点
         * @param dst   目标节点
         * @returns     相同key为true，否则为false
         */
        function sameKey(src: Element, dst: Element): boolean {
            return src.key === dst.key;
        }

        /**
         * 添加刪除替換
        * @param type       类型 add 1, upd 2,del 3,move 4 ,rep 5
        * @param dom        虚拟节点    
        * @param dom1       相对节点
        * @param parent     父节点
        * @param extra      move时 0:相对节点前，1:相对节点后
        */
        function addChange(type:number,dom: Element, dom1?: Element|number,parent?:Element,loc?:number) {
            return changeArr.push([type,dom,dom1,parent,loc]);
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
            //相同事件不添加
            if(ev.find(item=>item.equal(event))){
                return;
            }
            ev.push(event);
        } else {
            this.events.set(event.name, [event]);
        }
    }

    /**
     * 获取事件
     * @param eventName     事件名
     * @returns             事件对象或事件对象数组
     */
    public getEvent(eventName: string) {
        return this.events.get(eventName);
    }
    /**
     * 执行不渲染关联操作
     * 关联操作，包括:
     *  1 节点(子节点)含有module指令，需要unactive
     */
    public doDontRender(parent?: Element) {
        if (parent) {
            parent.removeChild(this);
        }
        //对于模块容器，对应module需unactive
        if (this.hasDirective('module')) {
            let mdl = ModuleFactory.get(parseInt(this.getProp('moduleId')));
            if (mdl) {
                mdl.unactive();
            }
        }
    }

    /**
     * 保存cache，dom相关cache放在模块cache的 $doms 下
     * @param module    模块
     * @param name      属性名
     * @param value     属性值
     */
    saveCache(module:Module,name:string,value:any){
        module.saveCache(`$doms.${this.key}.${name}`,value);
    }

    /**
     * 读cache内容
     * @param module    模块 
     * @param name      属性名
     * @returns         属性值
     */
    readCache(module:Module,name:string):any{
        return module.readCache(`$doms.${this.key}.${name}`);
    }

    /**
     * 移除cache值
     * @param module    模块 
     * @param name      属性名
     */
    removeCache(module:Module,name:string){
        module.removeCache(`$doms.${this.key}.${name}`);
    }

    /**
     * 清除dom cache
     * @param module    模块
     */
    clearCache(module:Module){
        module.removeCache(`$doms.${this.key}`);
    }
}