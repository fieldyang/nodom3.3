import {createRoute} from "../../../dist/nodom.js";
import {MdlRouteDir} from "./mdlroutedir.js";
import {MdlPMod1} from "./mdlpmod1.js";
import {MdlPMod2} from "./mdlpmod2.js";
import {MdlPMod3} from "./mdlpmod3.js";
import {MdlMod1} from "./mdlmod1.js";
import {MdlMod2} from "./mdlmod2.js";
import {MdlMod3} from "./mdlmod3.js";
import {MdlMod4} from "./mdlmod4.js";
import {MdlMod5} from "./mdlmod5.js";
import {MdlMod6} from "./mdlmod6.js";
import {MdlMod7} from "./mdlmod7.js";
import {MdlMod8} from "./mdlmod8.js";

export function initRoute(){
    createRoute([{
        path: '/router',
        module: MdlRouteDir,
        routes: [
            {
                path: '/route1',
                module: MdlPMod1,
                routes: [{
                    path: '/home',
                    module: MdlMod1
                }, {
                    path: '/list',
                    module: MdlMod2
                }, {
                    path: '/data',
                    module: MdlMod3
                }],
                onLeave:function(model){
                    // console.log(this,model);
                }
            },
            {
                path: '/route2',
                module: MdlPMod2,
                onEnter: function () {
                    // console.log('route2');
                },
                routes: [{
                    path: '/rparam/:page/:id',
                    module: MdlMod4,
                    // useParentPath:true,
                    onEnter: function () {
                        // console.log('route2/rparam');
                    },
                    routes:[{
                        path:'/desc',
                        module:MdlMod7,
                        // useParentPath:true
                    },{
                        path:'/comment',
                        module:MdlMod8,
                        // useParentPath:true
                    }]
                }]
            }, 
            {
                path: '/route3',
                module: MdlPMod3,
                routes: [{
                    path: '/r1',
                    module: MdlMod5,
                    routes: [{
                        path: '/r2',
                        module: MdlMod6
                    }]
                }]
            }
        ]
    }])
}