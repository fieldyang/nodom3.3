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
                const event:NEvent = module.objectManager.getEvent(eid);
                event.dom = dom;
                //代理事件
                if(event.delg){
                    //加入父对象
                    dom.parent.addEvent(event);

                    let cacheKey = '$delg.' + evt[0] + '.' + event.id;
                    //缓存代理key
                    let arr = module.objectManager.getElementParam(dom.parent.key,cacheKey);
                    if(!arr){
                        arr = [dom.key];
                        module.objectManager.setElementParam(dom.parent.key,cacheKey);
                    }else{
                        arr.push(dom.key);
                    }
                    console.log(arr)
                    //从本地移除
                    evt[1].splice(ii,1);
                }
            });

            let handler = (e)=>{
                
                evt[1].forEach((eid,ii)=>{
                    const event:NEvent = module.objectManager.getEvent(eid);
                    
                    if(typeof event.handler === 'string'){
                        event.handler = module.getMethod(event.handler);
                    }
                    if(!event.handler){
                        return;
                    }
                    let el = dom.getEl(module);
                    
                    //禁止冒泡
                    if (event.nopopo) {
                        e.stopPropagation();
                    }
                    

                    let fire = true;
                    //代理事件，需要作用在子节点上
                    if(event.delg){ // 代理
                        let arr = event.getParam('$delg');
                        console.log(event);
                        let key = e.target.getAttribute('key');
                        if(arr.indexOf(key) !== -1){
                            let dom1 = dom.query(key);
                            if(dom1){
                                event.handler.apply(dom.model,[dom, module, e]);        
                            }
                        }
                        
                        let el1 = <HTMLElement>event.dom.getEl(module);
                        fire = e.target === el1;
                        console.log(e.target,el1,fire);
                    }else{
                        event.handler.apply(dom.model,[dom, module, e]);
                        //事件只执行一次，从事件数组删除
                        if (event.once) {
                            EventManager.unbind(module,dom,event);
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
     * @param event     事件对象
     * @returns 
     */
    public static unbind(module:Module,dom:Element,event:NEvent){
        let evts = dom.events.get(event.name);
        if(!evts){
            return;
        }
        let index;
        if((index = evts.findIndex(item=>item === event.id) === -1)) return;
        //从事件数组移除
        evts.splice(index,1);
        //判断并解绑
        if(evts.length === 0){
            let cfg = module.objectManager.getElementParam(dom.key,'$eventhandler.' + event.name);
            if(cfg.handler){
                (<HTMLElement>dom.getEl(module)).removeEventListener(event.name,cfg.handler,cfg.capture);
            }
        }
    }
}