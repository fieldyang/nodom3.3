import { NEvent } from "../core/event";
import { Module } from "../core/module";
import { VirtualDom } from "../core/virtualdom";
import { EventManager } from "../core/eventmanager";

/**
 * tap事件
 */
EventManager.regist('tap',{
    touchstart(dom:VirtualDom,module:Module,evtObj:NEvent,e: TouchEvent) {
        let tch = e.touches[0];
        evtObj.dependEvent.setParam(module,dom,'pos', { sx: tch.pageX, sy: tch.pageY, t: Date.now() });
    },
    touchmove(dom:VirtualDom,module:Module,evtObj:NEvent,e: TouchEvent) {
        let pos = evtObj.dependEvent.getParam(module,dom,'pos');
        if(!pos){
            return;
        }
        let tch = e.touches[0];
        let dx = tch.pageX - pos.sx;
        let dy = tch.pageY - pos.sy;
        //判断是否移动
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            pos.move = true;
        }
    },
    touchend(dom:VirtualDom,module:Module,evtObj:NEvent,e: TouchEvent) {
        let pos = evtObj.dependEvent.getParam(module,dom,'pos');
        if(!pos){
            return;
        }
        evtObj.dependEvent.removeParam(module,dom,'pos');
        let dt = Date.now() - pos.t;
        
        //点下时间不超过200ms,触发事件
        if (!pos.move && dt < 200) {
            let foo = evtObj.dependEvent.handler;
            if(typeof foo === 'string'){
                foo = module.getMethod(foo);
            }
            if(foo){
                foo.apply(module,[dom.model, dom,evtObj.dependEvent, e]); 
            }
        }
    }
});

/**
 * swipe事件
 */
 EventManager.regist('swipe',{
    touchstart(dom:VirtualDom,module:Module,evtObj:NEvent,e: TouchEvent){
        let tch = e.touches[0];
        let t = Date.now();
        evtObj.dependEvent.setParam(module,dom,'swipe', {
            oldTime: [t, t],
            speedLoc: [{ x: tch.pageX, y: tch.pageY }, { x: tch.pageX, y: tch.pageY }],
            oldLoc: { x: tch.pageX, y: tch.pageY }
        });
    },
    touchmove(dom:VirtualDom,module:Module,evtObj:NEvent,e: TouchEvent){
        let nt = Date.now();
        let tch = e.touches[0];
        let mv = evtObj.dependEvent.getParam(module,dom,'swipe');
        //50ms记录一次
        if (nt - mv.oldTime[1] > 50) {
            mv.speedLoc[0] = { x: mv.speedLoc[1].x, y: mv.speedLoc[1].y };
            mv.speedLoc[1] = { x: tch.pageX, y: tch.pageY };
            mv.oldTime[0] = mv.oldTime[1];
            mv.oldTime[1] = nt;
        }
        mv.oldLoc = { x: tch.pageX, y: tch.pageY };
    },
    touchend(dom:VirtualDom,module:Module,evtObj:NEvent,e: any){
        let mv = evtObj.dependEvent.getParam(module,dom,'swipe');
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
            //处理swipe
            if (evtObj.dependEvent.name === sname) {
                let foo = evtObj.dependEvent.handler;
                if(typeof foo === 'string'){
                    foo = module.getMethod(foo);
                }
                if(foo){
                    foo.apply(module,[dom.model, dom,evtObj.dependEvent, e]); 
                }
            }
        }
    }
});

//把swpie注册到4个方向
EventManager.regist('swipeleft',EventManager.get('swipe'));
EventManager.regist('swiperight',EventManager.get('swipe'));
EventManager.regist('swipeup',EventManager.get('swipe'));
EventManager.regist('swipedown',EventManager.get('swipe'));
