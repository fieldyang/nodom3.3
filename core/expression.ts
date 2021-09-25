import { GlobalCache } from "./globalcache";
import { Model } from "./model";
import { Module } from "./module";
import { Util } from "./util";

/**
 * 表达式类
 */
export class Expression {
    /**
      * 表达式id
      */
    id: number;

    /**
     * 执行函数
     */
    execFunc: Function;

    /**
     * @param module    模块
     * @param exprStr	表达式串
     */
    constructor(module:Module,exprStr: string) {
        this.id = Util.genId();
        if (!module || !exprStr) {
            return;
        }

        this.execFunc = new Function('$model','$methods',`
            with($model){
                with($methods){
                    return ${exprStr.trim()};
                }
            }
        `);
        GlobalCache.saveExpression(this);
    }

    /**
     * 表达式计算
     * @param model 	模型 或 fieldObj对象 
     * @returns 		计算结果
     */
    public val(module:Module,model: Model) {
        if(!this.execFunc){
            return '';
        }
        if (!model) model = module.model;
        
        let v;
        try {
            v = this.execFunc.apply(module.model,[model,module.methods||{}]);
        } catch (e) {
            console.error(e);
        }
        return v;
    }

    /**
     * 克隆
     */
     public clone() {
        return this;
    }
}
