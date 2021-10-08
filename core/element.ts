import { CssManager } from "./cssmanager";
import { Directive } from "./directive";
import { DirectiveManager } from "./directivemanager";
import { NEvent } from "./event";
import { EventManager } from "./eventmanager";
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
     * 别名，设置后，在模版中以别名方式使用，不再支持模块类名
     */
    // public alias:string;

    /**
     * 绑定模型
     */
    public model: Model;

    /**
     * element为textnode时有效
     */
    public textContent: string;

    /**
     * 指令集
     */
    public directives: any[] = [];

    /**
     * 直接属性 不是来自于attribute，而是直接作用于html element，如el.checked,el.value等
     */
    public assets: Map<string, any> = new Map();

    /**
     * 静态属性(attribute)集合
     * {prop1:value1,...}
     */
    public props: Map<string,any> = new Map();

    /**
     * 含表达式的属性集合
     * {prop1:value1,...}
     */
    public exprProps: Map<string,number> = new Map();

    /**
     * 事件集合,{eventName1:nodomNEvent1,...}
     * 一个事件名，可以绑定多个事件方法对象
     */
    public events: Map<string, number[]> = new Map();

    /**
     * 表达式+字符串数组，用于textnode
     */
    public expressions: Array<Expression | string> = [];

    /**
     * 子element [key1,key2,key3...]
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
     * staticNum 静态标识数
     *  0 表示静态，不进行比较
     *  > 0 每次比较后-1
     *  < 0 不处理
     */
    public staticNum:number = 0;

    /**
     * 不渲染标志，单次渲染有效
     */
    public dontRender: boolean = false;

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
     * @param tag       标签名
     * @param key       key
     */
    constructor(tag?: string,key?:string) {
        this.tagName = tag; //标签
        if(key){
            this.key = key;
        }
        //新建节点，设置为至少比较一次
        this.staticNum = 1;
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
        if(this.hasDirective('model')){
            let d = this.getDirective(module,'model');
            d.exec(module,this);
        }

        //前置方法集合执行
        this.doRenderOp(module, 'before');
        
        if (this.tagName) { //element
            if (!this.handleDirectives(module)) {
                this.doDontRender(module,parent);
                return false;
            }
            this.handleProps(module);
            //如果有表达式属性，则staticNum为-1
            if(this.exprProps.size>0){
                this.staticNum = -1;
            }
            //处理style 元素
            CssManager.handleStyleDom(module,this);
        } else{ //textContent
            this.handleText(module);
        }
    
        //子节点渲染
        for (let i = 0; i < this.children.length; i++) {
            let item = this.children[i];
            if(!item.render(module, this)) {
                item.doDontRender(module,this);
                i--;
            }
        }

        //后置方法集执行
        this.doRenderOp(module, 'after');
        return true;
    }

    /**
     * 渲染到html element
     * @param module 	        模块
     * @param parentEl 	        父html
     * @param isRenderChild     是否渲染子节点
     */
    public renderToHtml(module: Module, parentEl:HTMLElement,isRenderChild?:boolean) {
        //style不添加到html
        if(this.tagName === 'style'){
            return;
        }
        
        let el = module.objectManager.getNode(this.key);
        if(el){   //html dom节点已存在
            if(this.tagName){
                //设置属性
                for(let v of this.props){
                    if (typeof v[1] != 'function'){
                        (<HTMLElement>el).setAttribute(v[0], v[1]===undefined?'':v[1]);
                    }
                }
                this.handleAssets((<HTMLElement>el));
            }else{  //文本节点
                (<any>el).textContent = this.textContent;
            }
        }else{
            if(this.tagName){
                el = newEl(this);
            }else{
                el = newText(this);
            }
            //先创建子节点，再添加到html dom树，避免频繁添加
            if(this.tagName  && isRenderChild){
                genSub(el, this);
            }
            parentEl.appendChild(el);
            return el;
        }
        
        /**
         * 新建element节点
         * @param vdom 		虚拟dom
         * @returns 		新的html element
         */
        function newEl(vdom: Element): HTMLElement {
            //创建element
            let el= Util.newEl(vdom.tagName);
            //设置属性
            for(let v of vdom.props){
                if (typeof v[1] != 'function'){
                    el.setAttribute(v[0], v[1]===undefined?'':v[1]);
                }
            }
            
            //如果存储node，则不需要key
            el.setAttribute('key', vdom.key);
            //把el引用与key关系存放到cache中
            module.objectManager.saveNode(vdom.key,el);
            vdom.handleAssets(el);
            vdom.handleEvents(module);
            return el;
        }

        /**
         * 新建文本节点
         * @param vdom  虚拟dom节点
         */
        function newText(vdom:Element): Node {
            //样式表处理，如果是样式表文本，则不添加到dom树
            if(CssManager.handleStyleTextDom(module,vdom)){
                return;
            }
            let node = document.createTextNode(<string>vdom.textContent || '');
            module.objectManager.saveNode(vdom.key,node);
            return node;
        }

        /**
         * 生成子节点
         * @param pEl 	父节点
         * @param vdom  虚拟dom节点	
         */
        function genSub(pEl: Node, vdom: Element) {
            if (vdom.children && vdom.children.length > 0) {
                vdom.children.forEach(item => {
                    let el1;
                    if (item.tagName) {
                        el1 = newEl(item);
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
     * @param changeKey     是否更改key，如果为true，则生成的节点用新的key
     */
    public clone(changeKey?:boolean): Element {
        let dst: Element = new Element(this.tagName,changeKey?Util.genId() + '':this.key);
        
        dst.expressions = this.expressions;
        dst.textContent = this.textContent;
        dst.staticNum = this.staticNum;

        //普通属性
        if(this.props.size>0){
            for(let p of this.props){
                dst.props.set(p[0],p[1]);
            }
        }

        //表达式属性
        if(this.exprProps.size>0){
            for(let p of this.exprProps){
                dst.exprProps.set(p[0],p[1]);
            }
        }

        //assets
        if(this.assets.size>0){
            for(let p of this.assets){
                dst.assets.set(p[0],p[1]);
            }
        }

        //事件
        if(this.events.size>0){
            for(let p of this.events){
                //复制数组
                dst.events.set(p[0],p[1].slice(0));
            }
        }

        //指令
        for(let d of this.directives){
            dst.directives.push({type:d.type,id:d.id});
        }

        //children
        for(let c of this.children){
            dst.add(c.clone(changeKey));
        }

        //如果staticNum>0，则表示为新编译节点，第二次clone时预设为不再需要比较
        if(this.staticNum>0){
            this.staticNum--;
        }
        return dst;
    }

    /**
     * 处理指令
     * @param module    模块
     */
    public handleDirectives(module: Module) {
        for (let d of this.directives) {
            //model指令已经执行，不再执行
            if(d.type === 'model'){
                continue;
            }
            let dir:Directive = module.objectManager.getDirective(d.id);
            if(!dir){
                continue;
            }
            if(dir.expression){
                dir.value = module.objectManager.getExpression(dir.expression).val(module,this.model);
            }
            dir.exec(module,this);
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
        let value = '';
        exprArr.forEach((v) => {
            if (typeof v === 'number') { //处理表达式
                let expr = module.objectManager.getExpression(v);
                if(!expr){
                    return;
                }
                let v1 = expr.val(module,this.model);
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
        for (let k of this.exprProps) {
            let v = module.objectManager.getExpression(k[1]).val(module,this.model);
            if (k[0] === 'style') {
                this.addStyle(v);
            } else {
                this.props.set(k[0],v);
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
     * 处理文本节点
     * @param module    模块
     */
    public handleText(module) {
        if (this.expressions !== undefined && this.expressions.length > 0) {
            this.textContent = this.handleExpression(this.expressions, module) || '';
            this.staticNum = -1;
        }
    }

    /**
     * 处理事件
     * @param module    模块
     */
    public handleEvents(module: Module) {
        if (this.events.size === 0) {
            return;
        }
        EventManager.bind(module,this);
    }

    /**
     * 移除指令
     * @param directives 	待删除的指令类型数组或指令类型
     */
    public removeDirectives(directives: string | string[]) {
        if (typeof directives === 'string') {
            let ind;
            if ((ind = this.directives.findIndex(item => item.name === directives)) !== -1) {
                this.directives.splice(ind, 1);
            }
            return;
        }
        //数组
        directives.forEach(d=>{
            let ind;
            if ((ind = this.directives.findIndex(item => item.type === d)) !== -1) {
                this.directives.splice(ind, 1);
            }
        });
    }

    /**
     * 添加指令
     * @param directive     指令对象
     * @param sort          是否排序
     */
    public addDirective(directive: Directive, sort?: boolean) {
        //不重复添加
        if(this.directives.find(item=>item.type === directive.type.name)){
            return;
        }
        this.directives.push({type:directive.type.name,id:directive.id});
        //指令按优先级排序
        if (sort) {
            this.sortDirective();
        }
    }

    /**
     * 指令排序
     */
    public sortDirective(){
        if (this.directives.length > 1) {
            this.directives.sort((a, b) => {
                return DirectiveManager.getType(a.type).prio < DirectiveManager.getType(b.type).prio?-1:1;
            });
        }
    }

    /**
     * 是否有某个类型的指令
     * @param typeName 	    指令类型名
     * @returns             true/false
     */
    public hasDirective(typeName:string): boolean {
        return this.directives.findIndex(item => item.type === typeName) !== -1;
    }

    /**
     * 获取某个类型的指令
     * @param module            模块
     * @param directiveType 	指令类型名
     * @returns                 指令对象
     */
    public getDirective(module:Module,directiveType:string): Directive {
        let r:any = this.directives.find(item => item.type === directiveType);
        if(r){
            return module.objectManager.getDirective(r.id);
        }
    }

    /**
     * 移除子节点
     * @param dom   子dom
     */
    public removeChild(dom: Element) {
        let ind: number;
        // 移除
        if (Util.isArray(this.children) && (ind = this.children.findIndex(item=>item===dom)) !== -1) {
            this.children.splice(ind, 1);
        }
    }

    /**
     * 替换子节点
     * @param src   待替换dom
     * @param dst   被替换dom
     */
     public replaceChild(src: Element,dst:Element) {
        let ind: number;
        // 移除
        if (Util.isArray(this.children) && (ind = this.children.findIndex(item=>item===dst)) !== -1) {
            this.children.splice(ind, 1,src);
        }
    }

    /**
     * 添加子节点
     */
    public add(dom:Element){
        this.children.push(dom);
        dom.parent = this;
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
        let clazz = this.props.get('class');
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
        let clazz = this.props.get('class');
        if (!clazz) {
            this.setProp('class', cls);
            this.setStaticOnce();
        } else {
            let sa: any[] = clazz.trim().split(/\s+/);
            if (!sa.includes(cls)) {
                sa.push(cls);
                clazz = sa.join(' ');
                this.setProp('class',clazz);
                this.setStaticOnce();
            }
        }
    }

    /**
     * 删除css class
     * @param cls class名
     */
    public removeClass(cls: string) {
        let clazz = this.props.get('class');
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
        this.props.set('class',clazz);
    }
    /**
     * 查询style
     * @param styStr style字符串
     */
    public hasStyle(styStr: string) {
        let styleStr = this.props.get('style');
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
        let styleStr = this.props.get('style');
        if (!styleStr) {
            this.props.set('style', styStr);
            this.setStaticOnce();
        } else {
            let sa: any[] = styleStr.trim().split(/;\s+/);
            if (!sa.includes(styStr)) {
                sa.push(styStr);
                styleStr = sa.join(';');
                this.props.set('style',styleStr);
                this.setStaticOnce();
            }
        }
    }

    /**
     * 删除style
     * @param styStr style字符串
     */
    public removeStyle(styStr: string) {
        let styleStr = this.props.get('style');
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
        this.props.set('style',styleStr);
        this.setStaticOnce();
    }

    /**
     * 是否拥有属性
     * @param propName  属性名
     * @param isExpr    是否只检查表达式属性
     */
    public hasProp(propName: string,isExpr?:boolean) {
        return isExpr?this.exprProps.has(propName):(this.props.has(propName) || this.exprProps.has(propName));
    }

    /**
     * 获取属性值
     * @param propName  属性名
     * @param isExpr    是否只获取表达式属性
     */
    public getProp(propName: string,isExpr?:boolean) {
        return isExpr?this.exprProps.get(propName):(this.props.get(propName) || this.exprProps.get(propName));
    }

    /**
     * 设置属性值
     * @param propName  属性名
     * @param v         属性值
     */
    public setProp(propName: string, v: any) {
        if(v instanceof Expression){
            this.exprProps.set(propName,v.id);
        } else {
            this.props.set(propName,v);
        }
    }

    /**
     * 删除属性
     * @param props     属性名或属性名数组 
     */
    public delProp(props: string | string[]) {
        if (Util.isArray(props)) {
            for (let p of <string[]>props) {
                this.exprProps.delete(p);
            }
            for (let p of <string[]>props) {
                this.props.delete(p);
            }
        } else {
            this.exprProps.delete(<string>props);
            this.props.delete(<string>props);
        }
        //设置静态标志，至少要比较一次
        this.setStaticOnce();
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
                if ((this.staticNum || dst.staticNum) && this.textContent !== dst.textContent) {
                    addChange(2,this,null,dst.parent);
                }
            } else { //节点类型不同
                addChange(5,this,null, dst.parent);
            }
        } else { //element节点
            if (this.tagName !== dst.tagName) { //节点类型不同
                addChange(5,this,null, dst.parent);
            } else if(this.staticNum || dst.staticNum){ //节点类型相同，但有一个不是静态节点，进行属性和asset比较
                let change = false;
                //属性比较
                if(this.props.size !== dst.props.size){
                    change = true;
                }else{
                    for(let v of this.props){
                        if(v[1] !== dst.props.get(v[0])){
                            change = true;
                            break;
                        }
                    }
                }

                //asset比较
                if(this.assets.size !== dst.assets.size){
                    change = true;
                }else{
                    for(let v of this.assets){
                        if(v[1] !== dst.assets.get(v[0])){
                            change = true;
                            break;
                        }
                    }
                }
                if(change){
                    addChange(2,this,null,dst.parent);
                }
            }
        }
        if(this.staticNum>0){
            this.staticNum--;
        }
        //子节点处理
        if (!this.children || this.children.length === 0) {
            // 旧节点的子节点全部删除
            if (dst.children && dst.children.length > 0) {
                dst.children.forEach(item => addChange(3,item,null,dst));
            }
        } else {
            //全部新加节点
            if (!dst.children || dst.children.length === 0) {
                this.children.forEach(item => addChange(1, item,null, dst));
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
                        addChange(4,oldEndNode,  oldStartNode,dst);
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
                            addChange(1,this.children[i], i ,dst);
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
        function sameKey(src:Element, dst:Element):boolean {
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
     * @param event     事件对象
     */
    public addEvent(event: NEvent) {
        if(!this.events.has(event.name)){
            this.events.set(event.name, [event.id]);
        }else{
            let arr = this.events.get(event.name);
            //已添加的事件，不再添加
            if(arr.indexOf(event.id) === -1){
                arr.push(event.id);
            }
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
    public doDontRender(module:Module,parent?:Element) {
        if(parent){
            parent.removeChild(this);
        }
        //对于模块容器，对应module需unactive
        if (this.hasDirective('module')) {
            let mdl = ModuleFactory.get(parseInt(this.getProp('moduleId')));
            if(mdl){
                mdl.unactive();
            }
        }
    }

    /**
     * 获取html dom
     * @param module    模块 
     * @returns         对应的html dom
     */
    public getEl(module:Module):Node{
        return module.objectManager.getNode(this.key);
    }

    /**
     * 查找子孙节点
     * @param key 	element key
     * @returns		虚拟dom/undefined
     */
    public query(key: string) {
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

    /**
     * 设置cache参数
     * @param module    模块
     * @param name      参数名
     * @param value     参数值
     */
    public setParam(module:Module,name:string,value:any){
        module.objectManager.setElementParam(this.key,name,value);
    }

    /**
     * 获取参数值
     * @param module    模块 
     * @param name      参数名
     * @returns         参数值
     */
    public getParam(module:Module,name:string){
        return module.objectManager.getElementParam(this.key,name);
    }

    /**
     * 移除参数
     * @param module    模块
     * @param name      参数名
     */
    public removeParam(module:Module,name:string){
        module.objectManager.removeElementParam(this.key,name);
    }

    /**
     * 设置单次静态标志
     */
    private setStaticOnce(){
        if(this.staticNum !== -1){
            this.staticNum = 1;
        }
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
                m.apply(this, [this.model, module]);
            }
        }
    }
}
