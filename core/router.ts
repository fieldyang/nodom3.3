import { NError } from "./error";
import { Model } from "./model";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { NodomMessage } from "./nodom";
import { Route } from "./route";
import { Util } from "./util";

/**
 * 路由类
 * @since 		1.0
 */
export class Router {
    /**
     * 加载中标志
     */
    static loading:boolean = false;
    /**
     * 路由map
     */
    static routeMap:Map<number,Route> = new Map();
    /**
     * 当前路径
     */
    static currentPath:string = '';
    
    /**
     * path等待链表
     */
    static waitList:Array<string> = []; 
    
    /**
     * 默认路由进入事件方法
     */
    static onDefaultEnter:Function;
    /**
     * 默认路由离开事件
     */
    static onDefaultLeave:Function; 
    
    /**
     * 启动方式 0:直接启动 1:popstate 启动
     */
    static startStyle:number = 0;

    /**
     * 激活Dom map，格式为{moduleId:[]}
     */
    static activeFieldMap:Map<number,Array<any>> = new Map();

    /**
     * 绑定到module的router指令对应的key，即router容器对应的key，格式为 {moduleId:routerKey,...}
     */
    static routerKeyMap:Map<number,string> = new Map();

    /**
     * 根路由
     */
    static root:Route;
    
    /**
     * 把路径加入跳转列表(准备跳往该路由)
     * @param path 	路径 
     */
    static go(path:string) {
        //相同路径不加入
        if(path === this.currentPath){
            return;
        }
        for (let i = 0; i < this.waitList.length; i++) {
            let li:string = this.waitList[i];
            //相等，则不加入队列
            if (li === path) {
                return;
            }
            //父路径，不加入
            if (li.indexOf(path) === 0 && li.substr(path.length + 1,1) === '/') {
                return;
            }
        }
        
        //添加路径到等待列表
        if(this.waitList.indexOf(path) === -1){
            this.waitList.push(path);
        }

        setTimeout(()=>{
            this.load();
        },0);
    }

    /**
     * 启动加载
     */
    private static load() {
        //在加载，或无等待列表，则返回
        if (this.loading || this.waitList.length === 0) {
            return;
        }
        let path:string = this.waitList.shift();
        this.start(path);
        //继续加载
        this.load();
    }

    /**
     * 切换路由
     * @param path 	路径
     */
    private static start(path:string) {
        let diff = this.compare(this.currentPath, path);
        // 当前路由依赖的容器模块
        let parentModule:Module;
        if(diff[0] === null){
            parentModule = ModuleFactory.getMain();
        }else{
            if(typeof diff[0].module === 'function'){
                parentModule = ModuleFactory.getInstance(diff[0].module);
            }else{
                parentModule = ModuleFactory.get(diff[0].module);
            }
        }
        
        //父模块不存在，不继续处理
        if(!parentModule){
            return;
        }
        //onleave事件，从末往前执行
        for (let i = diff[1].length - 1; i >= 0; i--) {
            const r = diff[1][i];
            if (!r.module) {
                continue;
            }
            let module:Module = ModuleFactory.get(r.module);
            if (Util.isFunction(this.onDefaultLeave)) {
                this.onDefaultLeave(module.model);
            }
            if (Util.isFunction(r.onLeave)) {
                r.onLeave(module.model);
            }
            //module置为不激活
            module.unactive();
        }
        console.log(diff);
        if (diff[2].length === 0) { //路由相同，参数不同
            let route:Route = diff[0];
            if (route !== null) {
                let module:Module = ModuleFactory.get(<number>route.module);
                // 模块处理
                handle(module,route,parentModule);
            }
        } else { //路由不同
            //加载模块
            for (let ii = 0; ii < diff[2].length; ii++) {
                let route:Route = diff[2][ii];

                //路由不存在或路由没有模块（空路由）
                if (!route || !route.module) {
                    continue;
                }
                
                let module:Module;
                
                if(typeof route.module === 'function'){
                    module = ModuleFactory.getInstance(route.module);
                    if(!module){
                        throw new NError('notexist1',NodomMessage.TipWords['module'],route.module.name);
                    }
                    route.module = module.id;
                }else{ //尚未获取module，进行初始化
                    module = ModuleFactory.get(<number>route.module);      
                }
                console.log(this.routerKeyMap);
                let routerKey:string = this.routerKeyMap.get(parentModule.id);
                console.log(parentModule,routerKey);
                module.containerKey = routerKey;
                // 模块处理
                handle(module,route,parentModule);
                //默认全局路由enter事件
                if (Util.isFunction(this.onDefaultEnter)) {
                    this.onDefaultEnter(module.model);
                }
                //当前路由进入事件
                if (Util.isFunction(route.onEnter)) {
                    route.onEnter(module.model);
                }
                parentModule = module;
            }
        }
        //如果是history popstate，则不加入history
        if (this.startStyle === 0) {
            //子路由，替换state
            if (path.startsWith(this.currentPath)) {
                history.replaceState(path, '', path);
            } else { //路径push进history
                history.pushState(path, '', path);
            }
        }
        //修改currentPath
        this.currentPath = path;
        //设置start类型为正常start
        this.startStyle = 0;
        
        /**
         * 处理
         * @param module            模块
         * @param parentModule      router容器模块
         * @param route             路由
         */
        function handle(module:Module,route:Route,parentModule:Module){
            //设置首次渲染
            module.setFirstRender(true);
            module.active();
            Router.setActive(parentModule,route.fullPath);
            //设置参数
            let o = {
                path: route.path
            };
            if (!Util.isEmpty(route.data)) {
                o['data'] = route.data;
            }
            if (!module.model) {
                module.model = new Model({}, module);
            }
            module.model['$route'] = o;
        }
    }

