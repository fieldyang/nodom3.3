import { NEvent } from "./event";
import { Module } from "./module";
import { VirtualDom } from "./virtualdom";
/**
 * 事件管理器
 */
export class EventManager {
    /**
     * 外部事件集
     */
    private static extendEventMap = new Map();
    /**
     * 绑定事件
     * @param module 
     * @param dom 
     */
    public static bind(module: Module, dom: VirtualDom) {
        if (!dom.events) {
            return;
        }
        //判断并设置事件绑定标志
        let el = module.getNode(dom.key);
        if (el['bindEvent']) {
            return;
        }
        el['bindEvent'] = true;

        for (let evt of dom.events) {
            let arr = evt[1];
            //同一个事件名可能对应多个事件对象
            if (arr.length === 0) return;
            //获取usecapture
            let capture = (arr.findIndex(item => module.objectManager.getEvent(item).capture === true) !== -1);

            // 只代理一次，也只绑定一次
            //是否已代理
            let hasDelg: boolean = false;
            //是否已绑定
            let hasBound: boolean = false;
            //遍历处理代理事件
            for (let ii = 0; ii < arr.length; ii++) {
                const ev: NEvent = module.objectManager.getEvent(arr[ii]);
                //处理外部事件，如果有外部事件，则移除改事件
                if (this.handleExtendEvent(module, dom, ev)) {
                    arr.splice(ii--, 1);
                    continue;
                }

                //当前事件名已绑定且已代理，不再执行
                if (hasBound && hasDelg) {
                    break;
                }
                //代理事件
                if (ev.delg) {
                    if (!hasDelg) {
                        const parent = dom.parent;
                        //事件加入父对象
                        parent.addEvent(ev);

                        // 保存代理dom信息
                        let delgs = ev.getParam(module, parent, '$delgs');
                        if (!delgs) {
                            delgs = {};
                            ev.setParam(module, parent, '$delgs', delgs);
                        }
                        delgs[dom.key] = dom;
                        //从本地移除
                        arr.splice(ii--, 1);

                        //如果父无此事件，则需要绑定到父事件
                        let eh = getCfg(parent, ev.name);
                        if (!eh) {
                            // 保存handler
                            saveCfg(parent, ev.name, handler, ev.capture);
                            module.getNode(parent.key).addEventListener(ev.name, handler, ev.capture);
                        }
                        hasDelg = true;
                    }
                } else if (!hasBound) {
                    hasBound = true;
                    // 保存handler
                    saveCfg(dom, ev.name, handler, capture);
                    el.addEventListener(ev.name, handler, capture);
                }
            }
        }
        /**
         * 保存事件配置
         * @param dom       dom节点
         * @param ev        事件名
         * @param handler   事件方法
         * @param capture   是否capture
         */
        function saveCfg(dom, ev, handler, capture) {
            module.objectManager.set('$domevents_' + dom.key + '_' + ev, {
                handler: handler,
                capture: capture
            });
        }

        /**
         * 获取事件配置
         * @param dom       dom节点
         * @param ev        事件名
         * @returns         {handler,capture}
         */
        function getCfg(dom, ev): any {
            return module.objectManager.get('$domevents_' + dom.key + '_' + ev);
        }
        /**
         * 事件handler
         * @param e  Event
         */
        function handler(e) {
            //从事件element获取事件
            let el = e.currentTarget;
            const dom = el['vdom'];
            if (!dom || !dom.events || !dom.events.has(e.type)) {
                return;
            }

            const evts = dom.getEvent(e.type);
            //已执行事件map，不重复执行
            let execMap = new Map();

            for (let ii = 0; ii < evts.length; ii++) {
                const eid = evts[ii];
                const ev: NEvent = module.objectManager.getEvent(eid);
                if (typeof ev.handler === 'string') {
                    ev.handler = module.getMethod(ev.handler);
                }
                if (!ev.handler) {
                    return;
                }

                //禁止冒泡
                if (ev.nopopo) {
                    e.stopPropagation();
                }
                //代理事件，需要作用在子节点上
                if (ev.delg) { // 代理
                    let delgs = ev.getParam(module, dom, '$delgs');
                    //向上找节点
                    console.log(e.currentTarget);

                    for (let i = 0; i < e.path.length && e.path[i] !== el; i++) {
                        let el1 = e.path[i];
                        let key = el1.vdom.key;
                        //　找到事件节点
                        if (key && delgs.hasOwnProperty(key)) {
                            let dom1 = delgs[key];
                            if (dom1) {
                                //如果dom对应的事件已执行，不再执行
                                if (execMap.get(ev.id) === dom1.key) {
                                    break;
                                }
                                console.log(e.currentTarget);
                                ev.handler.apply(module, [dom1.model, dom1, ev, e]);
                                console.log(e.currentTarget);

                                execMap.set(ev.id, dom1.key);
                                if (ev.once) {
                                    EventManager.unbind(module, dom1, ev);
                                }
                            }
                            break;
                        }
                    }
                } else {
                    ev.handler.apply(module, [dom.model, dom, ev, e]);
                    //事件只执行一次，从事件数组删除
                    if (ev.once) {
                        EventManager.unbind(module, dom, ev);
                        ii--;
                    }
                }
            }
        }
    }

    /**
     * 解绑一个事件
     * @param module    模块     
     * @param dom       dom节点
     * @param ev        事件对象
     * @returns 
     */
    public static unbind(module: Module, dom: any, ev: NEvent) {
        let evts;
        if (ev.delg) {
            evts = dom.parent.getEvent(ev.name);
            let delgs = ev.getParam(module, dom.parent, '$delgs');
            delete delgs[dom.key];
            //如果代理不为空，则不删除事件
            if (Object.keys(delgs).length > 0) {
                return;
            }
        } else {
            evts = dom.getEvent(ev.name);
        }
        if (!evts) {
            return;
        }
        let index;
        if ((index = evts.findIndex(item => item === ev.id)) === -1) return;
        //从事件数组移除
        evts.splice(index, 1);
        //判断并解绑
        if (evts.length === 0) {
            const cfg = module.objectManager.get('$domevents_' + dom.key + '_' + ev.name)
            if (cfg && cfg.handler) {
                (<HTMLElement>dom.getEl(module)).removeEventListener(ev.name, cfg.handler, cfg.capture);
            }
        }
    }

    /**
     * 处理外部事件
     * @param module    模块 
     * @param dom       dom节点
     * @param event     事件对象
     * @returns         如果有是外部事件，则返回true，否则返回false
     */
    private static handleExtendEvent(module: Module, dom: VirtualDom, event: NEvent): boolean {
        let evts = this.get(event.name);
        if (!evts) {
            return false;
        }
        for (let key of Object.keys(evts)) {
            let ev = new NEvent(key, evts[key]);
            ev.capture = event.capture;
            ev.nopopo = event.nopopo;
            ev.delg = event.delg;
            ev.once = event.once;
            //设置依赖事件
            ev.dependEvent = event;
            dom.addEvent(ev);
        }
        return true;
    }



    /**
     * 注册扩展事件
     * @param eventName    事件名
     * @param handleObj    事件处理集
     */
    public static regist(eventName: string, handleObj: any) {
        this.extendEventMap.set(eventName, handleObj);
    }

    /**
     * 取消注册扩展事件
     * @param eventName     事件名
     */
    static unregist(eventName: string) {
        return this.extendEventMap.delete(eventName);
    }

    /**
     * 获取扩展事件
     * @param eventName     事件名
     * @returns             事件处理集
     */
    public static get(eventName: string): any {
        return this.extendEventMap.get(eventName);
    }
}
