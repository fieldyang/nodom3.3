import { Element } from "./element";
import { Model } from "./model";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { Util } from "./util";

/**
 * 事件类
 * @remarks
 * 事件分为自有事件和代理事件
 * 自有事件绑定在view上
 * 代理事件绑定在父view上，存储于事件对象的events数组中
 * 如果所绑定对象已存在该事件名对应的事件，如果是代理事件，则添加到子事件队列，否则替换view自有事件
 * 事件执行顺序，先执行代理事件，再执行自有事件
 * 
 * @author      yanglei
 * @since       1.0
 */
export class NEvent {
    public id: number;
    /**
     * 事件名
     */
    public name: string;
    /**
     * 子事件数组
     */
    private events: Map<string, Array<NEvent>>;
    /**
     * 事件处理函数名(需要在模块methods中定义)
     */
    private handler: string | Function;
    /**
     * 代理到父对象
     */
    private delg: boolean;
    /**
     * 禁止冒泡
     */
    private nopopo: boolean;
    /**
     * 只执行一次
     */
    private once: boolean;

    /**
     * 使用 capture
     */
    public capture: boolean;

    /**
     * 模块id
     */
    private module: Module;

    /**
     * 事件所属虚拟dom
     */
    public dom: Element;

    /**
     * 事件监听器
     */
    private handleListener: any;
    /**
     * 触屏监听器
     */
    public touchListeners: Map<string, NEvent>;

    /**
     * @param eventName     事件名
     * @param eventStr      事件串或事件处理函数,以“:”分割,中间不能有空格,结构为: 方法名[:delg(代理到父对象):nopopo(禁止冒泡):once(只执行一次):capture(useCapture)]
     *                      如果为函数，则替代第三个参数
     * @param handler       事件执行函数，如果方法不在module methods中定义，则可以直接申明，eventStr第一个参数失效，即eventStr可以是":delg:nopopo..."
     * @param id            事件id
     */
    constructor(eventName: string, eventStr?: string | Function, handler?: Function, id?:number) {
        this.id = id || Util.genId();
        this.name = eventName;
        //如果事件串不为空，则不需要处理
        if (eventStr) {
            let tp = typeof eventStr;
            if (tp === 'string') {
                let eStr: string = (<string>eventStr).trim();
                eStr.split(':').forEach((item, i) => {
                    item = item.trim();
                    if (i === 0) { //事件方法
                        this.handler = item;
                    } else { //事件附加参数
                        switch (item) {
                            case 'delg':
                                this.delg = true;
                                break;
                            case 'nopopo':
                                this.nopopo = true;
                                break;
                            case 'once':
                                this.once = true;
                                break;
                            case 'capture':
                                this.capture = true;
                                break;
                        }
                    }
                });

            } else if (tp === 'function') {
                handler = <Function>eventStr;
            }
        }
        //新增事件方法（不在methods中定义）
        if (handler) {
            this.handler = handler;
        }

        //设备类型  1:触屏，2:非触屏	
        let dtype: number = 'ontouchend' in document ? 1 : 2
        //触屏事件根据设备类型进行处理
        if (dtype === 1) { //触屏设备
            switch (this.name) {
                case 'click':
                    this.name = 'tap';
                    break;
                case 'mousedown':
                    this.name = 'touchstart';
                    break;
                case 'mouseup':
                    this.name = 'touchend';
                    break;
                case 'mousemove':
                    this.name = 'touchmove';
                    break;
            }
        } else { //转非触屏
            switch (this.name) {
                case 'tap':
                    this.name = 'click';
                    break;
                case 'touchstart':
                    this.name = 'mousedown';
                    break;
                case 'touchend':
                    this.name = 'mouseup';
                    break;
                case 'touchmove':
                    this.name = 'mousemove';
                    break;
            }
        }

    }