    /*
        * 重定向
        * @param path 	路径
        */
    static redirect(path:string) {
        this.go(path);
    }

    /**
     * 比较两个路径对应的路由链
     * @param path1 	第一个路径
     * @param path2 	第二个路径
     * @returns 		不同路由[父路由，第一个需要销毁的路由数组，第二个需要增加的路由数组，上2级路由]
     *                  不同参数[当前路由,,上1级路由]
     */
    private static compare(path1:string, path2:string):Array<any> {
        // 获取路由id数组
        let arr1:Array<Route> = null;
        let arr2:Array<Route> = null;

        if (path1) {
            arr1 = this.getRoute(path1);
        }
        if (path2) {
            arr2 = this.getRoute(path2);
        }
        
        let len = 0;
        if (arr1 !== null) {
            len = arr1.length;
        }

        if (arr2 !== null) {
            if (arr2.length < len) {
                len = arr2.length;
            }
        } else {
            len = 0;
        }
        //需要销毁的旧路由数组
        let retArr1 = [];
        //需要加入的新路由数组
        let retArr2 = [];
        let i = 0;
        console.log(arr1,arr2);
        for (i = 0; i < len; i++) {
            //找到不同路由开始位置
            if (arr1[i].id === arr2[i].id) {
                //比较参数
                if (JSON.stringify(arr1[i].data) !== JSON.stringify(arr2[i].data)) {
                    //从后面开始更新，所以需要i+1
                    // i++;
                    console.log(i);
                    break;
                }
            } else {
                break;
            }
        }
        
        //旧路由改变数组
        if (arr1 !== null) {
            retArr1 = arr1.slice(i);
        }
        
        //新路由改变数组（相对于旧路由）
        if (arr2 !== null) {
            retArr2 = arr2.slice(i);
        }
        console.log(retArr1,retArr2);
        
        //上一级路由和上二级路由
        let p1:Route = null;
        let p2:Route = null;
        if (arr1 !== null) {
            //如果是不同参数，则向前走一次（因为前一个是当前路由）
            // let st = retArr2.length===0?i-1:i-2;
            console.log(i);
            let st = i-1;
            for (let j = st; j >= 0 && (p1 === null || p2 === null); j--) {
                if (arr1[j].module !== undefined) {
                    if (p1 === null) {
                        p1 = arr1[j];
                    } else if (p2 === null) {
                        p2 = arr1[j];
                    }
                }
            }
        }
        return [p1, retArr1, retArr2, p2];
    }

    /**
     * 添加激活字段
     * @param module    模块 
     * @param path      路由路径
     * @param model     激活字段所在model
     * @param field     字段名
     */
    static addActiveField(module:Module,path:string,model:any,field:string){
        if(!model || !field){
            return;
        }
        let arr = Router.activeFieldMap.get(module.id);
        if(!arr){  //尚未存在，新建
            Router.activeFieldMap.set(module.id, [{path:path,model:model,field:field}]);
        }else if(arr.find(item=>item.model===model&&item.field===field) === undefined){  //不重复添加
            arr.push({path:path,model:model,field:field});
        }
    }

