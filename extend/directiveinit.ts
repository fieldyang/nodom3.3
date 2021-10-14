import { Directive } from "../core/directive";
import { VirtualDom } from "../core/virtualdom";
import { NEvent } from "../core/event";
import { Model } from "../core/model";
import { Module } from "../core/module";
import { ModuleFactory } from "../core/modulefactory";
import { createDirective} from "../core/nodom";
import { Renderer } from "../core/renderer";
import { Router } from "../core/router";
import { Util } from "../core/util";

export default (function () {

    /**
     * 指令类型初始化
     * 每个指令类型都有一个名字、处理函数和优先级，处理函数不能用箭头函数
     * 处理函数在渲染时执行，包含两个参数 module(模块)、dom(目标虚拟dom)、src(源虚拟dom)
     * 处理函数的this指向指令
     * 处理函数的返回值 true 表示继续，false 表示后续指令不再执行 
     */

    /**
     * module 指令
     * 用于指定该元素为模块容器，表示子模块
     * 用法 x-module='模块类名'
     */
    createDirective(
        'module',
        function(module:Module,dom:any,src:VirtualDom){
            let m: Module;
            //存在moduleId，表示已经渲染过，不渲染
            let mid = src.subModuleId;
            let handle:boolean = true;
            if (mid) {
                m = ModuleFactory.get(mid);
                handle = !dom.props.renderOnce;
            } else {
                m = ModuleFactory.get(this.value);
                if (!m) {
                    return true;
                }
                mid = m.id;
                //保留modelId
                src.subModuleId = mid;
            }
            //保存到dom上，提升渲染性能
            dom.subModuleId = mid;
                
            if(handle){ //需要处理
                //设置props，如果改变了props，启动渲染
                let o:any = {};
                if(dom.props){
                    for(let p in dom.props){
                        if(p[0] === '$'){ //数据
                            if(!o.$data){
                                o.$data = {};
                            }
                            o.$data[p.substr(1)] = dom.props[p];
                            //删除属性
                            delete dom.props[p];
                        }else{
                            o[p] = dom.props[p];
                        }
                    }
                    m.setProps(o);
                    
                }
            }
            return true;
        },
        8
    );

    /**
     *  model指令
     */
    createDirective(
        'model',
        function(module:Module,dom:any,src:VirtualDom){
            let model: Model = dom.model.$get(this.value);
            if (model) {
                dom.model = model;
            }
            return true;
        },
        1
    );

    /**
     * 指令名 repeat
     * 描述：重复指令
     */
    createDirective(
        'repeat',
        function(module:Module,dom:any,src:VirtualDom){
            let rows = this.value;
            // 无数据，不渲染
            if (!Util.isArray(rows) || rows.length === 0) {
                return true;
            }
            const parent = dom.parent;
            //禁用该指令
            this.disabled = true;
            //从源树获取，才可能得到子节点
            for (let i = 0; i < rows.length; i++) {
                rows[i].$index = i;
                //渲染一次-1，所以需要+1
                src.staticNum++;
                Renderer.renderDom(module,src,rows[i],parent,rows[i].$key);
            }
            //启用该指令
            this.disabled = false;
            return false;
        },
        2
    );

    /**
     * 递归指令
     * 作用：在dom内部递归，用于具有相同数据结构的节点递归生成
     * 递归指令不允许嵌套
     * name表示递归名字，必须与内部的recur标签的ref保持一致，名字默认为default
     * 典型模版
     * ```
     * <recur name='r1'>
     *      <div>...</div>
     *      <p>...</p>
     *      <recur ref='r1' />
     * </recur>
     * ```
     */
    createDirective(
        'recur',
        function(module:Module,dom:any,src:VirtualDom){
            //递归节点存放容器
            if(dom.props.hasOwnProperty('ref')){
                //如果出现在repeat中，src为单例，需要在使用前清空子节点，避免沿用上次的子节点
                src.children = [];
                //递归存储名
                const name = '$recurs.' + (dom.props.ref || 'default');
                let node = module.objectManager.get(name);
                if(!node){
                    return true;
                }
                let model = dom.model;
                let cond = node.getDirective('recur');
                let m = model[cond.value];
                //不存在子层数组，不再递归
                if(!m){
                    return true;
                }
                //克隆，后续可以继续用
                let node1 = node.clone();
                let key:string;
                if(!Array.isArray(m)){  //recur子节点不为数组，依赖子层数据
                    node1.model = m;
                    key = m.$key;
                    Util.setNodeKey(node1,key,true);
                }else{
                    key = dom.model.$key
                }
                
                src.children = [node1];
            }else { //递归节点
                let data = dom.model[this.value];
                if(!data){
                    return true;
                }
                //递归名，默认default
                const name = '$recurs.' + (dom.props['name'] || 'default');
                if(!module.objectManager.get(name)){
                    module.objectManager.set(name,src.clone());
                }
            }
            return true;
        },
        2
    );

    /**
     * 指令名 if
     * 描述：条件指令
     */
    createDirective('if',
        function(module:Module,dom:any,src:VirtualDom){
            dom.parent.setParam(module,'$if',this.value);
            return this.value;
        },
        5
    );

    /**
     * 指令名 else
     * 描述：else指令
     */
    createDirective(
        'else',
        function(module:Module,dom:any,src:VirtualDom){
            //如果前面的if/elseif值为true，则隐藏，否则显示
            return dom.parent.getParam(module,'$if') === false;
        },
        5
    );

    /**
     * elseif 指令
     */
    createDirective('elseif', 
        function(module:Module,dom:any,src:VirtualDom){
            let v = dom.parent.getParam(module,'$if');
            if(v === true){
                return false;
            }else{
                if(!this.value){
                    return false;
                }else{
                    dom.parent.setParam(module,'$if',true);
                }
            }
            return true;
        },
        5
    );

    /**
     * elseif 指令
     */
     createDirective(
         'endif', 
        function(module:Module,dom:any,src:VirtualDom){
            dom.parent.removeParam(module,'$if');
            return true;
        },
        5
    );

    /**
     * 指令名 show
     * 描述：显示指令
     */
    createDirective(
        'show',
        function(module:Module,dom:any,src:VirtualDom){
            return this.value;
        },
        5
    );

    /**
     * 指令名 data
     * 描述：从当前模块获取数据并用于子模块，dom带module指令时有效
     */
    // createDirective('data',
    //     function(module:Module,dom:any,src:VirtualDom){
    //         if (typeof this.value !== 'object' || !dom.hasDirective('module')){
    //             return;
    //         }
    //         let mdlDir:Directive = dom.getDirective(module,'module');
    //         let mid = mdlDir.getParam(module,dom,'moduleId');
    //         if(!mid){
    //             return;
    //         }
    //         let obj = this.value;
    //         //子模块
    //         let subMdl = ModuleFactory.get(mid);
    //         //子model
    //         let m: Model = subMdl.model;
    //         let model = dom.model;
    //         Object.getOwnPropertyNames(obj).forEach(p => {
    //             //字段名
    //             let field;
    //             // 反向修改
    //             let reverse = false;
    //             if (Array.isArray(obj[p])) {
    //                 field = obj[p][0];
    //                 if (obj[p].length > 1) {
    //                     reverse = obj[p][1];
    //                 }
    //                 //删除reverse，只保留字段
    //                 obj[p] = field;
    //             } else {
    //                 field = obj[p];
    //             }
                
    //             let d = model.$get(field);
    //             //数据赋值
    //             if (d !== undefined) {
    //                 //对象直接引用，需将model绑定到新模块
    //                 if(typeof d === 'object'){
    //                     ModelManager.bindToModule(d,mid);
    //                 }
    //                 m[p] = d;
    //             }
    //             //反向处理（对象无需进行反向处理）
    //             if (reverse && typeof d !== 'object') {
    //                 m.$watch(p, function (model1,ov, nv) {
    //                     model.$set(field, nv);
    //                 });
    //             }
    //         });
    //     },
    //     9
    // );
    
    /**
     * 指令名 field
     * 描述：字段指令
     */
    createDirective('field',
        function(module:Module,dom:any,src:VirtualDom){
            const me = this;
            const type: string = dom.props.type;
            const tgname = dom.tagName.toLowerCase();
            const model = dom.model;
            
            if (!model) {
                return true;
            }

            let dataValue = model.$get(this.value);
            
            if (type === 'radio') {
                let value = dom.props['value'];
                if (dataValue == value) {
                    dom.props.checked = true;
                    dom.assets.checked = 'checked';
                } else {
                    dom.assets.checked = false;
                    delete dom.props.checked;
                }
            } else if (type === 'checkbox') {
                //设置状态和value
                let yv = dom.props['yes-value'];
                //当前值为yes-value
                if (dataValue == yv) {
                    dom.props.value = yv;
                    dom.assets.checked = 'checked';
                } else { //当前值为no-value
                    dom.props.value = dom.props['no-value'];
                    dom.assets.checked = false;
                }
            } else if (tgname === 'select') { //下拉框
                dom.assets.value = dataValue;
                dom.props.value = dataValue;
            } else {
                let v = (dataValue!==undefined && dataValue!==null)?dataValue:'';
                dom.assets.value = v;
                dom.props.value = v;
            }

            //初始化
            if(!this.getParam(module,dom,'inited')){
                Util.addEvent(dom,new NEvent('change',
                    function(model,dom){
                        let el = <any>module.getNode(dom.key);
                        if (!el) {
                            return;
                        }
                        let type = dom.props.type;
                        let field = me.value;
                        let v = el.value;
                        //根据选中状态设置checkbox的value
                        if (type === 'checkbox') {
                            if (dom.props['yes-value'] == v) {
                                v = dom.props['no-value'];
                            } else {
                                v = dom.props['yes-value'];
                            }
                        } else if (type === 'radio') {
                            if (!el.checked) {
                                v = undefined;
                            }
                        }
                        
                        //修改字段值,需要处理.运算符
                        let temp = this;
                        let arr = field.split('.')
                        if (arr.length === 1) {
                            model[field] = v;
                        } else {
                            field = arr.pop();
                            for (let i = 0; i < arr.length; i++) {
                                temp = temp[arr[i]];
                            }
                            temp[field] = v;
                        }
                        //修改value值，该节点不重新渲染
                        if (type !== 'radio') {
                            dom.props.value = v;
                            el.value = v;
                        }
                    }
                ));
                this.setParam(module,dom,'inited',true);
            }
            return true;
        },
        10
    );

    /**
     * route指令
     */
    createDirective('route',
        function(module:Module,dom:any,src:VirtualDom){
            if(!this.value){
                return true;
            }
            //a标签需要设置href
            if (dom.tagName.toLowerCase() === 'a') {
                dom.props.href = 'javascript:void(0)';
            }
            dom.props.path = this.value;
            //有激活属性
            if (dom.props.active) {
                let acName = dom.props.active;
                delete dom.props.active;
                //active 转expression
                Router.addActiveField(module, this.value, dom.model, acName);
                if(this.value.startsWith(Router.currentPath) && dom.model[acName]){
                    Router.go(this.value);
                }
            }
            
            //添加click事件,避免重复创建事件对象，创建后缓存
            let event:NEvent = module.objectManager.get('$routeClickEvent');
            if(!event){
                event = new NEvent('click',
                    (model,dom, e) => {
                        let path = dom.props.path;
                        if (!path) {
                            let dir: Directive = dom.getDirective('route');
                            path = dir.value;
                        }
                        if (Util.isEmpty(path)) {
                            return;
                        }
                        Router.go(path);
                    }
                );
                module.objectManager.set('$routeClickEvent',event);
            }
            Util.addEvent(dom,event);
            return true;
        }
    );

    /**
     * 增加router指令
     */
    createDirective('router',
        function(module:Module,dom:any,src:VirtualDom){
            Router.routerKeyMap.set(module.id, dom.key);
            return true;
        }
    );

    /**
     * 插头指令
     * 用于模块中，可实现同名替换
     */
    createDirective('slot',
        function(module:Module,dom:any,src:VirtualDom){
            // const parent = dom.parent;
            this.value = this.value || 'default';
            let mid = dom.parent.subModuleId;
            //父dom有module指令，表示为替代节点，替换子模块中的对应的slot节点；否则为子模块定义slot节点
            if(mid){
                let m = ModuleFactory.get(mid);
                if(m){
                    //缓存当前替换节点
                    m.objectManager.set('$slots.' + this.value,{rendered:dom,origin:src.clone()});
                }
                //设置不添加到dom树
                dom.dontAddToTree = true;
            }else{ //源slot节点
                //获取替换节点进行替换
                let cfg = module.objectManager.get('$slots.' + this.value);
                if(cfg){
                    let rdom;
                    if(dom.props.innerRender){ //内部渲染
                        rdom = cfg.origin;
                    }else{ //父模块渲染
                        rdom = cfg.rendered;
                    }
                    //避免key重复，更新key，如果为origin，则会修改原来的key？？？
                    for(let d of rdom.children){
                        Util.setNodeKey(d,dom.key,true);
                    }
                    //更改渲染子节点
                    src.children = rdom.children;
                    module.objectManager.remove('$slots.' + this.value);
                }
            }
            return true;
        },
        5
    );
}());