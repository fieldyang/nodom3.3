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
        this.execFunc = new Function('$model',`return ` + funStr);
    }

    /**
     * 编译表达式串，替换字段和方法
     * @param exprStr   表达式串
     * @returns         编译后的表达式串
     */
    private compile(exprStr:string){
        //字符串，object key，有效命名(函数或字段)
        const reg = /('[\s\S]*?')|("[\s\S]*?")|(`[\s\S]*?`)|([a-zA-Z$_][\w$]*\s*?:)|((\.{3}|\.)?[a-zA-Z$_][\w$]*(\.[a-zA-Z$_][\w$]*)*(\s*[\[\(](\s*\))?)?)/g;
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
                }else if(lch === '(' || lch === ')'){ //函数，非内部函数
                    retS += handleFunc(s);
                }else { //字段 this $model .field等不做处理
                    if(s.startsWith('this.') || s==='$model' || s.startsWith('$model.') || Util.isKeyWord(s) || (s[0] === '.' && s[1]!=='.')){ //非model属性
                        retS += s; 
                    }else{  //model属性
                        let s1 = '';
                        if(s.startsWith('...')){ // ...属性名
                            s1 = '...';
                            s = s.substr(3);
                        }
                        retS += s1 +'$model.' + s;
                        
                        //存在‘.’，则变量不全在在当前模型中
                        if(s.indexOf('.') !== -1){
                            this.allModelField = false;
                        }
                    }
                }
            } 
            index = reg.lastIndex;
        }
        if(index < exprStr.length){
            retS += exprStr.substr(index);
        }
        
        return retS;

        /**
         * 处理函数串
         * @param str   源串
         * @returns     处理后的串
         */
        function handleFunc(str):string{
            let ind = str.indexOf('.');
                    
            //中间无'.'
            if(ind === -1){
                let ind1 = str.lastIndexOf('(');
                let fn = str.substr(0,ind1);
                //末尾字符
                if(!Util.isKeyWord(fn)){
                    let lch = str[str.length-1];
                    if(lch !== ')'){ //有参数
                        return 'this.invokeMethod("' + fn + '",';
                    }else{ //无参数
                        return 'this.invokeMethod("' + fn + '")';
                    }
                }
            }else if(str[0] !== '.'){  //第一个为点不处理
                let fn = str.substr(0,ind);
                if(!Util.isKeyWord(fn)){ //首字段非关键词，则为属性
                    return '$model.' + str;
                }
            }
            return str;
        }
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
            v = this.execFunc.apply(module,[model,module]);
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
