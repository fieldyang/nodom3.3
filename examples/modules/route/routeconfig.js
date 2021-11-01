import {createRoute} from "../../../dist/nodom.js";
import {MdlRouteDir} from "./mdlroutedir.js";
import {MdlPMod1} from "./mdlpmod1.js";
import {MdlPMod2} from "./mdlpmod2.js";
import {MdlPMod3} from "./mdlpmod3.js";
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
                    module: 'MdlMod1',
                    modulePath:'/examples/modules/route/mdlmod1.js'
                }, {
                    path: '/list',
                    module: 'MdlMod2',
                    modulePath:'/examples/modules/route/mdlmod2.js'
                }, {
                    path: '/data',
                    module: 'MdlMod3',
                    modulePath:'/examples/modules/route/mdlmod3.js'
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
                    onEnter: function () {
                        // console.log('route2/rparam');
                    },
                    routes:[{
                        path:'/desc',
                        module:MdlMod7
                    },{
                        path:'/comment',
                        module:MdlMod8
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