    /**
     * 事件触发
     * @param e     事件
     * @param el    html element
     */
    public fire(e: Event, el?: HTMLElement) {
        const module: Module = this.module;
        if (!module.getContainer()) {
            return;
        }
        let dom: Element = this.dom;
        const model = dom.model;
        //如果capture为true，则先执行自有事件，再执行代理事件，否则反之
        if (this.capture) {
            handleSelf(this, e, model, module, dom, el);
            handleDelg(this, e, dom);
        } else {
            if (handleDelg(this, e, dom)) {
                handleSelf(this, e, model, module, dom, el);
            }
        }
        //判断是否清除事件
        if (this.events !== undefined &&
            this.events.has(this.name) &&
            this.events.get(this.name).length === 0 &&
            this.handler === undefined) {
            if (!el) {
                el = this.getEl();
            }

            if (ExternalNEvent.touches[this.name]) {
                ExternalNEvent.unregist(this, el);
            } else {
                if (el !== null) {
                    el.removeEventListener(this.name, this.handleListener);
                }
            }
        }

        /**
         * 处理自有事件
         * @param eObj      nodom event对象
         * @param e         事件
         * @param dom       虚拟dom
         * @returns         true 允许冒泡 false 禁止冒泡
         */
        function handleDelg(eObj: NEvent, e: Event, dom: Element) {
            //代理事件执行
            if (eObj.events === undefined) {
                return true;
            }
            //事件target对应的key
            let eKey: string = (<HTMLElement>e.target).getAttribute('key');
            let arr: NEvent[] = eObj.events.get(eObj.name);
            if (Util.isArray(arr)) {
                if (arr.length > 0) {
                    for (let i = 0; i < arr.length; i++) {
                        let sdom: Element = dom.query(arr[i].dom.key);
                        if (!sdom) {
                            continue;
                        }
                        // 找到对应的子事件执行
                        if (eKey === sdom.key || sdom.query(eKey)) {
                            //执行
                            arr[i].fire(e);
                            //执行一次，需要移除
                            if (arr[i].once) {
                                eObj.removeChild(arr[i]);
                            }
                            //禁止冒泡
                            if (arr[i].nopopo) {
                                return false;
                            }
                        }
                    }
                } else { //删除该事件
                    eObj.events.delete(eObj.name);
                }
            }
            return true;
        }

        /**
         * 处理自有事件
         * @param eObj      NEvent对象
         * @param e         事件
         * @param model     模型
         * @param module    模块
         * @param dom       虚拟dom
         */
        function handleSelf(eObj: NEvent, e: Event, model: Model, module: Module, dom: Element, el?: HTMLElement) {
            if (typeof eObj.handler === 'string') {
                eObj.handler = module.getMethod(<string>eObj.handler);
            }
            if (!eObj.handler) {
                return;
            }
            //禁止冒泡
            if (eObj.nopopo) {
                e.stopPropagation();
            }
            Util.apply(<Function>eObj.handler, dom.model, [dom, module, e, el]);
            //事件只执行一次，则删除handler
            if (eObj.once) {
                delete eObj.handler;
            }
        }
    }

    /**
     * 绑定事件
     * @param module    模块
     * @param dom       虚拟dom
     */
    public bind(module: Module, dom: Element,parentEl?:Node) {
        this.module = module;
        this.dom = dom;
        if (this.delg && parent) { //代理到父对象
            this.delegateTo(parentEl);
        } else {
            this.bindTo();
        }
    }

    /**
     * 绑定到el
     */
    private bindTo() {
        let el:HTMLElement = this.getEl();
        //触屏事件
        if (ExternalNEvent.touches[this.name]) {
            ExternalNEvent.regist(this, el);
        } else {
            this.handleListener = (e) => {
                this.fire(e, el);
            };
            el.addEventListener(this.name, this.handleListener, this.capture);
        }
    }
    /**
     * 事件代理到父对象
     */
    private delegateTo(parentEl?:Node) {
        const parent = this.dom.parent;
        parentEl = parentEl || this.module.getNode(this.dom.parent.key) || document.body;
        
        //父节点如果没有这个事件，则新建，否则直接指向父节点相应事件
        if (!parent.events.has(this.name)) {
            let ev = new NEvent(this.name);
            ev.bindTo();
            parent.events.set(this.name, [ev]);
        }

        //为父对象事件添加子事件
        let evt = parent.events.get(this.name);
        evt[0]?.addChild(this);
        
    }

