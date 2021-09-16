import { NError } from "./error";
import { NodomMessage } from "./nodom";
import { Plugin } from "./plugin";

/**
 * 自定义元素管理器
 */
export class PluginManager{
    private static plugins:Map<string,Plugin> = new Map();
    /**
     * 添加自定义元素类
     * @param name  元素名
     * @param cfg   元素类
     */
    public static add(name:string,cfg:any){
        if(this.plugins.has(name)){
            throw new NError('exist1',NodomMessage.TipWords['element'],name);
        }
        this.plugins.set(name,cfg);
    }

    /**
     * 获取自定义元素类
     * @param tagName 元素名
     */
    public static get(tagName:string):any{
        return this.plugins.get(tagName);
    }
}
