import { NEvent } from "../core/event";
import { Util } from "../core/util";

/**
 * 扩展事件
 */
 export class ExternalEvent {
    /**
     * 触屏事件
     */
    static touches: any = {};
    /**
     * 注册事件
     * @param evtObj    event对象
     * @param el        事件绑定的html element
     */
    static regist(evtObj: NEvent, el: HTMLElement) {
        //触屏事件组
        let touchEvts: any = ExternalEvent.touches[evtObj.name];
        //如果绑定了，需要解绑
        if (!Util.isEmpty(evtObj.touchListeners)) {
            this.unregist(evtObj);
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
        const evt = ExternalEvent.touches[evtObj.name];
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
//  ExternalEvent.touches = {
//     tap: {
//         touchstart: function (e: TouchEvent, evtObj: NEvent) {
//             let tch = e.touches[0];
//             evtObj.setParam('pos', { sx: tch.pageX, sy: tch.pageY, t: Date.now() });
//         },
//         touchmove: function (e: TouchEvent, evtObj: NEvent) {
//             let pos = evtObj.getParam('pos');
//             let tch = e.touches[0];
//             let dx = tch.pageX - pos.sx;
//             let dy = tch.pageY - pos.sy;
//             //判断是否移动
//             if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
//                 pos.move = true;
//             }
//         },
//         touchend: function (e: TouchEvent, evtObj: NEvent) {
//             let pos = evtObj.getParam('pos');
//             let dt = Date.now() - pos.t;
//             //点下时间不超过200ms
//             if (pos.move === true || dt > 200) {
//                 return;
//             }
//             // evtObj.fire(e);
//         }
//     },
//     swipe: {
//         touchstart: function (e: TouchEvent, evtObj: NEvent) {
//             let tch = e.touches[0];
//             let t = Date.now();
//             evtObj.setParam('swipe', {
//                 oldTime: [t, t],
//                 speedLoc: [{ x: tch.pageX, y: tch.pageY }, { x: tch.pageX, y: tch.pageY }],
//                 oldLoc: { x: tch.pageX, y: tch.pageY }
//             });
//         },
//         touchmove: function (e: TouchEvent, evtObj: NEvent) {
//             let nt = Date.now();
//             let tch = e.touches[0];
//             let mv = evtObj.getParam('swipe');
//             //50ms记录一次
//             if (nt - mv.oldTime[1] > 50) {
//                 mv.speedLoc[0] = { x: mv.speedLoc[1].x, y: mv.speedLoc[1].y };
//                 mv.speedLoc[1] = { x: tch.pageX, y: tch.pageY };
//                 mv.oldTime[0] = mv.oldTime[1];
//                 mv.oldTime[1] = nt;
//             }
//             mv.oldLoc = { x: tch.pageX, y: tch.pageY };
//         },
//         touchend: function (e: any, evtObj: NEvent) {
//             let mv = evtObj.getParam('swipe');
//             let nt = Date.now();

//             //取值序号 0 或 1，默认1，如果释放时间与上次事件太短，则取0
//             let ind = (nt - mv.oldTime[1] < 30) ? 0 : 1;
//             let dx = mv.oldLoc.x - mv.speedLoc[ind].x;
//             let dy = mv.oldLoc.y - mv.speedLoc[ind].y;
//             let s = Math.sqrt(dx * dx + dy * dy);
//             let dt = nt - mv.oldTime[ind];
//             //超过300ms 不执行事件
//             if (dt > 300 || s < 10) {
//                 return;
//             }
//             let v0 = s / dt;
//             //速度>0.1,触发swipe事件
//             if (v0 > 0.05) {
//                 let sname = '';
//                 if (dx < 0 && Math.abs(dy / dx) < 1) {
//                     e.v0 = v0; //添加附加参数到e
//                     sname = 'swipeleft';
//                 }
//                 if (dx > 0 && Math.abs(dy / dx) < 1) {
//                     e.v0 = v0;
//                     sname = 'swiperight';
//                 }
//                 if (dy > 0 && Math.abs(dx / dy) < 1) {
//                     e.v0 = v0;
//                     sname = 'swipedown';
//                 }
//                 if (dy < 0 && Math.abs(dx / dy) < 1) {
//                     e.v0 = v0;
//                     sname = 'swipeup';
//                 }
//                 if (evtObj.name === sname) {
//                     // evtObj.fire(e);
//                 }
//             }
//         }
//     }
// }

//swipe事件
ExternalEvent.touches['swipeleft'] = ExternalEvent.touches['swipe'];
ExternalEvent.touches['swiperight'] = ExternalEvent.touches['swipe'];
ExternalEvent.touches['swipeup'] = ExternalEvent.touches['swipe'];
ExternalEvent.touches['swipedown'] = ExternalEvent.touches['swipe'];
