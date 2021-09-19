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
            evt[1].forEach((eid,ii)=>{
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
                    evt[1].splice(ii,1);
                }
            });

            //避免闭包
            let handler = (e)=>{
                
                evt[1].forEach((eid,ii)=>{
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
                        console.log(ev.id,delgs);
                        //向上找节点
                        for(let p of e.path){
                            let key = p.getAttribute('key');
                            if(key && delgs.hasOwnProperty(key)){
                                let dom1 = delgs[key];
                                if(dom1){
                                    ev.handler.apply(dom.model,[dom, module, e]);        
                                }
                                break;
                            }
                        }
                    }else{
                        ev.handler.apply(dom.model,[dom, module, e]);
                        //事件只执行一次，从事件数组删除
                        if (ev.once) {
                            EventManager.unbind(module,dom,ev);
                        }
                    }
                });
            }
            // 保存handler
            module.objectManager.setElementParam(dom.key,'$eventhandler.' + evt[0] + '.handler',handler);
            module.objectManager.setElementParam(dom.key,'$eventhandler.' + evt[0] + '.capture',capture);
            el.addEventListener(evt[0],handler,capture);


            
        }
    }

    /**
     * 解绑一个事件
     * @param module    模块     
     * @param dom       dom节点
     * @param ev     事件对象
     * @returns 
     */
    public static unbind(module:Module,dom:Element,ev:NEvent){
        let evts = dom.events.get(ev.name);
        if(!evts){
            return;
        }
        let index;
        if((index = evts.findIndex(item=>item === ev.id) === -1)) return;
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