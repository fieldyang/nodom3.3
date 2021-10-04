import { Directive } from "../core/directive";
import { Element } from "../core/element";
import { NEvent } from "../core/event";
import { Model } from "../core/model";
import { Module } from "../core/module";
import { ModuleFactory } from "../core/modulefactory";
import { createDirective} from "../core/nodom";
import { Router } from "../core/router";
import { Util } from "../core/util";

export default (function () {

    /**
     *  指令类型初始化
     *  每个指令类型都有一个init和handle方法，init和handle都可选
     *  init 方法在编译时执行，包含两个参数 directive(指令)、dom(虚拟dom)，无返回
     *  handle方法在渲染时执行，包含四个参数 directive(指令)、dom(虚拟dom)、module(模块)、parent(父虚拟dom)
     */

    /**
     * module 指令
     * 用于指定该元素为模块容器，表示子模块
     * 用法 x-module='模块类名'
     */
    createDirective(
        'module',
        function(module:Module,dom:Element){
            let m: Module;
            //存在moduleId，表示已经渲染过，不渲染
            let mid = this.getParam(module,dom,'moduleId');
            if (mid) {
                m = ModuleFactory.get(mid);
                if(!dom.hasProp('once')){
                    dom.handleProps(module);
                    //设置props，如果改变了props，启动渲染
                    m.setProps(Object.fromEntries(dom.props));
                }
            } else {
                m = ModuleFactory.get(this.value);
                if (!m) {
                    return;
                }
                //保留modelId
                this.setParam(module,dom,'moduleId',m.id);
                //添加到父模块
                module.addChild(m.id);
                //设置容器
                m.setContainerKey(dom.key);
                //添加到渲染器
                m.active();
                //设置props，如果改变了props，启动渲染
                dom.handleProps(module);
                m.setProps(Object.fromEntries(dom.props));
            }
        },
        8
    );

    /**
     *  model指令
     */
    createDirective(
        'model',
        function(module:Module,dom:Element){
            let model: Model = dom.model.$get(this.value);
            if (model) {
                dom.model = model;
            }
        },
        1
    );

    /**
     * 指令名 repeat
     * 描述：重复指令
     */
    createDirective(
        'repeat',
        function(module:Module,dom:Element){
            const parent = dom.parent;
            dom.dontRender = true;
            let rows = this.value;
            // 无数据，不渲染
            if (!Util.isArray(rows) || rows.length === 0) {
                return;
            }
            dom.dontRender = false;
            let chds = [];
            // 移除指令
            dom.removeDirectives(['repeat']);
            for (let i = 0; i < rows.length; i++) {
                let node = dom.clone();
                //设置modelId
                node.model = rows[i];
                //设置key
                Util.setNodeKey(node,node.model.$key, true);
                rows[i].$index = i;
                chds.push(node);
            }
            //找到并追加到dom后
            if (chds.length > 0) {
                for (let i = 0, len = parent.children.length; i < len; i++) {
                    if (parent.children[i] === dom) {
                        chds = [i + 1, 0].concat(chds);
                        Array.prototype.splice.apply(parent.children, chds);
                        break;
                    }
                }
            }
            // 不渲染该节点
            dom.dontRender = true;
        },
        2
    );

    /**
     * 递归指令
     * 作用：在dom内部递归，用于具有相同数据结构的节点递归生成
     * 递归指令不允许嵌套
     * 典型模版
     * ```
     * <recur name='r1'>
     *      <div>...</div>
     *      <p>...</p>
     *      <recur ref='r1' />
     * </recur>
     * ```
     * name表示递归名字，必须与内部的recur标签的ref保持一致，名字默认为default
     */
    createDirective(
        'recur',
        function(module:Module,dom:Element){
            //递归节点存放容器
            if(dom.hasProp('ref')){
                const name = '$recurs.' + (dom.getProp('ref') || 'default');
                let node = module.objectManager.get(name);
                if(!node){
                    dom.dontRender=true;
                    return;
                }
                let model = dom.model;
                let cond = node.getDirective(module,'recur');
                let m = model[cond.value];
                if(!m){
                    dom.dontRender=true;
                    return;
                }

                if(node){
                    //克隆，后续可以继续用
                    let node1 = node.clone();
                    let key:string;
                    if(!Array.isArray(m)){  //recur子节点不为数组
                        node1.model = m;
                        key = m.$key;
                    }else{
                        key = dom.model.$key
                    }
                    Util.setNodeKey(node1,key,true);
                    dom.add(node1);
                }
            }else { //递归节点
                let data = dom.model[this.value];
                if(!data){
                    return;
                }
                //递归名，默认default
                const name = '$recurs.' + (dom.getProp('name') || 'default');
                if(!module.objectManager.get(name)){
                    module.objectManager.set(name,dom.clone());
                }
            }
        },
        2
    );

    /**
     * 指令名 if
     * 描述：条件指令
     */
    createDirective('if',
        function(module:Module,dom:Element){
            dom.parent.setParam(module,'$if',this.value);
            dom.dontRender = !this.value;
        },
        5
    );

    /**
     * 指令名 else
     * 描述：else指令
     */
    createDirective(
        'else',
        function(module:Module,dom:Element){
            //如果前面的if/elseif值为true，则隐藏，否则显示
            dom.dontRender = (dom.parent.getParam(module,'$if') === true);
        },
        5
    );

    /**
     * elseif 指令
     */
    createDirective('elseif', 
        function(module:Module,dom:Element){
            let v = dom.parent.getParam(module,'$if');
            if(v === true){
                dom.dontRender = true;
            }else{
                if(!this.value){
                    dom.dontRender = true;
                }else{
                    dom.parent.setParam(module,'$if',true);
                    dom.dontRender = false;
                }
            }
        },
        5
    );

    /**
     * elseif 指令
     */
     createDirective(
         'endif', 
        function(module:Module,dom:Element){
            dom.parent.removeParam(module,'$if');
        },
        5
    );

    /**
     * 指令名 show
     * 描述：显示指令
     */
    createDirective(
        'show',
        function(module:Module,dom:Element){
            dom.dontRender = !this.value;
        },
        5
    );

    /**
     * 指令名 data
     * 描述：从当前模块获取数据并用于子模块，dom带module指令时有效
     */
    createDirective('data',
        function(module:Module,dom:Element){
            if (typeof this.value !== 'object' || !dom.hasDirective('module')){
                return;
            }
            let mdlDir:Directive = dom.getDirective(module,'module');
            let mid = mdlDir.getParam(module,dom,'moduleId');
            if(!mid){
                return;
            }
            let obj = this.value;
            //子模块
            let subMdl = ModuleFactory.get(mid);
            //子model
            let m: Model = subMdl.model;
            let model = dom.model;
            Object.getOwnPropertyNames(obj).forEach(p => {
                //字段名
                let field;
                // 反向修改
                let reverse = false;
                if (Array.isArray(obj[p])) {
                    field = obj[p][0];
                    if (obj[p].length > 1) {
                        reverse = obj[p][1];
                    }
                    //删除reverse，只保留字段
                    obj[p] = field;
                } else {
                    field = obj[p];
                }
                
                let d = model.$get(field);
                //数据赋值
                if (d !== undefined) {
                    //对象需要克隆
                    if(typeof d === 'object'){
                        d = Util.clone(d,/^\$/);
                    }
                    m[p] = d;
                }
                //反向处理
                if (reverse) {
                    m.$watch(p, function (ov, nv) {
                        if (model) {
                            model.$set(field, nv);
                        }
                    });
                }
            });
        },
        9
    );
    
    /**
     * 指令名 field
     * 描述：字段指令
     */
    createDirective('field',
        function(module:Module,dom:Element){
            const me = this;
            const type: string = dom.getProp('type');
            const tgname = dom.tagName.toLowerCase();
            const model = dom.model;
            
            if (!model) {
                return;
            }

            let dataValue = model.$get(this.value);
            
            if (type === 'radio') {
                let value = dom.getProp('value');
                if (dataValue == value) {
                    dom.assets.set('checked', true);
                    dom.setProp('checked', 'checked');
                } else {
                    dom.assets.set('checked', false);
                    dom.delProp('checked');
                }
            } else if (type === 'checkbox') {
                //设置状态和value
                let yv = dom.getProp('yes-value');
                //当前值为yes-value
                if (dataValue == yv) {
                    dom.setProp('value', yv);
                    dom.assets.set('checked', 'checked');
                } else { //当前值为no-value
                    dom.setProp('value', dom.getProp('no-value'));
                    dom.assets.set('checked',false);
                }
            } else if (tgname === 'select') { //下拉框
                dom.setAsset('value', dataValue);
                dom.setProp('value', dataValue);
            } else {
                let v = (dataValue!==undefined && dataValue!==null)?dataValue:'';
                dom.assets.set('value', v);
                dom.setProp('value',v);
            }

            //初始化
            if(!this.getParam(module,dom,'inited')){
                dom.addEvent(new NEvent('change',
                    function(dom, module, e, el){
                        if (!el) {
                            return;
                        }
                        let type = dom.getProp('type');
                        let field = me.value;
                        let v = el.value;
                        //根据选中状态设置checkbox的value
                        if (type === 'checkbox') {
                            if (dom.getProp('yes-value') == v) {
                                v = dom.getProp('no-value');
                            } else {
                                v = dom.getProp('yes-value');
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
                            this[field] = v;
                        } else {
                            for (let i = 0; i < arr.length - 1; i++) {
                                temp = temp[arr[i]];
                            }
                            temp[arr[arr.length - 1]] = v;
                        }
                        //修改value值，该节点不重新渲染
                        if (type !== 'radio') {
                            dom.setProp('value', v);
                            el.value = v;
                        }
                    }
                ));
                this.setParam(module,dom,'inited',true);
            }
        },
        10
    );

    /**
     * route指令
     */
    createDirective('route',
        function(module:Module,dom:Element){
            //a标签需要设置href
            if (dom.tagName.toLowerCase() === 'a') {
                dom.setProp('href','javascript:void(0)');
            }
            dom.setProp('path', this.value);
            //有激活属性
            if (dom.hasProp('active')) {
                let acName = dom.getProp('active');
                dom.delProp('active');
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
                    (dom, module, e) => {
                        let path = dom.getProp('path');
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
            dom.addEvent(event);
        }
    );

    /**
     * 增加router指令
     */
    createDirective('router',
        function(module:Module,dom:Element){
            dom.setProp('role','module');
            Router.routerKeyMap.set(module.id, dom.key);
        }
    );

    /**
     * 插头指令
     * 用于模块中，可实现同名替换
     */
    createDirective('slot',
        function(module:Module,dom:Element){
            const parent = dom.parent;
            this.value = this.value || 'default';
            let pd:Directive = parent.getDirective(module,'module');
            //父dom有module指令，表示为替代节点，替换子模块中的对应的slot节点；否则为子模块定义slot节点
            if(pd){
                if(module.children.length===0){
                    return;
                }
                let m = ModuleFactory.get(pd.getParam(module,parent,'moduleId'));
                if(m){
                    //缓存当前替换节点
                    m.objectManager.set('$slots.' + this.value,dom);
                }
                
                //设置不渲染
                dom.dontRender = true;
            }else{ //源slot节点
                //获取替换节点进行替换
                let rdom = module.objectManager.get('$slots.' + this.value);
                if(rdom){
                    dom.children = rdom.children;
                }
            }
        },
        5
    );
}());