var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Compiler } from "./compiler";
import { Nodom } from "./nodom";
import { Serializer } from "./serializer";
import { Util } from "./util";
/**
 * 资源管理器
 * 用于url资源的加载及管理，主要针对js、模版等
 */
export class ResourceManager {
    /**
     * 获取多个资源
     * @param urls  [{url:**,type:**}]或 [url1,url2,...]
     * @returns     IResourceObj
     */
    static getResources(reqs) {
        return __awaiter(this, void 0, void 0, function* () {
            let me = this;
            this.preHandle(reqs);
            //无请求
            if (reqs.length === 0) {
                return [];
            }
            let taskId = Util.genId();
            //设置任务资源数组
            let resArr = [];
            for (let item of reqs) {
                resArr.push(item.url);
            }
            this.loadingTasks.set(taskId, resArr);
            return new Promise((res, rej) => __awaiter(this, void 0, void 0, function* () {
                //保存资源id状态
                for (let item of reqs) {
                    let url = item.url;
                    if (this.resources.has(url)) { //已加载，直接获取资源内容
                        let r = me.awake(taskId);
                        if (r) {
                            res(r);
                        }
                    }
                    else if (this.waitList.has(url)) { //加载中，放入资源等待队列
                        this.waitList.get(url).push(taskId);
                    }
                    else { //新加载
                        //将自己的任务加入等待队列
                        this.waitList.set(url, [taskId]);
                        //请求资源
                        let content = yield Nodom.request({ url: url });
                        let rObj = { type: item.type, content: content };
                        this.handleOne(url, rObj);
                        this.resources.set(url, rObj);
                        let arr = this.waitList.get(url);
                        //从等待列表移除
                        this.waitList.delete(url);
                        //唤醒任务
                        for (let tid of arr) {
                            let r = me.awake(tid);
                            if (r) {
                                res(r);
                            }
                        }
                    }
                }
            }));
        });
    }
    /**
     * 唤醒任务
     * @param taskId    任务id
     * @returns         加载内容数组或undefined
     */
    static awake(taskId) {
        if (!this.loadingTasks.has(taskId)) {
            return;
        }
        let resArr = this.loadingTasks.get(taskId);
        let finish = true;
        //资源内容数组
        let contents = [];
        //检查是否全部加载完成
        for (let url of resArr) {
            //一个未加载完，则需要继续等待
            if (!this.resources.has(url)) {
                finish = false;
                break;
            }
            //放入返回对象
            contents.push(this.resources.get(url));
        }
        //加载完成
        if (finish) {
            //从loadingTask删除
            this.loadingTasks.delete(taskId);
            return contents;
        }
    }
    /**
     * 获取url类型
     * @param url   url
     * @returns     url type
     */
    static getType(url) {
        let ind = -1;
        let type;
        if ((ind = url.lastIndexOf('.')) !== -1) {
            type = url.substr(ind + 1);
            if (type === 'htm' || type === 'html') {
                type = 'template';
            }
        }
        return type || 'text';
    }
    /**
     * 处理一个资源获取结果
     * @param url   资源url
     * @param rObj  资源对象
     */
    static handleOne(url, rObj) {
        switch (rObj.type) {
            case 'js':
                let head = document.querySelector('head');
                let script = Util.newEl('script');
                script.innerHTML = rObj.content;
                head.appendChild(script);
                head.removeChild(script);
                delete rObj.content;
                break;
            case 'template':
                rObj.content = Compiler.compile(rObj.content);
                break;
            case 'nd':
                rObj.content = Serializer.deserialize(rObj.content);
                break;
            case 'data': //数据
                try {
                    rObj.content = JSON.parse(rObj.content);
                }
                catch (e) {
                    console.log(e);
                }
        }
        this.resources.set(url, rObj);
    }
    /**
     * 预处理
     * @param reqs  [{url:**,type:**},url,...]
     * @returns     [promises(请求对象数组),urls(url数组),types(类型数组)]
     */
    static preHandle(reqs) {
        let head = document.querySelector('head');
        //预处理请求资源
        for (let i = 0; i < reqs.length; i++) {
            //url串，需要构造成object
            if (typeof reqs[i] === 'string') {
                reqs[i] = {
                    url: reqs[i]
                };
            }
            reqs[i].type = reqs[i].type || this.getType(reqs[i].url);
            //css 不需要加载
            if (reqs[i].type === 'css') {
                let css = Util.newEl('link');
                css.type = 'text/css';
                css.rel = 'stylesheet'; // 保留script标签的path属性
                css.href = reqs[i].url;
                head.appendChild(css);
                //移除
                reqs.splice(i--, 1);
            }
        }
        return reqs;
    }
}
/**
 * 资源map，key为url，值为整数，1表示正在加载，2表示已加载完成
 */
ResourceManager.resources = new Map();
/**
 * 加载任务  任务id:资源对象，{id1:{url1:false,url2:false},id2:...}
 */
ResourceManager.loadingTasks = new Map();
/**
 * 资源等待列表  {资源url:[taskId1,taskId2,...]}
 */
ResourceManager.waitList = new Map();
//# sourceMappingURL=resourcemanager.js.map