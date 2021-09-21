import { Module } from "./module";
import { Element } from "./element";
import { NEvent } from "./event";
/**
 * 事件管理器
 */
export class EventManager{
    /**
     * 外部事件集
     */
     private static extendEventMap = new Map();
    /**
     * 绑定事件
     * @param module 
     * @param dom 
     */
    public static bind(module:Module,dom:Element){
        //判断并设置事件绑定标志
        if(dom.getParam(module,'$eventDispatched')){
            return;
        }
        dom.setParam(module,'$eventDispatched',true);

        let el = module.objectManager.getNode(dom.key);
        for (let evt of dom.events) {
            //同一个事件名可能对应多个事件对象
            if(evt[1].length === 0) return;
            //获取usecapture
            let capture = (evt[1].findIndex(item=>module.objectManager.getEvent(item).capture === true) !== -1);
            
            // 只代理一次，也只绑定一次

            //是否已代理
            let hasDelg:boolean = false;
            //是否已绑定
            let hasBound:boolean = false;
            //遍历处理代理事件
            for(let ii=0;ii<evt[1].length;ii++){
                const ev:NEvent = module.objectManager.getEvent(evt[1][ii]);
                //处理外部事件，如果有外部事件，则移除改事件
                if(this.handleExtendEvent(module,dom,ev)){
                    evt[1].splice(ii--,1);
                    continue;
                }

                //当前事件名已绑定且已代理，不再执行
                if(hasBound && hasDelg){
                    break;
                }
                
                //代理事件
                if(ev.delg && !hasDelg){
                    //加入父对象
                    dom.parent.addEvent(ev);
                    // 保存代理dom信息
                    let delgs = ev.getParam(dom.parent,'$delgs');
                    if(!delgs){
                        delgs = {};
                        ev.setParam(dom.parent,'$delgs',delgs);
                    }
                    delgs[dom.key] = dom;
                    //从本地移除
                    evt[1].splice(ii--,1);
                    const parent = dom.parent;
                    //如果父无此事件，则需要绑定到父事件
                    let eh = parent.getParam(module,'$events.' + evt[0]);
                    if(!eh){
                        // 保存handler
                        parent.setParam(module,'$events.' + evt[0],{
                            handler:handler,
                            capture:ev.capture
                        });
                        module.objectManager.getNode(parent.key).addEventListener(evt[0],handler,ev.capture);
                    }
                    hasDelg = true;
                }else if(!hasBound){
                    hasBound = true;
                    // 保存handler
                    dom.setParam(module,'$events.' + evt[0],{
                        handler:handler,
                        capture:capture
                    });
                    el.addEventListener(evt[0],handler,capture);
                }
            }
        }

        /**
         * 事件handler
         * @param e  Event
         */
        function handler(e){
            //从事件element获取事件
            let el = e.currentTarget;
            let dom = module.getElement(el.getAttribute('key'));
            if(!dom){
                return;
            }
            let evts = dom.getEvent(e.type);
            if(!evts){
                return;
            }
            //已执行事件map，不重复执行
            let execMap = new Map();

            for(let ii=0;ii<evts.length;ii++){
                const eid = evts[ii];
                const ev:NEvent = module.objectManager.getEvent(eid);
                if(typeof ev.handler === 'string'){
                    ev.handler = module.getMethod(ev.handler);
                }
                if(!ev.handler){
                    return;
                }

                //禁止冒泡
                if (ev.nopopo) {
                    e.stopPropagation();
                }

                //代理事件，需要作用在子节点上
                if(ev.delg){ // 代理
                    let delgs = ev.getParam(dom,'$delgs');
                    //向上找节点
                    for(let i=0;i<e.path.length&&e.path[i] !== el;i++){
                        let el1 = e.path[i];
                        let key = el1.getAttribute('key');
                        //　找到事件节点
                        if(key && delgs.hasOwnProperty(key)){
                            let dom1 = delgs[key];
                            if(dom1){
                                //如果dom对应的事件已执行，不再执行
                                if(execMap.get(ev.id) === dom1.key){
                                    break;
                                }
                                ev.handler.apply(dom1.model,[dom1, module,ev, e]);
                                execMap.set(ev.id,dom1.key);
                                if(ev.once){
                                    EventManager.unbind(module,dom1,ev);
                                }
                            }
                            break;
                        }
                    }
                }else{
                    ev.handler.apply(dom.model,[dom, module,ev, e]);
                    //事件只执行一次，从事件数组删除
                    if (ev.once) {
                        EventManager.unbind(module,dom,ev);
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
    public static unbind(module:Module,dom:Element,ev:NEvent){
        let evts;
        if(ev.delg){
            evts = dom.parent.events.get(ev.name);
            let delgs = ev.getParam(dom.parent,'$delgs');
            delete delgs[dom.key];
            //如果代理不为空，则不删除事件
            if(Object.keys(delgs).length > 0){
                return;
            }
        }else{
            evts = dom.events.get(ev.name);
        }
        if(!evts){
            return;
        }
        let index;
        if((index = evts.findIndex(item=>item === ev.id)) === -1) return;
        //从事件数组移除
        evts.splice(index,1);
        //判断并解绑
        if(evts.length === 0){
            let cfg = dom.getParam(module,'$events.' + ev.name);
            if(cfg.handler){
                (<HTMLElement>dom.getEl(module)).removeEventListener(ev.name,cfg.handler,cfg.capture);
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
    private static handleExtendEvent(module:Module,dom:Element,event:NEvent):boolean{
        let evts = this.get(event.name);
        if(!evts){
            return false;
        }
        for(let key of Object.keys(evts)){
            let ev = new NEvent(module,key,evts[key]);
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
     public static regist(eventName:string,handleObj:any) {
         this.extendEventMap.set(eventName,handleObj);
     }
 
     /**
      * 取消注册扩展事件
      * @param eventName     事件名
      */
     static unregist(eventName:string) {
         return this.extendEventMap.delete(eventName);
     }
 
     /**
      * 获取扩展事件
      * @param eventName     事件名
      * @returns             事件处理集
      */
      public static get(eventName:string):any{
         return this.extendEventMap.get(eventName);
     }
}