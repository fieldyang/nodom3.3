import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { VirtualDom } from "./virtualdom";
import { Model } from "./model";
import { Expression } from "./expression";
import { CssManager } from "./cssmanager";
import { EventManager } from "./eventmanager";

/**
 * 渲染器
 */
export class Renderer {
    /**
     * 等待渲染列表（模块名）
     */
    private static waitList: Array < number > = [];

    /**
     * 当前模块根dom
     */
    private static currentModuleRoot:VirtualDom;
    /**
     * 添加到渲染列表
     * @param module 模块
     */
    public static add(module:Module) {
        //如果已经在列表中，不再添加
        if (!module.dontAddToRender && !this.waitList.includes(module.id)) {
            //计算优先级
            this.waitList.push(module.id);
        }
    }
    //从列表移除
    public static remove(module:Module) {
        let ind;
        if ((ind = this.waitList.indexOf(module.id)) !== -1) {
            this.waitList.splice(ind, 1);
        }
    }

    /**
     * 队列渲染
     */
    public static render() {
        for(;this.waitList.length>0;){
            ModuleFactory.get(this.waitList.shift()).render();
        }
    }

    /**
     * 渲染dom
     * @param module            模块 
     * @param src               源dom
     * @param model             模型，如果src已经带有model，则此参数无效
     * @param parent            父dom
     * @param key               key
     * @returns 
     */
    public static renderDom(module:Module,src:VirtualDom,model:Model,parent?:VirtualDom,key?:string):VirtualDom{
        //节点自带model优先级高
        model = src.model?src.model:model;
        let dst:VirtualDom = new VirtualDom(src.tagName,key?src.key+'_'+key:src.key);
        //设置当前根root
        if(!parent){
            this.currentModuleRoot = dst;
        }
        if(src.staticNum>0){
            src.staticNum--;
        }
        dst.model = model;
        dst.subModuleId = src.subModuleId;
        
        // 设置父对象
        if(parent) {
            dst.parent = parent;
        }
        
        //先处理model指令
        if(src.directives && src.directives.length>0 && src.directives[0].type.name === 'model'){
            src.directives[0].exec(module,dst,src);
        }

        if(src.tagName){
            if(!dst.notChange){
                handleProps();
                let r = handleDirectives();
                if(!r){
                    return;
                }
                //处理style，如果为style，则不处理assets和events
                if(!CssManager.handleStyleDom(module,src,Renderer.currentModuleRoot,src.getProp('scope') === 'this')){
                    //assets
                    if(src.assets && src.assets.size>0){
                        for(let p of src.assets){
                            dst.setAsset(p[0],p[1]);
                        }
                    }

                    //事件
                    if(src.events && src.events.size>0){
                        for(let p of src.events){
                            //复制数组
                            dst.setEvent(p[0],p[1].slice(0));
                        }
                    }
                }
            }
            // 子节点
            if(src.children && src.children.length>0){
                dst.children = [];
                for(let c of src.children){
                    if(c instanceof VirtualDom){ //未编译节点
                        Renderer.renderDom(module,c,dst.model,dst,key?key:null);
                    }else{ //已编译节点
                        dst.children.push(c);
                    }
                }
            }
        }else if(!dst.notChange){ //文本节点
            if(src.expressions){
                let value = '';
                src.expressions.forEach((v) => {
                    if (v instanceof Expression) { //处理表达式
                        let v1 = v.val(module,dst.model);
                        value += v1 !== undefined ? v1 : '';
                    } else {
                        value += v;
                    }
                });
                dst.textContent = value;
                dst.staticNum = -1;
            }else{
                dst.textContent = src.textContent;
            }
        }
        //添加到dom tree
        if(parent && !dst.dontAddToTree){
            parent.children.push(dst);
        }
        return dst;

        /**
         * 处理指令
         * @returns     true继续执行，false不执行后续渲染代码
         */
        function handleDirectives():boolean {
            if(!src.directives || src.directives.length===0){
                return true;
            }
            dst.staticNum = -1;
            for(let d of src.directives){
                //model指令不执行
                if(d.type.name==='model'){
                    continue;
                }
                if(!d.exec(module,dst,src)){
                    return false;
                }
            }
            return true;
        }

        /**
         * 处理属性（带表达式）
         */
        function handleProps() {
            if(!src.props || src.props.size === 0){
                return;
            }
            for(let k of src.props){
                if(k[1] instanceof Expression){
                    dst.setProp(k[0],k[1].val(module,dst.model));
                    dst.staticNum = -1;
                }else{
                    dst.setProp(k[0],k[1]);
                }
            }
        }
    }


