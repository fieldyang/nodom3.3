import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";

/**
 * 渲染器
 */
export class Renderer {
    /**
     * 等待渲染列表（模块名）
     */
    private static waitList: Array < number > = [];
    /**
     * 添加到渲染列表
     * @param module 模块
     */
    public static add(module:Module,force?:boolean) {
        //如果已经在列表中，不再添加
        if (!this.waitList.includes(module.id)) {
            //计算优先级
            this.waitList.push(module.id);
        }
    }
    //从列表移除
    public static remove(module:Module) {
        let ind;
        if ((ind = this.waitList.indexOf(module.id)) !== -1) {
            this.waitList.splice(ind, 1);
        }
    }

    /**
     * 队列渲染
     */
    public static render() {
        //调用队列渲染
        for (let i=0; i<this.waitList.length; i++) {
            let m = ModuleFactory.get(this.waitList[i]);
            //渲染成功，从队列移除
            if(!m || m.render()){
                this.waitList.shift();
                i--;
            }
        }
    }
}
