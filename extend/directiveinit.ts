import { Directive } from "../core/directive";
import { NEvent } from "../core/event";
import { Model } from "../core/model";
import { Module } from "../core/module";
import { ModuleFactory } from "../core/modulefactory";
import { createDirective } from "../core/nodom";
import { Renderer } from "../core/renderer";
import { Router } from "../core/router";
import { Util } from "../core/util";
import { VirtualDom } from "../core/virtualdom";

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
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            let m: Module;
            //存在moduleId，表示已经渲染过，不渲染
            let mid = dom.getParam(module, 'moduleId');
            let handle: boolean = true;
            if (mid) {
                m = ModuleFactory.get(mid);
                handle = !dom.getProp('renderOnce');
            } else {
                m = ModuleFactory.get(this.value);
                if (!m) {
                    return true;
                }
                mid = m.id;
                //保留modelId
                // src.subModuleId = mid;
                dom.setParam(module, 'moduleId', mid);
            }
            //保存到dom上，提升渲染性能
            dom.subModuleId = mid;

            if (handle) { //需要处理
                //设置props，如果改变了props，启动渲染
                let o: any = {};
                if (dom.props) {
                    for (let p of dom.props) {
                        if (p[0][0] === '$') { //数据
                            if (!o.$data) {
                                o.$data = {};
                            }
                            o.$data[p[0].substr(1)] = p[1];
                            //删除属性
                            dom.delProp(p[0]);
                        } else {
                            o[p[0]] = p[1];
                        }
                    }
                }
                //传递给模块
                m.setProps(o);
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
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
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
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            let rows = this.value;
            // 无数据，不渲染
            if (!Util.isArray(rows) || rows.length === 0) {
                return false;
            }
            const parent = dom.parent;
            //禁用该指令
            this.disabled = true;
            for (let i = 0; i < rows.length; i++) {
                rows[i].$index = i;
                //渲染一次-1，所以需要+1
                src.staticNum++;
                Renderer.renderDom(module, src, rows[i], parent, rows[i].$key);
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
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            //递归节点存放容器
            if (dom.hasProp('ref')) {
                //如果出现在repeat中，src为单例，需要在使用前清空子节点，避免沿用上次的子节点
                src.children = [];
                //递归存储名
                const name = '$recurs.' + (dom.getProp('ref') || 'default');
                let node = module.objectManager.get(name);
                if (!node) {
                    return true;
                }
                let model = dom.model;
                let cond = node.getDirective('recur');
                let m = model[cond.value];
                //不存在子层数组，不再递归
                if (!m) {
                    return true;
                }
                //克隆，后续可以继续用
                let node1 = node.clone();
                let key: string;
                if (!Array.isArray(m)) {  //recur子节点不为数组，依赖子层数据
                    node1.model = m;
                    key = m.$key;
                    Util.setNodeKey(node1, key, true);
                } else {
                    key = dom.model.$key
                }

                src.children = [node1];
            } else { //递归节点
                let data = dom.model[this.value];
                if (!data) {
                    return true;
                }
                //递归名，默认default
                const name = '$recurs.' + (dom.getProp('name') || 'default');
                if (!module.objectManager.get(name)) {
                    module.objectManager.set(name, src.clone());
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
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            dom.parent.setParam(module, '$if', this.value);
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
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            //如果前面的if/elseif值为true，则隐藏，否则显示
            return dom.parent.getParam(module, '$if') === false;
        },
        5
    );

    /**
     * elseif 指令
     */
    createDirective('elseif',
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            let v = dom.parent.getParam(module, '$if');
            if (v === true) {
                return false;
            } else {
                if (!this.value) {
                    return false;
                } else {
                    dom.parent.setParam(module, '$if', true);
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
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            dom.parent.removeParam(module, '$if');
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
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            return this.value;
        },
        5
    );

    /**
     * 指令名 data
     * 描述：从当前模块获取数据并用于子模块，dom带module指令时有效
     */
    // createDirective('data',
    //     function(module:Module,dom:VirtualDom,src:VirtualDom){
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
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            const me = this;
            const type: string = dom.getProp('type') || 'text';
            const tgname = dom.tagName.toLowerCase();
            const model = dom.model;

            if (!model) {
                return true;
            }

            let dataValue = model.$get(this.value);

            if (type === 'radio') {
                let value = dom.getProp('value');
                if (dataValue == value) {
                    dom.setProp('checked', true);
                    dom.setAsset('checked', 'checked');
                } else {
                    dom.setAsset('checked', false);
                    dom.delProp('checked');
                }
            } else if (type === 'checkbox') {
                //设置状态和value
                let yv = dom.getProp('yes-value');
                //当前值为yes-value
                if (dataValue == yv) {
                    dom.setProp('value', yv);
                    dom.setAsset('checked', 'checked');
                } else { //当前值为no-value
                    dom.setProp('value', dom.getProp('no-value'));
                    dom.setAsset('checked', false);
                }
            } else if (tgname === 'select') { //下拉框
                dom.setAsset('value', dataValue);
                dom.setProp('value', dataValue);
            } else {
                let v = (dataValue !== undefined && dataValue !== null) ? dataValue : '';
                dom.setAsset('value', v);
                dom.setProp('value', v);
            }

            //初始化
            if (!this.getParam(module, dom, 'inited')) {
                dom.addEvent(new NEvent('change',
                    function (model, dom) {
                        let el = <any>module.getNode(dom.key);
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
                            dom.setProp('value', v);
                            el.value = v;
                        }
                    }
                ));
                this.setParam(module, dom, 'inited', true);
            }
            return true;
        },
        10
    );

    /**
     * route指令
     */
    createDirective('route',
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            if (!this.value) {
                return true;
            }
            //a标签需要设置href
            if (dom.tagName.toLowerCase() === 'a') {
                dom.setProp('href', 'javascript:void(0)');
            }
            dom.setProp('path', this.value);
            //有激活属性
            if (dom.hasProp('active')) {
                let acName = dom.getProp('active');
                dom.delProp('active');
                //active 转expression
                Router.addActiveField(module, this.value, dom.model, acName);
                if (this.value.startsWith(Router.currentPath) && dom.model[acName]) {
                    Router.go(this.value);
                }
            }

            //添加click事件,避免重复创建事件对象，创建后缓存
            let event: NEvent = module.objectManager.get('$routeClickEvent');
            if (!event) {
                event = new NEvent('click',
                    (model, dom, e) => {
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
                module.objectManager.set('$routeClickEvent', event);
            }
            dom.addEvent(event);
            return true;
        }
    );

    /**
     * 增加router指令
     */
    createDirective('router',
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            Router.routerKeyMap.set(module.id, dom.key);
            return true;
        }
    );

    /**
     * 插头指令
     * 用于模块中，可实现同名替换
     */
    createDirective('slot',
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            // const parent = dom.parent;
            this.value = this.value || 'default';
            let mid = dom.parent.subModuleId;
            //父dom有module指令，表示为替代节点，替换子模块中的对应的slot节点；否则为子模块定义slot节点
            if (mid) {
                let m = ModuleFactory.get(mid);
                if (m) {
                    //缓存当前替换节点
                    m.objectManager.set('$slots.' + this.value, { rendered: dom, origin: src.clone() });
                }
                //设置不添加到dom树
                dom.dontAddToTree = true;
            } else { //源slot节点
                //获取替换节点进行替换
                let cfg = module.objectManager.get('$slots.' + this.value);
                if (cfg) {
                    let rdom;
                    if (dom.hasProp('innerRender')) { //内部渲染
                        rdom = cfg.origin;
                    } else { //父模块渲染
                        rdom = cfg.rendered;
                    }
                    //避免key重复，更新key，如果为origin，则会修改原来的key？？？
                    for (let d of rdom.children) {
                        Util.setNodeKey(d, dom.key, true);
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

    /**
 * 指令名 
 * 描述：显示指令
 */
    createDirective('animation',
        function (module: Module, dom: VirtualDom, src: VirtualDom) {
            const confObj = this.value
            if (!Util.isObject(confObj)) {
                return new Error('未找到animation配置对象');
            }

            // 获得tigger
            const tigger = confObj.tigger == false ? false : true;

            // 用于判断是动画还是过渡
            const type = confObj.type || "transition";
            // 用于判断是否是 进入/离开动画 
            const isAppear = confObj.isAppear == false ? false : true;

            // 提取 动画/过渡 名
            const nameEnter = confObj.name?.enter || confObj.name;
            const nameLeave = confObj.name?.leave || confObj.name;

            // 提取 动画/过渡 持续时间
            const durationEnter = confObj.duration?.enter || confObj.duration || '';
            const durationLeave = confObj.duration?.leavr || confObj.duration || '';

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
                const el: HTMLElement = <HTMLElement>module.getNode(dom.key)
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
                    if (type == 'animation') {
                        el.classList.add(nameLeave + '-leave-to')
                    }
                } else {
                    if (afterEnter) {
                        afterEnter.apply(module.model, [module]);
                    }
                    // 进入动画结束之后删除掉相关的类
                    el.classList.remove(nameEnter + '-enter-active')
                    if (type == 'animation') {
                        el.classList.add(nameEnter + '-enter-to')
                    }
                }
                // 清除事件监听
                el.removeEventListener('animationend', handler);
                el.removeEventListener('transitionend', handler);
            }

            // 获得真实dom
            let el: HTMLElement = <HTMLElement>module.getNode(dom.key);

            if (!tigger) {
                // tigger为false 播放Leave动画
                if (el) {
                    if (el.getAttribute('class').indexOf(`${nameLeave}-leave-to`) != -1) {
                        // 当前已经处于leave动画播放完成之后了，直接返回
                        dom.addClass(`${nameLeave}-leave-to`)
                        return true;
                    }
                    // 调用函数触发 Leave动画/过渡
                    changeStateFromShowToHide(el);
                    return true;
                } else {
                    // el不存在，第一次渲染
                    if (isAppear) {
                        // 是进入离开动画，管理初次渲染的状态，让他隐藏
                        dom.addStyle('display:none')
                    }

                    // 下一帧
                    setTimeout(() => {
                        // el已经渲染出来，取得el 根据动画/过渡的类型来做不同的事
                        let el: HTMLElement = <HTMLElement>module.getNode(dom.key)
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
                // 通过虚拟dom将元素渲染出来
                return true
            } else {
                // tigger为true 播放Enter动画
                if (el) {
                    if (el.getAttribute('class').indexOf(`${nameEnter}-enter-to`) != -1) {
                        dom.addClass(`${nameEnter}-enter-to`)
                        return true;
                    }
                    // 调用函数触发Enter动画/过渡
                    changeStateFromHideToShow(el);
                } else {
                    // el不存在，是初次渲染
                    if (isAppear) {
                        // 管理初次渲染元素的隐藏显示状态
                        dom.addStyle('display:none')
                    }
                    // 下一帧
                    setTimeout(() => {
                        // 等虚拟dom把元素更新上去了之后，取得元素
                        let el: HTMLElement = <HTMLElement>module.getNode(dom.key)
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
                // 通过虚拟dom将元素渲染出来
                return true
            }
            /**
             * 播放Leave动画
             * @param el 真实dom
             */
            function changeStateFromShowToHide(el: HTMLElement) {
                // 动画类型是transitiojn
                if (type == 'transition') {
                    // 前面已经对transition的初始状态进行了设置，我们需要在下一帧设置结束状态才能触发过渡

                    // 获得宽高的值 因为 宽高的auto 百分比 calc计算值都无法拿来触发动画或者过渡。
                    let [width, height] = getElRealSzie(el);
                    // setTimeout(() => {
                    requestAnimationFrame(() => {
                        // 移除掉上一次过渡的最终状态
                        el.classList.remove(nameEnter + '-enter-to')

                        // 设置过渡的类名
                        el.classList.add(nameLeave + '-leave-active');

                        // 设置离开过渡的开始类
                        el.classList.add(nameLeave + '-leave-from');

                        // fold过渡的开始状态
                        if (nameLeave == 'fold-height') {
                            el.style.height = height;
                        } else if (nameLeave == 'fold-width') {
                            el.style.width = width;
                        }

                        // 处理离开过渡的延时
                        el.style.transitionDelay = delayEnter;
                        // 处理过渡的持续时间
                        if (durationEnter != '') {
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
                        requestAnimationFrame(() => {
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
                        })

                    });
                } else {

                    requestAnimationFrame(() => {
                        // 动画类型是aniamtion
                        el.classList.remove(nameEnter + '-enter-to');
                        // 设置动画的类名
                        el.classList.add(nameLeave + '-leave-active');

                        // el.classList.add(nameLeave + '-leave-from')
                        // 动画延时时间
                        el.style.animationDelay = delayLeave;

                        // 动画持续时间
                        if (durationLeave != '') {
                            el.style.animationDuration = durationLeave;
                        }

                        if (timingFunctionLeave != 'ease') {
                            el.style.animationTimingFunction = timingFunctionLeave;
                        }
                        requestAnimationFrame(() => {
                            // 重定位一下触发动画
                            // el.classList.add(nameLeave + '-leave-to')
                            // el.classList.remove(nameLeave + '-leave-from')
                            // 在触发动画之前执行hook
                            if (beforeLeave) {
                                beforeLeave.apply(module.model, [module]);
                            }
                            void el.offsetWidth;
                            //添加动画结束时间监听
                            el.addEventListener('animationend', handler);
                        })
                    })
                }
            }

            /**
             * 播放Enter动画
             * @param el 真实dom
             */
            function changeStateFromHideToShow(el: HTMLElement) {
                // 动画类型是transition
                if (type == 'transition') {
                    // 对于进入/离开动画
                    // Enter过渡的延迟时间与Leave过渡的延迟时间处理不一样
                    // 我们这里把延迟统一设置成0s，然后通过定时器来设置延时，
                    // 这样可以避免先渲染一片空白区域占位，然后再延时一段时间执行过渡效果。
                    el.style.transitionDelay = '0s';
                    let delay = parseFloat(delayEnter) * 1000;
                    setTimeout(() => {
                        // 下一帧请求过渡效果
                        let [width, height] = getElRealSzie(el);
                        // 在第一帧设置初始状态
                        requestAnimationFrame(() => {
                            // 移除掉上一次过渡的最终状态
                            el.classList.remove(nameLeave + '-leave-to');
                            // 添加过渡的类名
                            el.classList.add(nameEnter + '-enter-active');
                            // 给进入过渡设置开始类名
                            el.classList.add(nameEnter + '-enter-from');
                            // 获得元素的真实尺寸
                            if (nameEnter == 'fold-height') {
                                el.style.height = '0px'
                            } else if (nameEnter == 'fold-width') {
                                el.style.width = '0px'
                            }
                            // 设置过渡持续时间
                            if (durationEnter != '') {
                                el.style.transitionDuration = durationEnter;
                            }
                            // 设置过渡时间函数
                            if (timingFunctionEnter != 'ease') {
                                el.style.transitionTimingFunction = timingFunctionEnter;
                            }
                            // 第二帧将带有初始状态的元素显示出来,如果不开这一帧那么fade的进入过渡在初次渲染的时候会被当作离开过渡触发。
                            requestAnimationFrame(() => {
                                // 过渡开始之前先将元素显示
                                if (isAppear) {
                                    el.style.display = '';
                                }
                                // 第三帧触发过渡
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
                        })
                    }, delay);
                } else {
                    // 动画类型是aniamtion
                    // 这里动画的延迟时间也与过渡类似的处理方式。
                    el.style.animationDelay = "0s";
                    let delay = parseFloat(delayEnter) * 1000;
                    setTimeout(() => {
                        // 动画开始之前先将元素显示
                        requestAnimationFrame(() => {
                            el.classList.remove(nameLeave + '-leave-to');
                            // 设置动画的类名
                            el.classList.add(nameEnter + '-enter-active');

                            // el.classList.add(nameEnter + '-enter-from')
                            // 设置动画的持续时间
                            if (durationEnter != '') {
                                el.style.animationDuration = durationEnter;
                            }

                            // 设置动画的时间函数
                            if (timingFunctionEnter != 'ease') {
                                el.style.animationTimingFunction = durationEnter;
                            }
                            if (isAppear) {
                                el.style.display = '';
                            }
                            requestAnimationFrame(() => {
                                // el.classList.add(nameEnter + '-enter-to')
                                // el.classList.remove(nameEnter + '-enter-from')
                                // 在触发过渡之前执行hook 
                                if (beforeEnter) {
                                    beforeEnter.apply(module.model, [module]);
                                }
                                // 重定位一下触发动画
                                void el.offsetWidth;
                                el.addEventListener('animationend', handler);
                            })
                        })
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
            function getOriginalWidthAndHeight(dom: VirtualDom): Array<string> {
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