    /**
     * 添加子事件
     * @param ev    事件
     */
    private addChild(ev) {
        if (!this.events) {
            this.events = new Map();
        }

        //事件类型对应的数组
        if (!this.events.has(this.name)) {
            this.events.set(this.name, new Array());
        }
        this.events.get(this.name).push(ev);
    }

    /**
     * 移除子事件
     * @param ev    子事件
     */
    private removeChild(ev) {
        if (this.events === undefined || this.events[ev.name] === undefined) {
            return;
        }
        let ind = this.events[ev.name].indexOf(ev);
        if (ind !== -1) {
            this.events[ev.name].splice(ind, 1);
            if (this.events[ev.name].length === 0) {
                this.events.delete(ev.name);
            }
        }
    }

    /**
     * 克隆
     */
    public clone() {
        let evt = new NEvent(this.name);
        let arr = ['delg', 'once', 'nopopo', 'capture', 'handler'];
        arr.forEach((item) => {
            evt[item] = this[item];
        });
        
        return evt;
    }

    /**
     * 设置附加参数值
     * @param key       参数名
     * @param value     参数值
     */
    public setParam(key: string, value: any) {
        if(!this.module){
            return;
        }
        this.module.saveCache(`${this.dom.key}.events.${this.id}.${key}`,value);
    }

    /**
     * 获取附加参数值
     * @param key   参数名
     * @returns     参数值
     */
    public getParam(key: string) {
        if(!this.module){
            return;
        }
        return this.module.readCache(`${this.dom.key}.events.${this.id}.${key}`);
    }

    /**
     * 获取事件对象target
     * @returns     target
     */
    public getEl():HTMLElement{
        return <HTMLElement>this.module.getNode(this.dom.key);
    }

    /**
     * 判断事件对象是否相等
     * @param dst   目标事件
     * @returns     相同返回true，否则返回false
     */
    public equal(dst:NEvent):boolean{
        // 事件名相同、dom相同且处理方法相同，则表示同一个事件
        return this.name === this.name && this.handler===this.handler && this.dom === dst.dom;
    }
}

/**
 * 扩展事件
 */
export class ExternalNEvent {
    /**
     * 触屏事件
     */
    static touches: any = {};
    /**
     * 注册事件
     * @param evtObj    event对象
     */
    static regist(evtObj: NEvent, el: HTMLElement) {
        //触屏事件组
        let touchEvts: any = ExternalNEvent.touches[evtObj.name];
        //如果绑定了，需要解绑
        if (!Util.isEmpty(evtObj.touchListeners)) {
            this.unregist(evtObj);
        }

        // el不存在
        if (!el) {
            el = <HTMLElement>evtObj.getEl();
        }

        evtObj.touchListeners = new Map();
        if (touchEvts && el !== null) {
            // 绑定事件组
            Util.getOwnProps(touchEvts).forEach(function (ev) {
                //先记录下事件，为之后释放
                evtObj.touchListeners[ev] = function (e) {
                    touchEvts[ev](e, evtObj);
                }
                el.addEventListener(ev, evtObj.touchListeners[ev], evtObj.capture);
            });
        }
    }

    /**
     * 取消已注册事件
     * @param evtObj    event对象
     * @param el        事件绑定的html element
     */
    static unregist(evtObj: NEvent, el?: HTMLElement) {
        const evt = ExternalNEvent.touches[evtObj.name];
        if (!el) {
            el = evtObj.getEl();
        }
        if (evt) {
            // 解绑事件
            if (el !== null) {
                Util.getOwnProps(evtObj.touchListeners).forEach(function (ev) {
                    el.removeEventListener(ev, evtObj.touchListeners[ev]);
                });
            }
        }
    }


}

