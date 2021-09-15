import { Directive } from "../core/directive";
import { DirectiveManager } from "../core/directivemanager";
import { Element } from "../core/element";
import { NError } from "../core/error";
import { NEvent } from "../core/event";
import { Expression } from "../core/expression";
import { Model } from "../core/model";
import { Module } from "../core/module";
import { ModuleFactory } from "../core/modulefactory";
import { NodomMessage } from "../core/nodom";
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
     * 用于指定该元素为模块容器，表示该模块的子模块
     * 用法
     *   x-module='moduleclass|modulename|dataurl'
     *   moduleclass 为模块类名
     *   modulename  为模块对象名，可选
     * 可增加 data 属性，用于指定数据url
     * 可增加 name 属性，用于设置模块name，如果x-module已设置，则无效
     */
    DirectiveManager.addType('module', 8,
        (directive: Directive, dom: Element) => {
            let value: string = <string>directive.value;
            let valueArr: string[] = value.split('|');
            directive.value = valueArr[0];
            //设置module name
            if (valueArr.length > 1) {
                dom.setProp('moduleName', valueArr[1]);
            }
            directive.extra = {};
        },

        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            let m: Module;
            //存在moduleId，表示已经渲染过，不渲染
            if (dom.hasProp('moduleId')) {
                m = ModuleFactory.get(parseInt(dom.getProp('moduleId')));
            } else {
                let props = {};
                Object.getOwnPropertyNames(dom.props).forEach(p => {
                    props[p] = dom.props[p];
                });
                Object.getOwnPropertyNames(dom.exprProps).forEach(p => {
                    props[p] = dom.exprProps[p].val(dom.model);
                });
                m = ModuleFactory.get(directive.value,props);
                if (!m) {
                    return;
                }
                // 设置模块id,在virtualDom中
                let dom1 = module.getElement(dom.key,true);
                dom1.setProp('moduleId',m.id);
                dom.setProp('moduleId',m.id);
                // delete dom.props;
                // delete dom.exprProps;
                //保留modelId和当前子模块
                directive.extra = { moduleId: m.id};
                //添加到父模块
                module.addChild(m.id);
                //设置容器
                m.setContainerKey(dom.key);
                //添加到渲染器
                m.active();
            }
        }
    );


    /**
     *  model指令
     */
    DirectiveManager.addType('model',
        1,
        (directive: Directive, dom: Element) => {
            let value: string = <string>directive.value;
            //处理以.分割的字段，没有就是一个
            if (Util.isString(value)) {
                directive.value = value;
            }
        },

        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            let model: Model = dom.model;
            if (directive.value == '$$') {
                model = module.model;
            } else {
                model = model.$get(directive.value);
            }
            if (!model) {
                model = module.model.$get(directive.value);
            }
            if (model) {
                dom.model = model;
            }
        }
    );

    /**
     * 指令名 repeat
     * 描述：重复指令
     */
    DirectiveManager.addType('repeat',
        2,
        (directive: Directive, dom: Element) => {

        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            dom.dontRender = true;
            let rows = directive.value;
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
        }
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
    DirectiveManager.addType('recur',
        3,
        (directive: Directive, dom: Element, parent: Element) => {
        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            let model = dom.model;
            if (!model) {
                return;
            }
            let data = model[directive.value];
            // 渲染时，去掉model指令，避免被递归节点使用
            dom.removeDirectives('model');

            //处理内部递归节点
            if (data) {
                if (Array.isArray(data)) { //为数组，则遍历生成多个节点
                    // 先克隆一个用作基本节点，避免在循环中为基本节点增加子节点
                    let node: Element = dom.clone(true);
                    for (let d of data) {
                        let nod: Element = node.clone(true);
                        nod.model = d;
                        //作为当前节点子节点
                        dom.add(nod);
                    }
                } else {
                    let node: Element = dom.clone(true);
                    node.model = data;
                    //作为当前节点子节点
                    dom.add(node);
                }
            }
        }
    );

    /**
     * 指令名 if
     * 描述：条件指令
     */
    DirectiveManager.addType('if',
        5,
        (directive: Directive, dom: Element, parent: Element) => {
        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            dom.dontRender = !directive.value;
        }
    );

    /**
     * 指令名 else
     * 描述：else指令
     */
    DirectiveManager.addType('else',
        5,
        (directive: Directive, dom: Element, parent: Element) => {

        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            dom.dontRender = true;
            let index = parent.children.findIndex(item => item.key === dom.key);
            if (index === -1) {
                return;
            }
            for (let i = index - 1; i >= 0; i--) {
                let c = parent.children[i];
                //不处理非标签
                if (!c.tagName) {
                    continue;
                }
                // 前一个元素不含if和elseif指令，则不处理
                if (!c.hasDirective('if') && !c.hasDirective('elseif')) {
                    break;
                }
                let d = c.getDirective('elseif') || c.getDirective('if');
                if (d && d.value) {
                    return;
                }
            }
            dom.dontRender = false;
        }
    );

    /**
     * elseif 指令
     */
    DirectiveManager.addType('elseif', 5,
        (directive: Directive, dom: Element, parent: Element) => {

        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            dom.dontRender = !directive.value;
        }
    );

    /**
     * 指令名 show
     * 描述：显示指令
     */
    DirectiveManager.addType('show',
        5,
        (directive: Directive, dom: Element) => {
            
        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            dom.dontRender = !directive.value;
        }
    );

    /**
     * 指令名 data
     * 描述：从当前模块获取数据并用于子模块，dom带module指令时有效
     */
    DirectiveManager.addType('data',
        9,
        (directive: Directive, dom: Element) => {

        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            if (typeof directive.value !== 'object') {
                return;
            }
            let mdlDir = dom.getDirective('module');
            if (!mdlDir || !mdlDir.extra.moduleId) {
                return;
            }
            let obj = directive.value;
            //子模块
            let subMdl = ModuleFactory.get(mdlDir.extra.moduleId);
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
        }
    );
    
    /**
     * 指令名 field
     * 描述：字段指令
     */
    DirectiveManager.addType('field',
        10,
        (directive: Directive, dom: Element) => {
            dom.setProp('name', directive.value);
            //默认text
            let type = dom.getProp('type') || 'text';
            let eventName = dom.tagName === 'input' && ['text', 'checkbox', 'radio'].includes(type) ? 'input' : 'change';
            //增加value表达式
            if (!dom.hasProp('value') && ['text', 'number', 'date', 'datetime', 'datetime-local', 'month', 'week', 'time', 'email', 'password', 'search', 'tel', 'url', 'color', 'radio'].includes(type)
                || dom.tagName === 'TEXTAREA') {
                dom.setProp('value', new Expression(directive.value), true);
            }

            dom.addEvent(new NEvent(eventName,
                function (dom, module, e, el) {
                    if (!el) {
                        return;
                    }
                    let type = dom.getProp('type');
                    let field = dom.getDirective('field').value;
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
        },

        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            const type: string = dom.getProp('type');
            const tgname = dom.tagName.toLowerCase();
            const model = dom.model;
            if (!model) {
                return;
            }

            let dataValue = model.$get(directive.value);
            //变为字符串
            if (dataValue !== undefined && dataValue !== null) {
                dataValue += '';
            }
            //无法获取虚拟dom的value，只能从对应的element获取
            let el: any = module.getNode(dom.key);
            let value = el ? el.value : undefined;

            if (type === 'radio') {
                if (dataValue + '' === value) {
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
                if (dataValue + '' === yv) {
                    dom.setProp('value', yv);
                    dom.assets.set('checked', true);
                } else { //当前值为no-value
                    dom.setProp('value', dom.getProp('no-value'));
                    dom.assets.set('checked', false);
                }
            } else if (tgname === 'select') { //下拉框
                if (!directive.extra || !directive.extra.inited) {
                    setTimeout(() => {
                        directive.extra = { inited: true };
                        dom.setProp('value', dataValue);
                        dom.setAsset('value', dataValue);
                        Renderer.add(module);
                    }, 0);
                } else {
                    if (dataValue !== value) {
                        dom.setProp('value', dataValue);
                        dom.setAsset('value', dataValue);
                    }
                }
            } else {
                dom.assets.set('value', dataValue === undefined || dataValue === null ? '' : dataValue);
            }
        }
    );

    /**
     * 指令名 validity
     * 描述：字段指令
     */
    DirectiveManager.addType('validity',
        10,
        (directive: Directive, dom: Element) => {
            let ind, fn, method;
            let value = directive.value;
            //处理带自定义校验方法
            if ((ind = value.indexOf('|')) !== -1) {
                fn = value.substr(0, ind);
                method = value.substr(ind + 1);
            } else {
                fn = value;
            }
            directive.extra = { initEvent: false };
            directive.value = fn;

            directive.params = {
                enabled: false //不可用
            }
            //如果有方法，则需要存储
            if (method) {
                directive.params.method = method;
            }
            //如果没有子节点，添加一个，需要延迟执行
            if (dom.children.length === 0) {
                let vd1 = new Element();
                vd1.textContent = '';
                dom.add(vd1);
            } else { //子节点
                dom.children.forEach((item) => {
                    if (item.children.length === 0) {
                        let vd1 = new Element();
                        vd1.textContent = '   ';
                        item.add(vd1);
                    }
                });
            }
        },

        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            setTimeout(() => {
                const el: HTMLInputElement = <HTMLInputElement>module.getNode({ name: directive.value });
                if (!directive.extra.initEvent) {
                    directive.extra.initEvent = true;
                    //添加focus和blur事件
                    el.addEventListener('focus', function () {
                        setTimeout(() => { directive.params.enabled = true; }, 0);
                    });
                    el.addEventListener('blur', function () {
                        Renderer.add(module);
                    });
                }
            }, 0);

            //未获取focus，不需要校验
            if (!directive.params.enabled) {
                dom.dontRender = true;
                return;
            }

            const el: HTMLInputElement = <HTMLInputElement>module.getNode({ name: directive.value });
            if (!el) {
                return;
            }

            let chds = [];
            //找到带rel的节点
            dom.children.forEach((item) => {
                if (item.tagName !== undefined && item.hasProp('rel')) {
                    chds.push(item);
                }
            });

            let resultArr = [];

            //自定义方法校验
            if (directive.params.method) {
                const foo = module.getMethod(directive.params.method);
                if (Util.isFunction(foo)) {
                    let r = foo.call(module.model, el.value);
                    if (!r) {
                        resultArr.push('custom');
                    }
                }
            }

            let vld = el.validity;

            if (!vld.valid) {
                // 查找校验异常属性
                for (var o in vld) {
                    if (vld[o] === true) {
                        resultArr.push(o);
                    }
                }
            }

            if (resultArr.length > 0) {
                //转换成ref对应值
                let vn = handle(resultArr);
                //单个校验
                if (chds.length === 0) {
                    setTip(dom, vn, el);
                } else { //多个校验
                    for (let i = 0; i < chds.length; i++) {
                        let rel = chds[i].getProp('rel');
                        if (rel === vn) {
                            setTip(chds[i], vn, el);
                        } else { //隐藏
                            chds[i].dontRender = true;
                        }
                    }
                }
            } else {
                dom.dontRender = true;
            }

            /**
             * 设置提示
             * @param vd    虚拟dom节点
             * @param vn    验证结果名
             * @param el    验证html element
             */
            function setTip(vd: Element, vn: string, el?: HTMLElement) {
                //子节点不存在，添加一个
                let text = (<string>vd.children[0].textContent).trim();
                if (text === '') { //没有提示内容，根据类型提示
                    text = Util.compileStr(NodomMessage.FormMsgs[vn], el.getAttribute(vn));
                }
                vd.children[0].textContent = text;
            }

            /**
             * 验证名转换
             */
            function handle(arr: Array<string>) {
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
        }
    );

    /**
     * 增加route指令
     */
    DirectiveManager.addType('route',
        10,
        (directive: Directive, dom: Element) => {
            //a标签需要设置href
            if (dom.tagName.toLowerCase() === 'a') {
                dom.setProp('href', 'javascript:void(0)');
            }
            if (dom.hasProp('active')) {
                let ac = dom.getProp('active');
                //active 转expression
                dom.setProp('active', new Expression(ac), true);
                //保存activeName
                directive.extra = { activeName: ac };
            }
            // 不重复添加route event
            let evt = dom.getEvent('click');
            if (evt) {
                if (Array.isArray(evt)) {
                    for (let ev of evt) { //已存在路由事件
                        if (ev.getExtraParam('routeEvent')) {
                            return;
                        }
                    }
                } else if (evt.getExtraParam('routeEvent')) {
                    return;
                }
            }

            //添加click事件
            evt = new NEvent('click',
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
            //设置路由标识
            evt.setExtraParam('routeEvent', true);
            dom.addEvent(evt);
        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            // 设置激活字段
            if (directive.extra) {
                Router.addActiveField(module, directive.value, dom.model, directive.extra.activeName);
            }
            dom.setProp('path', directive.value);

            //延迟激活（指令执行后才执行属性处理，延迟才能获取active prop的值）
            setTimeout(() => {
                // 路由路径以当前路径开始
                if (dom.getProp('active') === true && directive.value.startsWith(Router.currentPath)) {
                    Router.go(directive.value);
                }
            }, 0);
        }
    );

    /**
     * 增加router指令
     */
    DirectiveManager.addType('router',
        10,
        (directive, dom) => {
            
        },
        (directive, dom, module, parent) => {
            Router.routerKeyMap.set(module.id, dom.key);
        }
    );

    /**
     * 插头指令
     * 用于模块中，可实现同名替换
     */
    DirectiveManager.addType('swap',
        5,
        (directive:Directive, dom: Element,module:Module,parent:Element) => {
            if(!module){
                return;
            }
            directive.value = directive.value || 'default';
        },
        (directive:Directive, dom:Element, module:Module, parent:Element) => {
            console.log(dom);
            let pd:Directive = parent.getDirective('module');
            if(pd){ //父模块替代dom，替换子模块中的plug
                if(module.children.length===0){
                    return;
                }
                let m = ModuleFactory.get(module.children[module.children.length-1]);
                if(m){
                    // 加入等待替换map
                    add(m,directive.value,dom);
                }
                //设置不渲染
                dom.dontRender = true;
                // module.virtualDom.remove(dom.key);
            }else{ // 原模版plug指令
                // 如果父dom带module指令，则表示为替换，不加入plug map
                replace(module,directive.value,dom);
            }

            /**
             * 添加到待替换的swap map
             * @param mm 
             * @param name 
             * @param dom 
             */
            function add(module:Module,name:string,dom:Element){
                if(!module.swapMap){
                    module.swapMap = new Map();
                }
                module.swapMap.set(name,dom);
                console.log(name,dom.key);
            }

            /**
             * 替换dom树中swap
             * @param name      
             * @param dom 
             */
            function replace(module:Module,name:string,dom:Element){
                if(!module.swapMap || !module.swapMap.has(name)){
                    return;
                }
                let rdom = module.swapMap.get(name);
                //替换源swap节点的子节点
                dom.children = rdom.children;
            }
        }
    );
}());