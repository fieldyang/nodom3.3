/// <reference path="../nodom.ts" />

import { NError } from "../error";
import { FilterManager } from "../filtermanager";
import { NodomMessage } from "../nodom";
import { Util } from "../util";

export default (function(){

    /**
     * 过滤器类型初始化
     */

    /**
     * 格式化日期
     * @param format    日期格式
     */
    FilterManager.addType('date', (value, param) => {
        if (Util.isEmpty(value)) {
            return '';
        }
        //去掉首尾" '
        if(/[\'\"\`]/.test(param)){
            param = param.substr(1, param.length - 2);
        }
        return Util.formatDate(value, param);
    });


    /**
     * 转换为货币
     * @param sign  货币符号¥ $ 等，默认 ¥
     */
    FilterManager.addType('currency', (value, sign) => {
        if (isNaN(value)) {
            return '';
        }

        sign = sign || '¥';

        if (typeof value === 'string') {
            value = parseFloat(value);
        }
        return sign + ((value * 100 + 0.5 | 0) / 100);
    });

    /**
     * 格式化，如果为字符串，转换成数字，保留小数点后位数
     * @param digits    小数点后位数
     */
    FilterManager.addType('number', (value, param) => {
        let digits = param || 0;

        if (isNaN(value) || digits < 0) {
            return '';
        }
        if (typeof value === 'string') {
            value = parseFloat(value);
        }

        let x = 1;
        for (let i = 0; i < digits; i++) {
            x *= 10;
        }
        return ((value * x + 0.5) | 0) / x;
    });

    /**
     * 转换为小写字母
     */
    FilterManager.addType('tolowercase', (value) => {
        
        if (Util.isEmpty(value)) {
            return '';
        }
        if (!Util.isString(value) || Util.isEmpty(value)) {
            throw new NError('invoke1', NodomMessage.TipWords['filter'] + ' tolowercase', '0', 'string');
        }
        
        return value.toLowerCase();
    });

    /**
     * 转换为大写字母
     */
    FilterManager.addType('touppercase', (value) => {
        if (Util.isEmpty(value)) {
            return '';
        }
        if (!Util.isString(value) || Util.isEmpty(value)) {
            throw new NError('invoke1', NodomMessage.TipWords['filter'] + ' touppercase', '0', 'string');
        }
        return value.toUpperCase();
    });

    /**
     * 数组排序
     * @param arr       数组
     * @param param     
     *     用法: orderby:字段:desc/asc
     */
    FilterManager.addType('orderby', function () {
        let args = arguments;
        let arr = args[0]; //数组
        let field = args[1]; //比较字段
        let odr = args[2] || 'asc'; //升序或降序,默认升序
        if (!Util.isArray(arr)) {
            throw new NError('invoke1', NodomMessage.TipWords['filter'] + ' orderby', '0', 'array');
        }
        //复制数组
        let ret = arr.concat([]);
        if (field && Util.isObject(arr[0])) { //对象数组
            if (odr === 'asc') {
                ret.sort((a, b) => a[field] >= b[field] ? 1 : -1);
            } else {
                ret.sort((a, b) => a[field] <= b[field] ? 1 : -1);
            }
        } else { //值数组
            if (odr === 'asc') {
                ret.sort((a, b) => a >= b ? 1 : -1);
            } else {
                ret.sort((a, b) => a <= b ? 1 : -1);
            }
        }
        return ret;
    });

    /**
     * 数组过滤
     * 用法: 无参数select:odd 带参数 select:range:1:5
     * odd      奇数，返回索引号为奇数的数组元素
     * even     偶数，返回索引号为偶数的数组元素
     * value    返回值中含有指定字符的数组元素
     *          {prop1:v1,prop2:v2,...} 满足所有属性prop的值中含有对应字符或相等值的数组元素
     * func     自定义函数过滤
     * range    数组范围1:5 返回索引1到5的数组元素
     * index    数组索引序列1:2:3 返回索引1，2，3的元素
     */
    FilterManager.addType('select', function () {
        if (!Util.isArray(arguments[0])) {
            throw new NError('invoke1', NodomMessage.TipWords['filter'] + ' filter', '0', 'array');
        }

        let params = new Array();
        for (let i = 0; i < arguments.length; i++) {
            params.push(arguments[i]);
        }
        //内部处理方法对象
        let handler = {
            //奇数索引过滤
            odd: function () {
                let arr = arguments[0];
                let ret = [];
                for (let i = 0; i < arr.length; i++) {
                    if (i % 2 === 1) {
                        ret.push(arr[i]);
                    }
                }
                return ret;
            },
            //偶数索引过滤
            even: function () {
                let arr = arguments[0];
                let ret = [];
                for (let i = 0; i < arr.length; i++) {
                    if (i % 2 === 0) {
                        ret.push(arr[i]);
                    }
                }
                return ret;
            },
            //索引区域过滤
            range: function () {
                let args = arguments;
                let arr = args[0];
                let ret = [];
                //第一个索引,第二个索引
                let first = args[1];
                let last = args[2];
                if (isNaN(first)) {
                    throw new NError('paramException', NodomMessage.TipWords['filter'], 'filter range');
                }
                if (!Util.isNumber(first)) {
                    first = parseInt(first);
                }
                //判断数字
                if (isNaN(last)) {
                    throw new NError('paramException', NodomMessage.TipWords['filter'], 'filter range');
                }

                //字符串转数字
                if (!Util.isNumber(last)) {
                    last = parseInt(last);
                }

                if (first > last) {
                    throw new NError('paramException', NodomMessage.TipWords['filter'], 'filter range');
                }
                return arr.slice(first, last + 1);
            },
            //索引过滤
            index: function () {
                let args = arguments;
                let arr = args[0];
                if (!Util.isArray(args[0])) {
                    throw new NError('paramException', NodomMessage.TipWords['filter'], 'filter index');
                }
                let ret = [];
                //读取所有index
                if (arr.length > 0) {
                    for (let i = 1; i < args.length; i++) {
                        if (isNaN(args[i])) {
                            continue;
                        }
                        let k = parseInt(args[i]);
                        if (k < arr.length) {
                            ret.push(arr[k]);
                        }
                    }
                }
                return ret;
            },
            //函数过滤
            func: function (arr, param) {
                if (!Util.isArray(arr) || Util.isEmpty(param)) {
                    throw new NError('paramException', NodomMessage.TipWords['filter'], 'filter func');
                }
                //自定义函数
                let foo = this.methodFactory.get(param);
                if (Util.isFunction(foo)) {
                    return Util.apply(foo,this,[arr]);
                }
                return arr;
            },
            //值过滤
            value: function (arr, param) {
                if (!Util.isArray(arr) || Util.isEmpty(param)) {
                    throw new NError('paramException', NodomMessage.TipWords['filter'], 'filter value');
                }
                //属性值对象，所有属性值满足才过滤出来
                if (Util.isObject(param)) {
                    let keys = Util.getOwnProps(param);
                    return arr.filter(function (item) {
                        for (let i = 0; i < keys.length; i++) {
                            let v = item[keys[i]];
                            let v1 = param[keys[i]];
                            //找不到属性值，或者不相等并且是字符串且不包含的情况都返回false
                            if (v === undefined || v !== v1 || typeof v === 'string' && v.indexOf(v1) === -1) {
                                return false;
                            }
                        }
                        //都匹配则返回true
                        return true;
                    });
                } else { //字符串
                    return arr.filter(function (item) {
                        let props = Util.getOwnProps(item);
                        for (let i = 0; i < props.length; i++) {
                            let v = item[props[i]];
                            if (Util.isString(v) && v.indexOf(param) !== -1) {
                                return item;
                            }
                        }
                    });
                }
            }
        }

        let type;
        //类型匹配并处理
        if (Util.isString(params[1])) {
            type = params[1].trim();
            if (handler.hasOwnProperty(type)) {
                //去掉type
                params.splice(1, 1);
            } else { //默认为value
                type = 'value';
            }
        } else { //默认为value，值对象
            type = 'value';
        }

        //校验输入参数是否为空
        if (type === 'range' || type === 'index' || type === 'func') {
            if (params.length < 2) {
                throw new NError('paramException', NodomMessage.TipWords['filter']);
            }
        }
        //方法调用
        return Util.apply(handler[type], this, params);
    });
}());