    /**
     * 渲染到html element
     * @param module 	        模块
     * @param src               渲染节点
     * @param parentEl 	        父html
     * @param isRenderChild     是否渲染子节点
     */
     public static renderToHtml(module: Module,src:VirtualDom, parentEl:HTMLElement,isRenderChild?:boolean) {
        let el = module.getNode(src.key);
        if(el){   //html dom节点已存在
            if(src.tagName){
                if(src.props){
                    //设置属性
                    for(let p of src.props){
                        if(p[1]!== undefined){
                            (<HTMLElement>el).setAttribute(p[0],p[1]);
                        }
                    }
                }
                handleAssets(src,<HTMLElement>el);
            }else{  //文本节点
                (<any>el).textContent = src.textContent;
            }
        }else{
            if(src.tagName){
                el = newEl(src);
            }else{
                el = newText(src);
            }
            //先创建子节点，再添加到html dom树，避免频繁添加
            if(el && src.tagName  && isRenderChild){
                genSub(el, src);
            }
            if(el && parentEl){
                parentEl.appendChild(el);
            }
        }
        return el;
        
        /**
         * 新建element节点
         * @param dom 		虚拟dom
         * @returns 		新的html element
         */
        function newEl(dom:VirtualDom): HTMLElement {
            //style不处理
            if(dom.tagName.toLowerCase() === 'style'){
                return;
            }
            //创建element
            let el= document.createElement(dom.tagName);
            //保存虚拟dom
            el['vdom'] = dom;
        
            //模块容器，向目标模块设置容器
            if(dom.subModuleId){
                let m:Module = ModuleFactory.get(dom.subModuleId);
                if(m){
                    m.setContainer(el);
                }
                //添加到父模块
                module.addChild(m.id);
            }
            //设置属性
            if(dom.props){
                for(let p of dom.props){
                    if(p[1] !== undefined){
                        el.setAttribute(p[0],p[1]);     
                    }
                }
            }
            
            //如果存储node，则不需要key
            // el.setAttribute('key', dom.key);
            //把el引用与key关系存放到cache中
            module.saveNode(dom.key,el);
            //asset
            if(dom.assets && dom.assets.size>0){
                for (let p in dom.assets) {
                    el[p] = p[1];
                }
            }
            //处理event
            if(dom.events){
                EventManager.bind(module,dom);
            }
            return el;
        }

        /**
         * 新建文本节点
         */
        function newText(dom:VirtualDom): Node {
            //样式表处理，如果是样式表文本，则不添加到dom树
            if(CssManager.handleStyleTextDom(module,dom)){
                 return;
            }
            let node = document.createTextNode(<string>dom.textContent || '');
            module.saveNode(dom.key,node);
            return node;
        }

        /**
         * 生成子节点
         * @param pEl 	父节点
         * @param vdom  虚拟dom节点	
         */
        function genSub(pEl: Node, vdom: VirtualDom) {
            if (vdom.children && vdom.children.length > 0) {
                vdom.children.forEach(item => {
                    let el1;
                    if (item.tagName) {
                        el1 = newEl(item);
                        genSub(el1, item);
                    } else {
                        el1 = newText(item);
                    }
                    if(el1){
                        pEl.appendChild(el1);
                    }
                });
            }
        }

        /**
         * 处理assets
         */
        function handleAssets(dom:VirtualDom,el:HTMLElement){
            //处理asset
            if (dom.assets) {
                for (let k of dom.assets) {
                    el[k[0]] = k[1];
                }    
            }
        }
    }
}
