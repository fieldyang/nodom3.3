import { Element } from "./element";
import { Model } from "./model";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { ExpressionMd } from "./types";
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
     * 字段数组
     */
    fields: Array<string>;

    /**
     * 执行函数
     */
    execFunc: Function;

    /**
     * @param exprStr	表达式串
     */
    constructor(exprStr?: string) {
        this.fields = []; // 字段数组
        this.id = Util.genId();
        let execStr: string;
        if (exprStr) {
            execStr = this.compile(exprStr);
        }
        if (execStr) {
            let v: string = this.fields.length > 0 ? ',' + this.fields.join(',') : '';
            execStr = 'function($module' + v + '){return ' + execStr + '}';
            console.log(execStr);
            this.execFunc = Util.eval(execStr);
        }
    }

    /**
     * 初始化，把表达式串转换成堆栈
     * @param exprStr 	表达式串
     */
    public compile(exprStr: string): string {
        const me = this;
        //字符串识别正则式
        let reg = /('.*')|(".*")|(`.*`)/g;
        //开始位置
        let st=0;
        //存在字符串
        let hasStr = false;
        let r;
        while((r=reg.exec(exprStr))!==null){
            if(r.index>st){
                let tmp = exprStr.substr(st,r.index);
                let s1 = handle(tmp);
                exprStr = exprStr.substring(0,st) + s1 + r[0] + exprStr.substr(reg.lastIndex);
                st = reg.lastIndex + (s1.length-tmp.length);
            }else{
                st = reg.lastIndex;
            }
            hasStr = true;
        }
        if(!hasStr){
            exprStr = handle(exprStr);
        }
        return exprStr;

        /**
         * 处理单词串
         * @param src   源串
         * @returns     处理后的串
         */
        function handle(src:string):string{
            let reg = /[$\w\d\.]+(\s*\()?/g;
            let r;
            while((r=reg.exec(src))!== null){
                if(r[0].endsWith('(')){
                    let fos = handleFunc(r[0]);
                    src = src.replace(r[0],fos);
                    reg.lastIndex = r.index + fos.length;
                }else{
                    console.log(r[0])
                    // 保留字不进入字段数组
                    if(Util.keyWords.indexOf(r[0]) === -1){
                        me.fields.push(r[0]);
                    }
                }
            }
            return src;
        }
    
        /**
         * 处理函数
         * @param src   源串 
         * @returns     处理后的函数串
         */
        function handleFunc(src){
            let mName = src.substring(0,src.length-1).trim();
            let tmp = '';
            //可能是模块方法
            if(mName.indexOf('.') === -1){
                return "($module.getMethod('" + mName +  "')||" + mName + ')(';
            }
            return mName + '(';
        }
    }

    /**
     * 表达式计算
     * @param model 	模型 或 fieldObj对象 
     * @returns 		计算结果
     */
    public val(model: Model) {
        let module: Module = ModuleFactory.get(model.$moduleId);
        if (!model) model = module.model;
        let valueArr = [];
        this.fields.forEach((field) => {
            valueArr.push(getFieldValue(module, model, field));
        });
        //module作为第一个参数
        valueArr.unshift(module);
        let v;
        try {
            v = this.execFunc.apply(module, valueArr);
        } catch (e) {
        }
        return v === undefined || v === null ? '' : v;

        /**
         * 获取字段值
         * @param module    模块
         * @param dataObj   数据对象 
         * @param field     字段名
         * @return          字段值
         */
        function getFieldValue(module: Module, dataObj: Object, field: string) {
            if (dataObj.hasOwnProperty(field)) {
                return dataObj[field];
            }

            //从根查找
            return module.model.$query(field);
        }
    }

    /**
     * 克隆
     */
     public clone() {
        return this;
    }
}