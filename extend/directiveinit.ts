import { Directive } from "../core/directive";
import { DirectiveManager } from "../core/directivemanager";
import { Element } from "../core/element";
import { NEvent } from "../core/event";
import { Expression } from "../core/expression";
import { Model } from "../core/model";
import { Module } from "../core/module";
import { ModuleFactory } from "../core/modulefactory";
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

        },

        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            let m: Module;
            let props = {};
            Object.getOwnPropertyNames(dom.props).forEach(p => {
                props[p] = dom.props[p];
            });
            Object.getOwnPropertyNames(dom.exprProps).forEach(p => {
                props[p] = dom.exprProps[p].val(dom.model);
            });
            //存在moduleId，表示已经渲染过，不渲染
            let mid = directive.getParam(module, dom, 'moduleId');
            if (mid) {
                m = ModuleFactory.get(mid);
            } else {

                m = ModuleFactory.get(directive.value);
                if (!m) {
                    return;
                }

                dom.setProp('moduleId', m.id);
                // delete dom.props;
                // delete dom.exprProps;
                //保留modelId
                directive.setParam(module, dom, 'moduleId', m.id);

                //添加到父模块
                module.addChild(m.id);
                //设置容器
                m.setContainerKey(dom.key);
                //添加到渲染器
                m.active();
            }
            if (m) { //设置props，如果改变了props，启动渲染
                m.setProps(props, true);
            }
        }
    );

    /**
     *  model指令
     */
    DirectiveManager.addType('model',
        1,
        (directive: Directive, dom: Element) => { },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            let model: Model = dom.model.$get(directive.value);
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
        (directive: Directive, dom: Element) => { },
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
            console.log(chds);
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
            if (!mdlDir) {
                return;
            }
            let mid = mdlDir.getParam(module, dom, 'moduleId');
            if (!mid) {
                return;
            }
            let obj = directive.value;
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
                if (!directive.getParam(module, dom, 'inited')) {
                    setTimeout(() => {
                        directive.setParam(module, dom, 'inited', true);
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
     * 增加route指令
     */
    DirectiveManager.addType('route',
        10,
        (directive: Directive, dom: Element, module: Module) => {
            //a标签需要设置href
            if (dom.tagName.toLowerCase() === 'a') {
                dom.setProp('href', 'javascript:void(0)');
            }
            if (dom.hasProp('active')) {
                let ac = dom.getProp('active');
                //active 转expression
                dom.setProp('active', new Expression(ac), true);
                //保存activeName
                directive.setParam(module, dom, 'activeName', ac);
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
            let ac = directive.getParam(module, dom, 'activeName');
            // 设置激活字段
            if (ac) {
                Router.addActiveField(module, directive.value, dom.model, ac);
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
        (directive, dom) => { },
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
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            if (!module) {
                return;
            }
            directive.value = directive.value || 'default';
        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            // console.log(dom);
            let pd: Directive = parent.getDirective('module');
            if (pd) { //父模块替代dom，替换子模块中的plug
                if (module.children.length === 0) {
                    return;
                }
                let m = ModuleFactory.get(module.children[module.children.length - 1]);
                if (m) {
                    // 加入等待替换map
                    add(m, directive.value, dom);
                }
                //设置不渲染
                dom.dontRender = true;
                // module.virtualDom.remove(dom.key);
            } else { // 原模版plug指令
                // 如果父dom带module指令，则表示为替换，不加入plug map
                replace(module, directive.value, dom);
            }

            /**
             * 添加到待替换的 map
             * @param name      替代器 name
             * @param dom       替代dom
             */
            function add(module: Module, name: string, dom: Element) {
                if (!module.swapMap) {
                    module.swapMap = new Map();
                }
                module.swapMap.set(name, dom);
            }

            /**
             * 替换dom树中swap
             * @param name     替代器名 
             * @param dom       被替代的dom
             */
            function replace(module: Module, name: string, dom: Element) {
                if (!module.swapMap || !module.swapMap.has(name)) {
                    return;
                }
                let rdom = module.swapMap.get(name);
                //替换源swap节点的子节点
                dom.children = rdom.children;
            }
        }
    );


    /**
    * 动画指令  
    * 描述：显示指令
    */
    //#region  
    DirectiveManager.addType('animation',
        9,
        (directive: Directive, dom: Element) => {
        },
        (directive: Directive, dom: Element, module: Module, parent: Element) => {
            let model = dom.model;
            const confObj = directive.value;
            if (!Util.isObject(confObj)) {
                throw new Error('未找到animation配置对象');
            }

            // 获得tigger
            const tigger = confObj.tigger;

            // 用于判断是动画还是过渡
            const type = confObj.type || "transition";
            // 用于判断是否是 进入/离开动画 
            const isAppear = confObj.isAppear == false ? false : true;

            // 提取 动画/过渡 名
            const nameEnter = confObj.name?.enter || confObj.name;
            const nameLeave = confObj.name?.leave || confObj.name;

            // 提取 动画/过渡 持续时间
            const durationEnter = confObj.duration?.enter || confObj.duration || '0s';
            const durationLeave = confObj.duration?.leavr || confObj.duration || '0s';

            // 提取 动画/过渡 延迟时间
            const delayEnter = confObj.delay?.enter || confObj.delay || '0s';
            const delayLeave = confObj.delay?.leave || confObj.delay || '0s';

            // 提取 动画/过渡 时间函数
            const timingFunctionEnter = confObj.timingFunction?.enter || confObj.timingFunction || 'ease';
            const timingFunctionLeave = confObj.timingFunction?.leave || confObj.timingFunction || 'ease';

            // 提取动画/过渡 钩子函数
            const beforeEnter =
                confObj.hooks?.enter?.before ? confObj.hooks.enter.before : confObj.hooks?.before || undefined;
            const afterEnter =
                confObj.hooks?.enter?.after ? confObj.hooks.enter.after : confObj.hooks?.after || undefined;
            const beforeLeave =
                confObj.hooks?.leave?.before ? confObj.hooks.leave.before : confObj.hooks?.before || undefined;
            const afterLeave =
                confObj.hooks?.leave?.after ? confObj.hooks.leave.after : confObj.hooks?.after || undefined;

            // 提取 离开动画结束之后 元素的隐藏模式
            const hiddenMode = confObj.hiddenMode || 'display';

            // 定义动画或者过渡结束回调。
            let handler = () => {
                const el: HTMLElement = document.querySelector(`[key='${dom.key}']`)
                // 离开动画结束之后隐藏元素
                if (!tigger) {
                    if (isAppear) {
                        // 离开动画结束之后 把元素隐藏
                        if (hiddenMode && hiddenMode == 'visibility') {
                            el.style.visibility = 'hidden';
                        } else {
                            el.style.display = 'none';
                        }
                    }
                    if (afterLeave) {
                        afterLeave.apply(module.model, [module]);
                    }
                    [el.style.width, el.style.height] = getOriginalWidthAndHeight(dom);
                    // 结束之后删除掉离开动画相关的类
                    el.classList.remove(nameLeave + '-leave-active')
                } else {
                    if (afterEnter) {
                        afterEnter.apply(module.model, [module]);
                    }
                    // 进入动画结束之后删除掉相关的类
                    el.classList.remove(nameEnter + '-enter-active')
                }
                // confObj.tigger = false;
                // 清除事件监听
                el.removeEventListener('animationend', handler);
                el.removeEventListener('transitionend', handler);
            }

            // 获得真实dom
            let el: HTMLElement = document.querySelector(`[key='${dom.key}']`)

            if (!tigger) {
                // tigger为false 播放Leave动画
                if (el) {
                    if (el.getAttribute('class').indexOf(`${nameLeave}-leave-to`) != -1) {
                        // 当前已经处于leave动画播放完成之后了，直接返回
                        return
                    }
                    // 调用函数触发 Leave动画/过渡
                    changeStateFromShowToHide(el);
                } else {
                    // el不存在，第一次渲染
                    if (isAppear) {
                        // 是进入离开动画，管理初次渲染的状态，让他隐藏
                        if (hiddenMode && hiddenMode == 'visibility') {
                            dom.addStyle('visibility:hidden')
                        } else {
                            dom.addStyle('display:none')
                        }
                    }
                    // 通过虚拟dom将元素渲染出来
                    dom.dontRender = false;
                    // 下一帧
                    setTimeout(() => {
                        // el已经渲染出来，取得el 根据动画/过渡的类型来做不同的事
                        let el: HTMLElement = document.querySelector(`[key='${dom.key}']`);
                        if (isAppear) {
                            // 动画/过渡 是进入离开动画/过渡，并且当前是需要让他隐藏所以我们不播放动画，直接隐藏。
                            if (hiddenMode && hiddenMode == 'visibility') {
                                dom.removeStyle('visibility:hidden');
                                el.style.visibility = 'hidden';
                            } else {
                                dom.removeStyle('display:none');
                                el.style.display = 'none'
                            }
                        } else {
                            //  动画/过渡 是 **非进入离开动画/过渡** 我们不管理元素的隐藏，所以我们让他播放一次Leave动画。
                            changeStateFromShowToHide(el);
                        }
                    }, 0);
                }
            } else {
                // tigger为true 播放Enter动画
                if (el) {
                    if (el.getAttribute('class').indexOf(`${nameEnter}-enter-to`) != -1) {
                        return;
                    }

                    // 调用函数触发Enter动画/过渡
                    changeStateFromHideToShow(el);
                } else {
                    // el不存在，是初次渲染
                    if (isAppear) {
                        // 管理初次渲染元素的隐藏显示状态
                        if (hiddenMode && hiddenMode == 'visibility') {
                            dom.addStyle('visibility:hidden')
                        } else {
                            dom.addStyle('display:none')
                        }
                    }
                    // 让他渲染出来
                    dom.dontRender = false;
                    // 下一帧
                    setTimeout(() => {
                        // 等虚拟dom把元素更新上去了之后，取得元素
                        let el: HTMLElement = document.querySelector(`[key='${dom.key}']`);
                        if (isAppear) {
                            if (hiddenMode && hiddenMode == 'visibility') {
                                dom.removeStyle('visibility:hidden');
                                el.style.visibility = 'hidden';
                            } else {
                                dom.removeStyle('display:none');
                                el.style.display = 'none'
                            }
                        }
                        // Enter动画与Leave动画不同，
                        //不管动画是不是进入离开动画，我们在初次渲染的时候都要执行一遍动画
                        // Leave动画不一样，如果是开始离开动画，并且初次渲染的时候需要隐藏，那么我们没有必要播放一遍离开动画
                        changeStateFromHideToShow(el);
                    }, 0);
                }
            }
            /**
             * 播放Leave动画
             * @param el 真实dom
             */
            function changeStateFromShowToHide(el: HTMLElement) {
                // 动画类型是transitiojn
                if (type == 'transition') {
                    // 移除掉上一次过渡的最终状态
                    el.classList.remove(nameEnter + '-enter-to')

                    // 设置过渡的类名
                    el.classList.add(nameLeave + '-leave-active');

                    // 设置离开过渡的开始类
                    el.classList.add(nameLeave + '-leave-from');

                    // 获得宽高的值 因为 宽高的auto 百分比 calc计算值都无法拿来触发动画或者过渡。
                    let [width, height] = getElRealSzie(el);

                    if (nameLeave == 'fold-height') {
                        el.style.height = height;
                    } else if (nameLeave == 'fold-width') {
                        el.style.width = width;
                    }
                    let delay = parseFloat(delayEnter) * 1000
                    // 处理离开过渡的延时
                    // el.style.transitionDelay = delayEnter;
                    el.style.transitionDelay = '0s';
                    // 处理过渡的持续时间
                    if (durationEnter != '0s') {
                        el.style.transitionDuration = durationEnter;
                    }
                    // 处理过渡的时间函数
                    if (timingFunctionEnter != 'ease') {
                        el.style.transitionTimingFunction = timingFunctionEnter;
                    }
                    // 在触发过渡之前执行hook
                    if (beforeLeave) {
                        beforeLeave.apply(module.model, [module]);
                    }
                    // 前面已经对transition的初始状态进行了设置，我们需要在下一帧设置结束状态才能触发过渡
                    setTimeout(() => {
                        // 添加结束状态
                        el.classList.add(nameLeave + '-leave-to');
                        // 在动画或者过渡开始之前移除掉初始状态
                        el.classList.remove(nameLeave + '-leave-from');

                        if (nameLeave == 'fold-height') {
                            el.style.height = '0px';
                        } else if (nameLeave == 'fold-width') {
                            el.style.width = '0px';
                        }
                        // 添加过渡结束事件监听
                        el.addEventListener('transitionend', handler);
                    }, delay);
                } else {
                    // 动画类型是aniamtion
                    el.classList.remove(nameEnter + '-enter-to');
                    // 设置动画的类名
                    el.classList.add(nameLeave + '-leave-active');

                    el.classList.add(nameLeave + '-leave-to')
                    // 动画延时时间
                    if (delayLeave != '0s') {
                        el.style.animationDelay = delayLeave;
                    }
                    // 动画持续时间
                    if (durationLeave != '0s') {
                        el.style.animationDuration = durationLeave;
                    }

                    if (timingFunctionLeave != 'ease') {
                        el.style.animationTimingFunction = timingFunctionLeave;
                    }

                    // 在触发动画之前执行hook
                    if (beforeLeave) {
                        beforeLeave.apply(module.model, [module]);
                    }
                    // 重定位一下触发动画
                    void el.offsetWidth;
                    //添加动画结束时间监听
                    el.addEventListener('animationend', handler);
                }
            }

            /**
             * 播放Enter动画
             * @param el 真实dom
             */
            function changeStateFromHideToShow(el: HTMLElement) {
                // 动画类型是transition
                if (type == 'transition') {

                    // 移除掉上一次过渡的最终状态
                    el.classList.remove(nameLeave + '-leave-to');
                    // 添加过渡的类名
                    el.classList.add(nameEnter + '-enter-active');
                    // 给进入过渡设置开始类名
                    el.classList.add(nameEnter + '-enter-from');
                    // 获得元素的真实尺寸
                    let [width, height] = getElRealSzie(el);
                    if (nameEnter == 'fold-height') {
                        el.style.height = '0px'
                    } else if (nameEnter == 'fold-width') {
                        el.style.width = '0px'
                    }
                    // 设置过渡持续时间
                    if (durationEnter != '0s') {
                        el.style.transitionDuration = durationEnter;
                    }
                    // 设置过渡时间函数
                    if (timingFunctionEnter != 'ease') {
                        el.style.transitionTimingFunction = timingFunctionEnter;
                    }
                    // 对于进入/离开动画
                    // Enter过渡的延迟时间与Leave过渡的延迟时间处理不一样
                    // 我们这里把延迟统一设置成0s，然后通过定时器来设置延时，
                    // 这样可以避免先渲染一片空白区域占位，然后再延时一段时间执行过渡效果。
                    el.style.transitionDelay = '0s';
                    let delay = parseFloat(delayEnter) * 1000;
                    setTimeout(() => {
                        // 下一帧请求过渡效果
                        requestAnimationFrame(() => {
                            // 过渡开始之前先将元素显示
                            if (isAppear) {
                                if (hiddenMode && hiddenMode == 'visibility') {
                                    el.style.visibility = 'visible';
                                } else {
                                    el.style.display = '';
                                }
                            }
                            // 再下一帧触发过渡 否则过渡触发不了
                            requestAnimationFrame(() => {
                                if (beforeEnter) {
                                    beforeEnter.apply(module.model, [module]);
                                }
                                // 增加 过渡 结束类名
                                el.classList.add(nameEnter + '-enter-to');
                                // 移除过渡的开始类名
                                el.classList.remove(nameEnter + '-enter-from');

                                if (nameEnter == 'fold-height') {
                                    el.style.height = height;
                                } else if (nameEnter == 'fold-width') {
                                    el.style.width = width;
                                }
                                el.addEventListener('transitionend', handler);
                            })
                        })
                    }, delay);
                } else {
                    // 动画类型是aniamtion
                    // 设置动画的持续时间
                    if (durationEnter != '0s') {
                        el.style.animationDuration = durationEnter;
                    }
                    // 设置动画的时间函数
                    if (timingFunctionEnter != 'ease') {
                        el.style.animationTimingFunction = durationEnter;
                    }

                    // 这里动画的延迟时间也与过渡类似的处理方式。
                    el.style.animationDelay = "0s";
                    let delay = parseFloat(delayEnter) * 1000;
                    setTimeout(() => {
                        // 动画开始之前先将元素显示
                        if (isAppear) {
                            if (hiddenMode && hiddenMode == 'visibility') {
                                el.style.visibility = 'visible';
                            } else {
                                el.style.display = '';
                            }
                        }
                        el.classList.remove(nameLeave + '-leave-to');
                        // 设置动画的类名
                        el.classList.add(nameEnter + '-enter-active');

                        el.classList.add(nameEnter + '-enter-to')
                        // 在触发过渡之前执行hook 
                        if (beforeEnter) {
                            beforeEnter.apply(module.model, [module]);
                        }
                        // 重定位一下触发动画
                        void el.offsetWidth;
                        el.addEventListener('animationend', handler);
                    }, delay);
                }
            }

            /**
             * 获取真实dom绘制出来之后的宽高
             * @param el 真实dom
             * @returns 真实dom绘制出来之后的宽高
             */
            function getElRealSzie(el: HTMLElement) {
                if (el.style.display == 'none') {
                    // 获取原先的
                    const position = window.getComputedStyle(el).getPropertyValue("position")
                    const vis = window.getComputedStyle(el).getPropertyValue("visibility")

                    // 先脱流
                    el.style.position = 'absolute';
                    // 然后将元素变为
                    el.style.visibility = 'hidden';

                    el.style.display = '';


                    let width = window.getComputedStyle(el).getPropertyValue("width");
                    let height = window.getComputedStyle(el).getPropertyValue("height");
                    // 还原样式
                    el.style.position = position;
                    el.style.visibility = vis;
                    el.style.display = 'none';

                    return [width, height]
                } else {
                    let width = window.getComputedStyle(el).getPropertyValue("width");
                    let height = window.getComputedStyle(el).getPropertyValue("height");
                    return [width, height]
                }
            }

            /**
             * 如果dom上得style里面有width/height
             * @param dom 虚拟dom
             * @returns 获得模板上的width/height 如果没有则返回空字符串
             */
            function getOriginalWidthAndHeight(dom: Element): Array<string> {
                const oStyle = dom.getProp('style');
                let width: string;
                let height: string;
                if (oStyle) {
                    let arr = oStyle.trim().split(/;\s*/);
                    for (const a of arr) {
                        if (a.startsWith('width')) {
                            width = a.split(":")[1];
                        }
                        if (a.startsWith('height')) {
                            height = a.split(':')[1];
                        }
                    }
                }
                width = width || '';
                height = height || '';
                return [width, height];
            }
        }
    );
    //#endregion
}());
