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
     * 只包含自有model变量
     */
    allModelField: boolean;

    /**
     * 值
     */
    value:any;

    /**
     * @param module    模块
     * @param exprStr	表达式串
     */
    constructor(module:Module,exprStr: string) {
        this.id = Util.genId();
        this.allModelField = true;
        if (!module || !exprStr) {
            return;
        }
        
        const funStr = this.compile(exprStr);
        this.execFunc = new Function('$model','$module',`return ` + funStr);
    }

    /**
     * 编译表达式串，替换字段和方法
     * @param exprStr   表达式串
     * @returns         编译后的表达式串
     */
    private compile(exprStr:string){
        //字符串，object key，有效命名(函数或字段)
        const reg = /('[\s\S]*?')|("[\s\S]*?")|(`[\s\S]*?`)|([a-zA-Z$_][\w$]*\s*?:)|([a-zA-Z$_][\w$]*(\.[a-zA-Z$_][\w$]*)*(\s*[\[\(](\s*\))?)?)/g;
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
            }else{
                let lch = s[s.length-1];
                if(lch === ':'){  //object key
                    retS += s;
                }else if(lch === '('){ //函数，非内部函数
                    let s1 = s.substr(0,s.length-1);
                    retS += s1.indexOf('.') === -1 && !Util.isKeyWord(s1)?'$module.invokeMethod("' + s1 + '",':s;
                }else if(lch === ')'){  //无参数函数
                    let ind;
                    if((ind=s.lastIndexOf('(')) !== -1){
                        let s1 = s.substr(0,ind);
                        retS += s1.indexOf('.') === -1 && !Util.isKeyWord(s1)?'$module.invokeMethod("' + s1 + '")':s;
                    }
                }else { //字段
                    if(s.startsWith('this.')){
                        retS += s;
                    }else if(Util.isKeyWord(s)){
                        retS += s;
                    }else{
                        retS += '$model.' + s;   
                    }
                    //存在‘.’，则变量不全在在模型中
                    if(s.indexOf('.') !== -1){
                        this.allModelField = false;
                    }
                        
                }
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
        if (!model){
            model = module.model;
        } 
        let v;
        try {
            v = this.execFunc.apply(module.model,[model,module]);
        } catch (e) {
            // console.error(e);
        }
        this.value = v;
        return v;
    }

    /**
     * 克隆
     */
     public clone() {
        return this;
    }
}
