import { Module } from "./module";
import { Element } from "./element";
import { NEvent } from "./event";
/**
 * 事件管理器
 */
export class EventManager{
    /**
     * 绑定事件
     * @param module 
     * @param dom 
     */
    public static bind(module:Module,dom:Element){
        let el = module.objectManager.getNode(dom.key);
        for (let evt of dom.events) {
            if(evt[1].length === 0) return;
            //获取usecapture
            let capture = (evt[1].findIndex(item=>module.objectManager.getEvent(item).capture === true) !== -1);
            
            //遍历处理代理事件
            for(let ii=0;ii<evt[1].length;ii++){
                let eid = evt[1][ii];
                const ev:NEvent = module.objectManager.getEvent(eid);
                //代理事件
                if(ev.delg){
                    //加入父对象
                    dom.parent.addEvent(ev);
                    // 保存代理dom信息
                    let delgs = ev.getParam('$delgs');
                    if(!delgs){
                        delgs = {};
                        ev.setParam('$delgs',delgs);
                    }
                    delgs[dom.key] = dom;
                    //从本地移除
                    evt[1].splice(ii--,1);
                    let pkey = dom.parent.key;
                    //如果父无此事件，则需要绑定到父事件
                    let eh = module.objectManager.getElementParam(pkey,'$eventhandler.' + evt[0]);
                    if(!eh){
                        // 保存handler
                        module.objectManager.setElementParam(pkey,'$eventhandler.' + evt[0] + '.handler',handler);
                        module.objectManager.setElementParam(pkey,'$eventhandler.' + evt[0] + '.capture',ev.capture);
                        module.objectManager.getNode(pkey).addEventListener(evt[0],handler,ev.capture);
                    }
                }
            }

            // 保存handler
            module.objectManager.setElementParam(dom.key,'$eventhandler.' + evt[0] + '.handler',handler);
            module.objectManager.setElementParam(dom.key,'$eventhandler.' + evt[0] + '.capture',capture);
            el.addEventListener(evt[0],handler,capture);
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
                    let delgs = ev.getParam('$delgs');
                    //向上找节点
                    for(let i=0;i<e.path.length&&e.path[i] !== el;i++){
                        let el1 = e.path[i];
                        let key = el1.getAttribute('key');
                        if(key && delgs.hasOwnProperty(key)){
                            let dom1 = delgs[key];
                            if(dom1){
                                if(execMap.get(ev.id) === dom1.key){
                                    break;
                                }
                                ev.handler.apply(dom1.model,[dom1, module, e]);
                                execMap.set(ev.id,dom1.key);
                                if(ev.once){
                                    EventManager.unbind(module,dom1,ev);
                                }
                            }
                            break;
                        }
                    }
                }else{
                    ev.handler.apply(dom.model,[dom, module, e]);
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
            let delgs = ev.getParam('$delgs');
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
        console.log('unbind');
        let index;
        if((index = evts.findIndex(item=>item === ev.id)) === -1) return;
        //从事件数组移除
        evts.splice(index,1);
        //判断并解绑
        if(evts.length === 0){
            let cfg = module.objectManager.getElementParam(dom.key,'$eventhandler.' + ev.name);
            if(cfg.handler){
                (<HTMLElement>dom.getEl(module)).removeEventListener(ev.name,cfg.handler,cfg.capture);
            }
        }
    }
}