/**
 * 触屏事件
 */
ExternalNEvent.touches = {
    tap: {
        touchstart: function (e: TouchEvent, evtObj: NEvent) {
            let tch = e.touches[0];
            evtObj.setParam('pos', { sx: tch.pageX, sy: tch.pageY, t: Date.now() });
        },
        touchmove: function (e: TouchEvent, evtObj: NEvent) {
            let pos = evtObj.getParam('pos');
            let tch = e.touches[0];
            let dx = tch.pageX - pos.sx;
            let dy = tch.pageY - pos.sy;
            //判断是否移动
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                pos.move = true;
            }
        },
        touchend: function (e: TouchEvent, evtObj: NEvent) {
            let pos = evtObj.getParam('pos');
            let dt = Date.now() - pos.t;
            //点下时间不超过200ms
            if (pos.move === true || dt > 200) {
                return;
            }
            evtObj.fire(e);
        }
    },
    swipe: {
        touchstart: function (e: TouchEvent, evtObj: NEvent) {
            let tch = e.touches[0];
            let t = Date.now();
            evtObj.setParam('swipe', {
                oldTime: [t, t],
                speedLoc: [{ x: tch.pageX, y: tch.pageY }, { x: tch.pageX, y: tch.pageY }],
                oldLoc: { x: tch.pageX, y: tch.pageY }
            });
        },
        touchmove: function (e: TouchEvent, evtObj: NEvent) {
            let nt = Date.now();
            let tch = e.touches[0];
            let mv = evtObj.getParam('swipe');
            //50ms记录一次
            if (nt - mv.oldTime[1] > 50) {
                mv.speedLoc[0] = { x: mv.speedLoc[1].x, y: mv.speedLoc[1].y };
                mv.speedLoc[1] = { x: tch.pageX, y: tch.pageY };
                mv.oldTime[0] = mv.oldTime[1];
                mv.oldTime[1] = nt;
            }
            mv.oldLoc = { x: tch.pageX, y: tch.pageY };
        },
        touchend: function (e: any, evtObj: NEvent) {
            let mv = evtObj.getParam('swipe');
            let nt = Date.now();

            //取值序号 0 或 1，默认1，如果释放时间与上次事件太短，则取0
            let ind = (nt - mv.oldTime[1] < 30) ? 0 : 1;
            let dx = mv.oldLoc.x - mv.speedLoc[ind].x;
            let dy = mv.oldLoc.y - mv.speedLoc[ind].y;
            let s = Math.sqrt(dx * dx + dy * dy);
            let dt = nt - mv.oldTime[ind];
            //超过300ms 不执行事件
            if (dt > 300 || s < 10) {
                return;
            }
            let v0 = s / dt;
            //速度>0.1,触发swipe事件
            if (v0 > 0.05) {
                let sname = '';
                if (dx < 0 && Math.abs(dy / dx) < 1) {
                    e.v0 = v0; //添加附加参数到e
                    sname = 'swipeleft';
                }
                if (dx > 0 && Math.abs(dy / dx) < 1) {
                    e.v0 = v0;
                    sname = 'swiperight';
                }
                if (dy > 0 && Math.abs(dx / dy) < 1) {
                    e.v0 = v0;
                    sname = 'swipedown';
                }
                if (dy < 0 && Math.abs(dx / dy) < 1) {
                    e.v0 = v0;
                    sname = 'swipeup';
                }
                if (evtObj.name === sname) {
                    evtObj.fire(e);
                }
            }
        }
    }
}

//swipe事件
ExternalNEvent.touches['swipeleft'] = ExternalNEvent.touches['swipe'];
ExternalNEvent.touches['swiperight'] = ExternalNEvent.touches['swipe'];
ExternalNEvent.touches['swipeup'] = ExternalNEvent.touches['swipe'];
ExternalNEvent.touches['swipedown'] = ExternalNEvent.touches['swipe'];
