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
     * 模块依赖
     */
    dependencies: ExpressionMd;

    /**
     * 依赖函数
     */
    dependenciesFunc: any;

    /**
     * key 函数
     */
    keyFunc: Function;

    /**
     * 对象函数
     */
    objFunc: Function;

    /**
     * key 数组
     */
    keyArray: any[];

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
            const v: string = this.fields.length > 0 ? ',' + this.fields.join(',') : '';
            // this.handlesDep(execStr);
            this.execFunc = Util.eval(`function($module${v}){return ${execStr}}`);
        }
    }
    /**
     * 处理模块依赖
     * @param execStr   执行串 
     */
    handlesDep(execStr: string) {
        let index = execStr.lastIndexOf('.');
        if (index !== -1) {
            this.dependencies = {
                obj: execStr.substring(0, index),
                key: execStr.substring(index + 1),
                moduleName: execStr.substring(0, execStr.indexOf('.'))
            }
            let { key, obj, moduleName } = this.dependencies;
            let keys = [];
            //key有关键词
            if (this.fields.reduce((pre, v) => {
                if (key.indexOf(v) !== -1) {
                    keys.push(v);
                    return pre + 1;
                }
            }, 0)) {
                this.keyFunc = Util.eval(`function($module, ${keys.join(',')}  ){return  ${key}  }`);
                this.keyArray = keys;
            }
            this.dependencies.obj = obj.replace(moduleName, moduleName + '.model');
            this.objFunc = Util.eval(`function( $module,${this.fields.join(',')}){return  ${this.dependencies.obj}}`);
        } else {
            this.dependencies = {
                key: execStr,
                obj: '',
                moduleName: ''
            }
        }
    }

    /**
     * 获取模块相应数据
     * @param model     模型
     * @param dom       虚拟dom节点
     */ 
    getDependence(model: Model, dom: Element) {
        if (this.dependencies.moduleName === '') {
            //赋值模块名
            this.dependencies.moduleName = ModuleFactory.get(model.$moduleId).name;
        }
        const { dependencies } = this;

        if (this.keyFunc !== undefined) {
            dependencies['key'] = this.val(model, dom, this.keyFunc, this.keyArray)
        }
        dependencies['obj'] = this.objFunc ? this.val(model, dom, this.objFunc, this.fields, true) : undefined;
        return dependencies;
    }

    /**
     * 克隆
     */
    public clone() {
        return this;
    }

    /**
     * 初始化，把表达式串转换成堆栈
     * @param exprStr 	表达式串
     */
    public compile(exprStr: string): string {
        //替代字符串的正则数组
        let stringReg = [/\\"/g, /\\'/g, /\\`/g, /\".*?\"/g, /'.*?'/g, /`.*?`/g];
        let replaceMap = new Map();
        const TMPStr = '##TMP';
        //替换字符串
        stringReg.forEach(reg => {
            if (reg.test(exprStr)) {
                exprStr.match(reg).forEach((text) => {
                    let index = exprStr.indexOf(text);
                    replaceMap.set(TMPStr + index, text);
                    exprStr = exprStr.substring(0, index) + (TMPStr + index) + exprStr.substring(index + text.length);
                })
            }
        });
        exprStr = exprStr.trim().replace(/([w]\s)|instanceof|\s+/g, (w, index) => {
            if (index) return index;
            else {
                if (w === 'instanceof') {
                    return ' ' + w + ' ';
                }
                return '';
            }
        });
        //首尾指针
        let [first, last] = [0, 0];
        let [braces, fields, funArr, filters] = [[], [], [], []];
        //括号数组 字段数组 函数数组 存过滤器需要的值
        let filterString = '';
        //特殊字符
        let special = /[\?\:\!\|\*\/\+\-><=&%]/;
        //返回的串
        let express = '';
        //函数名
        let funName;
        let isInBrace = false;
        let isInFun = false;
        while (last < exprStr.length) {
            let lastStr = exprStr[last];
            if (lastStr == '(') {
                if (isInFun) {
                    //函数里存函数名
                    funName = exprStr.substring(funArr.pop(), last);
                    express += funName;
                    first = last;
                } else {
                    if (!isInBrace) {//不在函数里外面也不在括号里
                        //取data内函数
                        let mt = exprStr.substring(first, last).match(/^[\$\w]+/);
                        if (mt) {
                            fields.push(mt[0]);
                        }
                        express += exprStr.substring(first, last);
                        first = last;
                    }
                }
                braces.push(last++);
                isInBrace = true;
            } else if (lastStr == ')') {
                let tmpStr = exprStr.substring(braces.pop(), last);
                filters.push(tmpStr);
                if (/[\,\!\|\*\/\+\-><=&%]/.test(tmpStr)) {//字段截取需要的字母集
                    let fieldItem = tmpStr.match(/[\w\$^\.]+/g);
                    fields = fields.concat(fieldItem);
                } else {
                    if (tmpStr.substr(1).match(/[\$\w]+/) && tmpStr.substr(1).match(/[\$\w]+/)[0].length == tmpStr.substr(1).length) {//括号里没有特殊符号
                        fields.push(tmpStr.substr(1));
                    } else if (tmpStr.substr(1).startsWith('...')) {//拓展运算符
                        fields.push(tmpStr.substr(4));
                    }
                }
                //外面没有括号
                if (braces.length == 0) {
                    isInBrace = false;
                    express += tmpStr;
                }
                //处理函数串
                if (isInFun) {
                    replaceMethod();
                    isInFun = false;
                }
                first = last++;
            } else if (lastStr == '$') {
                isInFun = true;
                funArr.push(last++);
            } else if (special.test(lastStr) && !isInBrace) {
                express += exprStr.substring(first, last) + lastStr;
                //特殊字符处理
                fields = fields.concat(exprStr.substring(first, last).match(/[\$\#\w^\.]+/g));
                if (lastStr == '=' || lastStr == '|' || lastStr == '&') {//处理重复字符，和表达式
                    if (lastStr == '|' && exprStr[last + 1] != '|') {//表达式处理
                        let str = filters[filters.length - 1] ? filters[filters.length - 1] : exprStr.substring(first, last);
                        if (!filters.length) {
                            filterString = str;
                        }
                        let res = handFilter();
                        let index = express.indexOf(str);
                        //')'和'|'
                        express = express.substring(0, index) + res.str + express.substring(index + str.length + 2);
                        first = last += res.length + 1;
                        continue;
                    }
                    while (exprStr[last + 1] == lastStr) {//处理重复字符
                        express += exprStr[++last];
                    };
                }
                first = ++last;
            } else {
                last++;
            }
        }
        let endStr = exprStr.substring(first);
        if (endStr.indexOf(' ') === -1 && !endStr.startsWith('##TMP') && !endStr.startsWith(')')) {
            let str = endStr.indexOf('.') != -1 ? endStr.substring(0, endStr.indexOf('.')) : endStr;
            fields.push(str);
        }
        express += endStr;

        function replaceMethod() {
            express = express.replace(/\$[^(]+?\(/, () => {
                return '$module.methodFactory.get("' + funName.substr(1) + '").call($module,';
            });
        }
        /**
         * @returns {
         * str:过滤器串
         * length:编译跳过的长度
         */
        function handFilter() {
            if (/\d+/.test(exprStr[last + 1])) {
                return;
            }
            last++;
            let tmpStr: string = exprStr.substr(last).split(/[\)\(\+\-\*><=&%]/)[0];
            let args = [];
            let value = filters.length > 0 ? filters.pop() + ')' : filterString;
            let num = 0;
            tmpStr.replace(/\:/g, function (m, i) {
                num++;
                return m;
            });
            if (tmpStr.indexOf(':') != -1) {//有过滤器格式
                args = tmpStr.split(/[\:\+\-\*><=&%]/);
            };
            if (args.length == 0) {//如果没有过滤器参数
                let filterName = tmpStr.match(/^\w+/)[0];
                return {
                    str: 'nodom.FilterManager.exec($module,"' + filterName + '",' + value + ')',
                    length: filterName.length - 1,
                }
            }
            let length = args[0].length + args[1].length;
            if (args[1].startsWith('##TMP')) {//字符串还原
                let deleteKey = args[1];
                args[1] = replaceMap.get(args[1]);
                replaceMap.delete(deleteKey);
            }
            let params = '';
            for (let i = 1; i < num; i++) {//多个过滤器参数
                params += /[\'\"\`]/.test(args[i]) ? args[i] : '\'' + args[i] + '\'' + ',';
            }
            params = /[\'\"\`]/.test(args[num]) ? args[num] : '\'' + args[num] + '\'';
            return {
                str: 'nodom.FilterManager.exec($module,"' + args[0] + '",' + value + ',' + params + ')',
                length,
            }
        }
        if (express.indexOf('instanceof') !== -1) {
            fields.push(express.split(' ')[0]);
        }
        let exclude = ['.', '$module', '##TMP', 'TMP', 'this'];
        fields = [...(new Set(fields))].filter((v) => {
            return v != null && exclude.reduce((sum, value) => {
                return sum === 0 ? 0 : (!v.startsWith(value) ? 1 : 0);
            }, 1) === 1 && isNaN(parseInt(v, 10));
        });
        if (replaceMap.size) {
            replaceMap.forEach((value, key) => {
                express = express.substring(0, express.indexOf(key)) + value + express.substring(express.indexOf(key) + key.length);
            });
        };
        fields.forEach(field => {
            this.addField(field);
        });
        return express;
    }

    /**
     * 表达式计算
     * @param model 	模型 或 fieldObj对象 
     * @returns 		计算结果
     */
    public val(model: Model, dom: Element, func?: Function, field?: Array<string>, realModule?: boolean) {
        let module: Module = ModuleFactory.get(model.$moduleId);
        if (!model) {
            model = module.model;
        }
        let valueArr = [];
        let fields = field ? field : this.fields;
        fields.forEach((field) => {
            valueArr.push(getFieldValue(module, model, field, realModule));
        });
        //module作为第一个参数
        valueArr.unshift(module);
        let v;
        try {
            let fn = func ? func : this.execFunc;
            v = fn.apply(module, valueArr);
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
        function getFieldValue(module: Module, dataObj: Object, field: string, realModule?: boolean) {
            if (dataObj.hasOwnProperty(field)) {
                return dataObj[field];
            }
            //兄弟模块
            const md: Module = module.getChild(field);
            if (md !== null) {
                // this.dependencies = true;
                return realModule ? md : md.model;
            }
            //从根查找
            return module.model.$query(field);
        }
    }

    /**
    * 添加字段到fields
    * @param field 	字段
    * @returns         true/false
    */
    private addField(field: string): boolean {
        //js 保留字
        const jsKeyWords = ['true', 'false', 'undefined', 'null', 'typeof',
            'Object', 'Function', 'Array', 'Number', 'Date',
            'instanceof', 'NaN', 'new'];
        if (field === '' || jsKeyWords.includes(field) || Util.isNumberString(field) || field.startsWith('Math') || field.startsWith('Object')) {
            return false;
        }
        //多级字段只保留第一级，如 x.y只保留x
        let ind: number;
        if ((ind = field.indexOf('.')) !== -1) {
            if (ind == 0) {
                field = field.substr(1);
            }
            else {
                field = field.substr(0, ind);
            }
        }
        if (!this.fields.includes(field)) {
            this.fields.push(field);
        }
        return true;
    }
}