import { Directive } from "../core/directive";
import { Element } from "../core/element";
import { NEvent } from "../core/event";
import { Expression } from "../core/expression";
import { Model } from "../core/model";
import { Module } from "../core/module";
import { ModuleFactory } from "../core/modulefactory";
import { createDirective, createRoute } from "../core/nodom";
import { Renderer } from "../core/renderer";
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
        function(){
            const [dom,module,parent] = [this.dom,this.module,this.dom.parent];
            let m: Module;
            let props = {};
            Object.getOwnPropertyNames(dom.props).forEach(p => {
                props[p] = dom.props[p];
            });
            Object.getOwnPropertyNames(dom.exprProps).forEach(p => {
                props[p] = dom.exprProps[p].val(dom.model);
            });
            //存在moduleId，表示已经渲染过，不渲染
            let mid = this.getParam('moduleId');
            if (mid) {
                m = ModuleFactory.get(mid);
                if(!dom.hasProp('once')){
                    //设置props，如果改变了props，启动渲染
                    m.setProps(props,true);    
                }
            } else {
                m = ModuleFactory.get(this.value);
                if (!m) {
                    return;
                }
                
                // 后面不再执行表达式属性
                delete dom.exprProps;

                //保留modelId
                this.setParam('moduleId',m.id);
                //添加到父模块
                module.addChild(m.id);
                //设置容器
                m.setContainerKey(dom.key);
                //添加到渲染器
                m.active();
                //设置props，如果改变了props，启动渲染
                m.setProps(props,true);
            }
        },
        8
    );

    /**
     *  model指令
     */
    createDirective(
        'model',
        function(){
            const dom = this.dom;
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
        function(){
            const [dom,module,parent] = [this.dom,this.module,this.dom.parent];
            dom.dontRender = true;
            let rows = this.value;
            // 无数据，不渲染
            if (!Util.isArray(rows) || rows.length === 0) {
                return;
            }
            dom.dontRender = false;
            let chds = [];
            let key = dom.key;
            // 移除指令
            dom.removeDirectives(['repeat']);
            
            for (let i = 0; i < rows.length; i++) {
                let node = dom.clone();
                //设置modelId
                node.model = rows[i];
                //设置key
                if (rows[i].$key) {
                    setKey(node, key, rows[i].$key);
                }
                else {
                    setKey(node, key, Util.genId());
                }
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

            function setKey(node, key, id) {
                node.key = key + '_' + id;
                node.children.forEach((dom) => {
                    setKey(dom, dom.key, id);
                });
            }
        },
        2
    );

    /**
     * 递归指令
     * 作用：在dom内部递归，即根据数据层复制节点作为前一层的子节点
     * 数据格式：
     * data:{
     *     recurItem:{
    *          title:'第一层',
    *          recurItem:{
    *              title:'第二层',
    *              recurItem:{...}
    *          }
    *      }
     * }
     * 模版格式：
     * <div x-recursion='items'><span>{{title}}</span></div>
     */
    createDirective(
        'recur',
        function(){
            const [dom,module,parent] = [this.dom,this.module,this.dom.parent];
            let model = dom.model;
            if (!model) {
                return;
            }
            let data = model[this.value];
            // 渲染时，去掉model指令，避免被递归节点使用
            dom.removeDirectives('model');

            //处理内部递归节点
            if (data) {
                if (Array.isArray(data)) { //为数组，则遍历生成多个节点
                    // 先克隆一个用作基本节点，避免在循环中为基本节点增加子节点
                    let node: Element = dom.clone();
                    for (let d of data) {
                        let nod: Element = node.clone();
                        nod.model = d;
                        //作为当前节点子节点
                        dom.add(nod);
                    }
                } else {
                    let node: Element = dom.clone();
                    node.model = data;
                    //作为当前节点子节点
                    dom.add(node);
                }
            }
        },
        3
    );

    /**
     * 指令名 if
     * 描述：条件指令
     */
    createDirective('if',
        function(){
            const [dom,module,parent] = [this.dom,this.module,this.dom.parent];
            module.saveCache(`${parent.key}.directives.tmp.if`,this.value);
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
        function(){
            //如果前面的if/elseif值为true或undefined，则隐藏，否则显示
            const [dom,module,parent] = [this.dom,this.module,this.dom.parent];
            dom.dontRender = (module.readCache(`${parent.key}.directives.tmp.if`)===true);
        },
        5
    );

    /**
     * elseif 指令
     */
    createDirective('elseif', 
        function(){
            const [dom,module,parent] = [this.dom,this.module,this.dom.parent];
            let v = module.readCache(`${parent.key}.directives.tmp.if`);
            if(v === undefined || v === true || !this.value){
                dom.dontRender = true;
            }else{
                module.saveCache(`${parent.key}.directives.tmp.if`,true);
                dom.dontRender = false;
            }
        },
        5
    );

    /**
     * elseif 指令
     */
     createDirective(
         'endif', 
        function(){
            const [module,parent] = [this.module,this.dom.parent];
            module.removeCache(`${parent.key}.directives.tmp.if`);
        },
        5
    );

    /**
     * 指令名 show
     * 描述：显示指令
     */
    createDirective(
        'show',
        function(){
            this.dom.dontRender = !this.value;
        },
        5
    );

    /**
     * 指令名 data
     * 描述：从当前模块获取数据并用于子模块，dom带module指令时有效
     */
    createDirective('data',
        function(){
            const dom = this.dom;
            if (typeof this.value !== 'object') {
                return;
            }
            let mdlDir = dom.getDirective('module');
            if (!mdlDir) {
                return;
            }
            let mid = mdlDir.getParam('moduleId');
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
        function(){
            const [me,dom] = [this,this.dom];
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
            if(!this.getParam('inited')){
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
                this.setParam('inited',true);
            }
        },
        10
    );

    /**
     * route指令
     */
    createDirective('route',
        function(){
            const [dom,module] = [this.dom,this.module];
            //a标签需要设置href
            if (dom.tagName.toLowerCase() === 'a') {
                dom.setProp('href','javascript:void(0)');
            }

            if (dom.hasProp('active')) {
                let ac = dom.getProp('active');
                //active 转expression
                dom.setProp('active',new Expression(ac),true);
                //保存activeName
                this.setParam('activeName',ac);
            }
            dom.setProp('path', this.value);
            
            let ac = this.getParam('activeName');
            // 设置激活字段
            if (ac) {
                Router.addActiveField(module, this.value, dom.model, ac);
            }

            //延迟激活（指令执行后才执行属性处理，延迟才能获取active prop的值）
            setTimeout(()=>{
                // 路由路径以当前路径开始
                if (dom.getProp('active') === true && this.value.startsWith(Router.currentPath)) {
                    Router.go(this.value);
                }
            }, 0);

            //尚未加载事件
            if(!this.getParam('routeEvent')){
                //添加click事件
                let evt:NEvent = new NEvent('click',
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
                dom.addEvent(evt);
                //设置route事件标志
                this.setParam('routeEvent',true);
            }
        }
    );

    /**
     * 增加router指令
     */
    createDirective('router',
        function(){
            const [dom,module] = [this.dom,this.module];
            Router.routerKeyMap.set(module.id, dom.key);
        }
    );

    /**
     * 插头指令
     * 用于模块中，可实现同名替换
     */
    createDirective('swap',
        function(){
            this.value = this.value || 'default';
            const [dom,parent,module] = [this.dom,this.dom.parent,this.module];
            let pd:Directive = parent.getDirective('module');
            if(pd){ //父模块替代dom，替换子模块中的plug
                if(module.children.length===0){
                    return;
                }
                let m = ModuleFactory.get(module.children[module.children.length-1]);
                if(m){
                    // 加入等待替换map
                    add(m,this.value,dom);
                }
                //设置不渲染
                dom.dontRender = true;
            }else{ // 原模版plug指令
                // 如果父dom带module指令，则表示为替换，不加入plug map
                replace(module,this.value,dom);
            }

            /**
             * 添加到待替换的 map
             * @param name      替代器 name
             * @param dom       替代dom
             */
            function add(module:Module,name:string,dom:Element){
                if(!module.swapMap){
                    module.swapMap = new Map();
                }
                module.swapMap.set(name,dom);
            }

            /**
             * 替换dom树中swap
             * @param name     替代器名 
             * @param dom       被替代的dom
             */
            function replace(module:Module,name:string,dom:Element){
                if(!module.swapMap || !module.swapMap.has(name)){
                    return;
                }
                let rdom = module.swapMap.get(name);
                //替换源swap节点的子节点
                dom.children = rdom.children;
            }
        },
        5
    );
}());