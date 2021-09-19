import { Directive } from "../core/directive";
import { Element } from "../core/element";
import { NEvent } from "../core/event";
import { Expression } from "../core/expression";
import { Model } from "../core/model";
import { Module } from "../core/module";
import { ModuleFactory } from "../core/modulefactory";
import { createDirective } from "../core/nodom";
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
        function () {
            const [dom, module, parent] = [this.dom, this.module, this.dom.parent];
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
                if (!dom.hasProp('once')) {
                    //设置props，如果改变了props，启动渲染
                    m.setProps(props, true);
                }
            } else {
                m = ModuleFactory.get(this.value);
                if (!m) {
                    return;
                }

                // 后面不再执行表达式属性
                delete dom.exprProps;

                //保留modelId
                this.setParam('moduleId', m.id);
                //添加到父模块
                module.addChild(m.id);
                //设置容器
                m.setContainerKey(dom.key);
                //添加到渲染器
                m.active();
                //设置props，如果改变了props，启动渲染
                m.setProps(props, true);
            }
        },
        8
    );

    /**
     *  model指令
     */
    createDirective(
        'model',
        function () {
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
        function () {
            const [dom, module, parent] = [this.dom, this.module, this.dom.parent];
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
        function () {
            const [dom, module, parent] = [this.dom, this.module, this.dom.parent];
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
        function () {
            const [dom, module, parent] = [this.dom, this.module, this.dom.parent];
            module.saveCache(`${parent.key}.directives.tmp.if`, this.value);
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
        function () {
            //如果前面的if/elseif值为true或undefined，则隐藏，否则显示
            const [dom, module, parent] = [this.dom, this.module, this.dom.parent];
            dom.dontRender = (module.readCache(`${parent.key}.directives.tmp.if`) === true);
        },
        5
    );

    /**
     * elseif 指令
     */
    createDirective('elseif',
        function () {
            const [dom, module, parent] = [this.dom, this.module, this.dom.parent];
            let v = module.readCache(`${parent.key}.directives.tmp.if`);
            if (v === undefined || v === true || !this.value) {
                dom.dontRender = true;
            } else {
                module.saveCache(`${parent.key}.directives.tmp.if`, true);
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
        function () {
            const [module, parent] = [this.module, this.dom.parent];
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
        function () {
            this.dom.dontRender = !this.value;
        },
        5
    );

    /**
     * 指令名 data
     * 描述：从当前模块获取数据并用于子模块，dom带module指令时有效
     */
    createDirective('data',
        function () {
            const dom = this.dom;
            if (typeof this.value !== 'object') {
                return;
            }
            let mdlDir = dom.getDirective('module');
            if (!mdlDir) {
                return;
            }
            let mid = mdlDir.getParam('moduleId');
            if (!mid) {
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
        function () {
            const [me, dom] = [this, this.dom];
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
                    dom.assets.set('checked', false);
                }
            } else if (tgname === 'select') { //下拉框
                dom.setAsset('value', dataValue);
                dom.setProp('value', dataValue);
            } else {
                let v = (dataValue !== undefined && dataValue !== null) ? dataValue : '';
                dom.assets.set('value', v);
                dom.setProp('value', v);
            }

            //初始化
            if (!this.getParam('inited')) {
                dom.addEvent(new NEvent('change',
                    function (dom, module, e, el) {
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
                this.setParam('inited', true);
            }
        },
        10
    );

    /**
     * route指令
     */
    createDirective('route',
        function () {
            const [dom, module] = [this.dom, this.module];
            //a标签需要设置href
            if (dom.tagName.toLowerCase() === 'a') {
                dom.setProp('href', 'javascript:void(0)');
            }

            if (dom.hasProp('active')) {
                let ac = dom.getProp('active');
                //active 转expression
                dom.setProp('active', new Expression(ac), true);
                //保存activeName
                this.setParam('activeName', ac);
            }
            dom.setProp('path', this.value);

            let ac = this.getParam('activeName');
            // 设置激活字段
            if (ac) {
                Router.addActiveField(module, this.value, dom.model, ac);
            }

            //延迟激活（指令执行后才执行属性处理，延迟才能获取active prop的值）
            setTimeout(() => {
                // 路由路径以当前路径开始
                if (dom.getProp('active') === true && this.value.startsWith(Router.currentPath)) {
                    Router.go(this.value);
                }
            }, 0);

            //尚未加载事件
            if (!this.getParam('routeEvent')) {
                //添加click事件
                let evt: NEvent = new NEvent('click',
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
                this.setParam('routeEvent', true);
            }
        }
    );

    /**
     * 增加router指令
     */
    createDirective('router',
        function () {
            const [dom, module] = [this.dom, this.module];
            Router.routerKeyMap.set(module.id, dom.key);
        }
    );

    /**
     * 插头指令
     * 用于模块中，可实现同名替换
     */
    createDirective('swap',
        function () {
            this.value = this.value || 'default';
            const [dom, parent, module] = [this.dom, this.dom.parent, this.module];
            let pd: Directive = parent.getDirective('module');
            if (pd) { //父模块替代dom，替换子模块中的plug
                if (module.children.length === 0) {
                    return;
                }
                let m = ModuleFactory.get(module.children[module.children.length - 1]);
                if (m) {
                    // 加入等待替换map
                    add(m, this.value, dom);
                }
                //设置不渲染
                dom.dontRender = true;
            } else { // 原模版plug指令
                // 如果父dom带module指令，则表示为替换，不加入plug map
                replace(module, this.value, dom);
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
        },
        5
    );
    /**
    * 动画指令  
    * 描述：显示指令
    */
    createDirective('animation',
        function (directive: Directive) {
            // const [dom, parent, module] = [directive.dom, directive.dom.parent, directive.module];
            const [dom, parent, module] = [this.dom, this.dom.parent, this.module];
            // let model = dom.model;
            const confObj = this.value;
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

            // 定义动画或者过渡结束回调。
            let handler = () => {
                const el: HTMLElement = document.querySelector(`[key='${dom.key}']`)
                // 离开动画结束之后隐藏元素
                if (!tigger) {
                    if (isAppear) {
                        // 离开动画结束之后 把元素隐藏
                        el.style.display = 'none';
                    }
                    if (afterLeave) {
                        afterLeave.apply(module.model, [module]);
                    }
                    // 这里如果style里面写了width和height 那么给他恢复成他写的，不然
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
                        dom.addStyle('display:none')
                    }
                    // 通过虚拟dom将元素渲染出来
                    dom.dontRender = false;
                    // 下一帧
                    setTimeout(() => {
                        // el已经渲染出来，取得el 根据动画/过渡的类型来做不同的事
                        let el: HTMLElement = document.querySelector(`[key='${dom.key}']`);
                        if (isAppear) {
                            // 动画/过渡 是进入离开动画/过渡，并且当前是需要让他隐藏所以我们不播放动画，直接隐藏。
                            dom.removeStyle('display:none');
                            el.style.display = 'none'
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
                        dom.addStyle('display:none')
                    }
                    // 让他渲染出来
                    dom.dontRender = false;
                    // 下一帧
                    setTimeout(() => {
                        // 等虚拟dom把元素更新上去了之后，取得元素
                        let el: HTMLElement = document.querySelector(`[key='${dom.key}']`);
                        if (isAppear) {
                            dom.removeStyle('display:none');
                            el.style.display = 'none'
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
                                el.style.display = '';
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
                            el.style.display = '';
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
        },
        9
    );

}());
