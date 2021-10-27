import {Module,Router} from '../../dist/nodom.js'
export class MRoute extends Module{
    template(){
        return `
            <div>
                <p>route测试</p>
                <div x-router></div>
            </div>
        `
    }
    onFirstRender(){
        let path;
        if (location.hash) {
            path = location.hash.substr(1);
        }
        //默认home ，如果存在hash值，则把hash值作为路由进行跳转，否则跳转到默认路由
        path = path || "/router";
        Router.go(path);
    }
}