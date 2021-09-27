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
        const funStr = this.compile(exprStr);
        this.execFunc = new Function('$model','$methods',`return ` + funStr);
        GlobalCache.saveExpression(this);
    }

    /**
     * 编译表达式串，替换字段和方法
     * @param exprStr   表达式串
     * @returns         编译后的表达式串
     */
    private compile(exprStr:string){
        const reg = /('[\s\S]*?')|("[\s\S]*?")|(`[\s\S]*?`)|([a-zA-Z$_][\w$]*(\.[a-zA-Z$_][\w$]*)?(\s*[\[\(])?)/g;
        let r;
        let retS = '';
        let index = 0;  //当前位置

        while((r=reg.exec(exprStr)) !== null){
            let s = r[0];
            if(index < r.index){
                retS += exprStr.substring(index,r.index);
            }
            if(s[0] === "'" || s[0] === '"' || s[0] === '`'){ //字符串
                retS += s;
            }else if(s.endsWith('(')){ //函数，非内部函数
                retS += s.indexOf('.') === -1?'$methods.' + s:s;
            }else { //字段
                retS += '$model.' + s;
            }
            index = reg.lastIndex;
        }
        if(index < exprStr.length){
            retS += exprStr.substr(index);
        }
        
        return retS;
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
            // console.error(e);
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