    /**
     * 修改模块active view（如果为view active为true，则需要路由跳转）
     * @param module 	模块
     * @param path 		view对应的route路径
     */
    static setActive(module:Module, path:string) {
        if(!module || !path){
            return;
        }
        let arr = Router.activeFieldMap.get(module.id);
        if(!arr){
            return;
        }
        
        for(let o of arr){
            o.model[o.field] = o.path === path;
        }
    }

    /**
     * 添加路由
     * @param route 	路由配置 
     * @param parent 	父路由 
     */
     static addRoute(route:Route, parent:Route) {
        //建立根(空路由)
        if(!this.root){
            this.root = new Route();
        }
        
        let pathArr:Array<string> = route.path.split('/');
        let node:Route = parent || this.root;
        let param:Array<string> = [];
        let paramIndex:number = -1; //最后一个参数开始
        let prePath:string = '';    //前置路径
        for (let i = 0; i < pathArr.length; i++) {
            let v = pathArr[i].trim();
            if (v === '') {
                pathArr.splice(i--, 1);
                continue;
            }

            if (v.startsWith(':')) { //参数
                if (param.length === 0) {
                    paramIndex = i;
                }
                param.push(v.substr(1));
            } else {
                paramIndex = -1;
                param = []; //上级路由的参数清空
                route.path = v; //暂存path
                let j = 0;
                for (; j < node.children.length; j++) {
                    let r = node.children[j];
                    if (r.path === v) {
                        node = r;
                        break;
                    }
                }

                //没找到，创建新节点
                if (j === node.children.length) {
                    if (prePath !== '') {
                        new Route({ path: prePath, parent:node });
                        node = node.children[node.children.length - 1];
                    }
                    prePath = v;
                }
            }

            //不存在参数
            if (paramIndex === -1) {
                route.params = [];
            } else {
                route.params = param;
            }
        }

        //添加到树
        if (node !== undefined && node !== route) {
            route.path = prePath;
            node.addChild(route);
        }
        
        // 添加到路由map    
        this.routeMap.set(route.id, route);
    }

    /**
     * 获取路由
     * @param path 	路径
     * @param last 	是否获取最后一个路由,默认false
     * @returns     路由数组
     */
    static getRoute(path:string, last?:boolean):Array<Route> {
        if(!this.root){
            return[];
        }
        let pathArr:string[] = path.split('/');
        let node:Route = this.root;
        
        let paramIndex:number = 0;      //参数索引
        let retArr:Array<Route> = [];
        let fullPath:string = '';       //完整路径
        let preNode:Route = this.root;  //前一个节点

        for (let i = 0; i < pathArr.length; i++) {
            let v:string = pathArr[i].trim();
            if (v === '') {
                continue;
            }
            let find:boolean = false;
            for (let j=0; j<node.children.length; j++) {
                if (node.children[j].path === v) {
                    //设置完整路径
                    if (preNode !== this.root) {
                        preNode.fullPath = fullPath;
                        preNode.data = node.data;
                        retArr.push(preNode);
                    }

                    //设置新的查找节点
                    node = node.children[j];
                    //参数清空
                    node.data = {};
                    preNode = node;
                    find = true;
                    //参数索引置0
                    paramIndex = 0;
                    break;
                }
            }
            //路径叠加
            fullPath += '/' + v;
            //不是孩子节点,作为参数
            if (!find) {
                if (paramIndex < node.params.length) { //超出参数长度的废弃
                    node.data[node.params[paramIndex++]] = v;
                }
            }
        }

        //最后一个节点
        if (node !== this.root) {
            node.fullPath = fullPath;
            retArr.push(node);
        }

        if (last) { //获取最后一个
            return [retArr.pop()];
        } else { //获取所有
            return retArr;
        }
    }
}


//处理popstate事件
window.addEventListener('popstate', function (e) {
    //根据state切换module
    const state = history.state;
    if (!state) {
        return;
    }
    Router.startStyle = 1;
    Router.go(state);
});
