import { VirtualDom } from "./virtualdom";
import { GlobalCache } from "./globalcache";
import { Module } from "./module";
import { Util } from "./util";

/**
 * 事件类
 * @remarks
 * 事件分为自有事件和代理事件
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
     * 事件处理函数名(需要在模块methods中定义)
     */
    public handler: string | Function;
    /**
     * 代理模式，事件代理到父对象
     */
    public delg: boolean;
    /**
     * 禁止冒泡，代理模式下无效
     */
    public nopopo: boolean;
    /**
     * 只执行一次
     */
    public once: boolean;

    /**
     * 使用 capture，代理模式下无效
     */
    public capture: boolean;

    /**
     * 依赖事件，用于扩展事件存储原始事件对戏
     */
    public dependEvent:NEvent;
    

    /**
     * @param module        模块
     * @param eventName     事件名
     * @param eventStr      事件串或事件处理函数,以“:”分割,中间不能有空格,结构为: 方法名[:delg(代理到父对象):nopopo(禁止冒泡):once(只执行一次):capture(useCapture)]
     *                      如果为函数，则替代第三个参数
     * @param handler       事件执行函数，如果方法不在module methods中定义，则可以直接申明，eventStr第一个参数失效，即eventStr可以是":delg:nopopo..."
     */
    constructor(eventName: string, eventStr?: string | Function, handler?: Function) {
        this.id = Util.genId();
        this.name = eventName;
        
        GlobalCache.saveEvent(this);
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
        
        if (document.ontouchend) { //触屏设备
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
     * 设置附加参数值
     * @param module    模块
     * @param dom       虚拟dom
     * @param name      参数名
     * @param value     参数值
     */
    public setParam(module:Module,dom:VirtualDom,name: string, value: any) {
        module.objectManager.setEventParam(this.id,dom.key,name,value);
    }

    /**
     * 获取附加参数值
     * @param module    模块
     * @param dom       虚拟dom
     * @param name      参数名
     * @returns         参数值
     */
    public getParam(module:Module,dom:VirtualDom,name: string) {
        return module.objectManager.getEventParam(this.id,dom.key,name);
    }

    /**
     * 移除参数
     * @param module    模块 
     * @param dom       虚拟dom
     * @param name      参数名
     */
    public removeParam(module:Module,dom:VirtualDom,name: string) {
        return module.objectManager.removeEventParam(this.id,dom.key,name);
    }
    /**
     * 清参数cache
     * @param module    模块
     * @param dom       虚拟dom
     */
    public clearParam(module:Module,dom:VirtualDom){
        module.objectManager.clearEventParam(this.id,dom.key);
    }
}
