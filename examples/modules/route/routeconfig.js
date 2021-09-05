import { createRoute } from "../../../dist/nodom.js";
import {MIndex} from './mindex.js';
import {ModuleA}from './modulea.js';
export function initRoute(){
    createRoute([{
        path:'/router',
        module:MIndex,
        routes:[{
            path:'/r1',
            module:ModuleA
        }]
    }])
}