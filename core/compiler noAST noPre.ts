import { DefineElementManager } from "./defineelementmanager";
import { Directive } from "./directive";
import { Element } from "./element";
import { NError } from "./error";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { ModuleFactory } from "./modulefactory";


export class Compiler {

    /**
    * 编译
    * @param elementStr    待编译html串
    * @returns             虚拟dom
    */
    public static compile(elementStr: string): Element {
        // 这里是把模板串通过正则表达式匹配 生成AST
        let vDom: Element = this.compileTemplateToAst(elementStr);
        return vDom;
    }
    /**
     * 编译ast 到虚拟dom
     * @param oe        虚拟dom
     * @param attrs     需要编译成虚拟dom的attrs
     * @param parent    父虚拟dom节点
     */
    public static handleAstAttrs(oe: Element, attrs: Map<string, any>, parent: Element) {
        //指令数组 先处理普通属性在处理指令
        let directives = [];
        if (!attrs) { return }
        for (let [key, value] of attrs) {
            // 统一吧属性名转换成小写
            key = key.toLocaleLowerCase()
            if (key.startsWith("x-")) {
                //指令
                directives.push({ key, value });
            } else if (key.startsWith("e-")) {
                // 事件
                let e = key.substr(2);
                oe.addEvent(new NEvent(e, value.trim()));
            } else if (key.startsWith("d-")) {
                // 数据
                let tempArr = key.split(':');
                let bindFlag = 'false';
                if (tempArr.length == 2) {
                    bindFlag = tempArr[1] == 'true' ? 'true' : 'false';
                }
                let name = tempArr[0].split('-')[1];
                if (/\{\{.+?\}\}/.test(value) === false) {
                    throw new NError('数据必须是由大括号包裹');
                }
                value = value.substring(2, value.length - 2);
                // 变量别名，变量名（原对象.变量名)，双向绑定标志
                let data = [value, bindFlag];
                oe.datas[name] = data;
            } else {
                oe.setProp(key, value, value instanceof Expression);
            }
        }
        //处理属性
        for (let attr of directives) {
            new Directive(attr.key.substr(2), attr.value, oe, parent, null, true);
        }
        if (directives.length > 1) {
            //指令排序
            oe.directives.sort((a, b) => {
                return a.type.prio - b.type.prio;
            });
        }
    }

    /**
     * 处理属性字符串
     * @param attrString 属性字符串
     * @returns attrs数组 
     */
    private static parseAttrString(attrString: string | undefined): Map<string, any> {
        if (attrString == '') return new Map();
        const attrReg = /([a-zA-Z][a-zA-Z0-9-_]*)=?('.*?'|".*?"|{{.*?}})?/;
        let index = 0;
        let attrs = new Map();
        // let attr;
        // while ((attr = attrReg.exec(attrString)) != null) {
        //     let [, attrName, attrValue]: any = attr;
        //     if (attrValue?.startsWith("'") || attrValue?.startsWith('"')) {
        //         attrValue = attrValue.substring(1, attrValue.length - 1).trim();
        //     }
        //     if (attrValue?.startsWith('{{')) {
        //         attrValue = new Expression(attrValue.substring(2, attrValue.length - 2));
        //     }
        //     attrs.set(attrName, attrValue ? attrValue : '');
        // }
        while (index < attrString.length - 1) {
            attrString = attrString.substring(index);
            const attr = attrString.match(attrReg)
            let [attrStr, attrName, attrValue]: any = attr;
            if (attrValue?.startsWith("'") || attrValue?.startsWith('"')) {
                attrValue = attrValue.substring(1, attrValue.length - 1).trim();
            }
            if (attrValue?.startsWith('{{')) {
                attrValue = new Expression(attrValue.substring(2, attrValue.length - 2));
            }
            attrs.set(attrName, attrValue ? attrValue : '');
            index += attrStr.length + attr.index;
        }
        return attrs;
    }
    // private static parseAttrString(attrString: string | undefined): Map<string, any> {
    //     if (attrString == undefined || attrString.length === 0) return new Map();
    //     attrString = attrString.trim();
    //     attrString = attrString.replace(/\{\{.*?\}\}/g, `"$&"`)
    //     // 引号栈处理引号嵌套
    //     let yinghaoStack: string[] = [];
    //     //引号flag 当前是否在引号内
    //     let yinhaoFlag = false;
    //     // 断点
    //     let point = 0;

    //     let result = [];
    //     for (let i = 0; i < attrString.length; i++) {
    //         let s = attrString[i];
    //         if (/[\"\']/.test(s)) {
    //             // 遇到引号
    //             if (yinghaoStack.length != 0) {
    //                 // 引号栈不空
    //                 if (s === yinghaoStack[yinghaoStack.length - 1]) {
    //                     // 判断是不是匹配栈顶
    //                     yinghaoStack.pop();
    //                     if (yinghaoStack.length == 0) yinhaoFlag = false;
    //                 } else {
    //                     // 不匹配栈顶直接入栈
    //                     yinghaoStack.push(s);
    //                 }
    //             } else {
    //                 // 引号栈空 入栈
    //                 yinghaoStack.push(s);
    //                 yinhaoFlag = true;
    //             }
    //             // yinhaoFlag = !yinhaoFlag;
    //         } else if (/\s/.test(s) && !yinhaoFlag) {
    //             //遇到空格并且不在引号中
    //             if (!/^\s*?$/.test(attrString.substring(point, i))) {
    //                 result.push(attrString.substring(point, i).trim());
    //                 point = i;
    //             }
    //         }
    //     }
    //     let lastAttr = attrString.substring(point).trim();
    //     // 判断最后一个属性是不是自定义标签的'/' 如果是则不把他当作标签。
    //     if (lastAttr !== '/') {
    //         //循环结束之后还剩一个属性没加进去，因为可能最后一个属性后面没有空格
    //         result.push(attrString.substring(point).trim());
    //     }
    //     let resMap = new Map();
    //     for (const item of result) {
    //         const o = item.match(/^(.+)=['"]((?:\{\{)?[\s\S]*?(?:\}\})?)[\'\"]$/) || [, item];
    //         resMap.set(o[1], o[2] ? o[2] : '')
    //     }
    //     return resMap;
    // }

    /**
     * 将模板字符串转换成AST抽象语法树结构
     * @param elementStr 模板字符串
     * @returns AST对象数组
     */
    private static compileTemplateToAst(elementStr: string): Element {

        let templateStr = elementStr.trim();
        // 准备栈空间
        let stack1: Array<any> = [];
        // 避免修改往element里面加属性我把这些属性放在外面
        //{ element：new Element(), attrs:attrs, isDefinedElement：false，isClosed:false }
        let index = -1;
        // 开始标签的正则表达式 
        const tagReg =
            /(?<!\{\{[^<}}]*)(?:\<(\/?)\s*?([a-zA-Z][a-zA-Z0-9-_]*)(.*?)(\/?)\>)(?![^>{{]*?\}\})/g
        // 匹配注释
        const commentRegExp = /\s*\<!--[\s\S]+?--\>/g;
        // pre结束标签。
        const preEndTagRegExp = /^([\s\S]+)(?=\<(\s*)\/(\s*)pre(?:\s.+?)?(\s*)\>)/;

        // 不需要注释节点
        let rest = templateStr.replace(commentRegExp, '');
        // 匹配到字符串末尾

        let tag;
        while ((tag = tagReg.exec(rest)) != null) {
            if (index <= tag.index) {
                // let word = rest.substring(index, tag.index).trim();
                this.compileWordToAST(rest.substring(index, tag.index), stack1);
                if (tag[1] && tag[1] == '/') {
                    this.compilerEndTagToAST(tag, stack1);
                } else {
                    this.compilerStartTagToAST(tag, stack1);
                }
                index = tagReg.lastIndex;
            }
        }

        if (stack1.length > 1) {
            throw new NError(`compile3`);
        }
        // 处理最后一个闭合节点的属性
        let oe = new Element('div');
        let attrs = stack1[0].attrs;
        this.handleAstAttrs(stack1[0].element, attrs, oe);
        oe.children.push(stack1[0].element);
        return oe;
    }

    /**
     * 将文本节点编译到AST
     * @param word 待编译的字符串
     * @param stack1 辅助栈1
     * @param stack2 辅助栈2
     */
    private static compileWordToAST(word: string, stack1) {
        if (word.length != 0) {
            // 不全是空
            // 改变栈顶元素
            // 编译一下看是否有双大括号表达式
            let element = new Element();
            let expr = this.compileExpression(word);
            if (typeof expr === 'string') {
                // 返回的是字符串说明没有双大括号表达式，把属性放进textContent
                element.textContent = expr
            } else {
                // 返回的是数组说明是有双大括号表达式的，编译了之后放进expressions属性
                element.expressions = expr
            }
            stack1.push({
                element,
                isDefinedElement: false,
                isClosed: false
            })
        }
    }

    /**
     * 编译开始标签到AST
     * @param startTag 开始标签的匹配结果
     * @param index 开始标签在原串中的位置
     * @param stack1 辅助栈1
     * @param stack2 辅助栈2
     * @param preFlag pre标签Flag
     * @returns 截断原串的位置
     */
    private static compilerStartTagToAST(startTag, stack1): number {

        let [, , tagName, attrString, selfCloseStr] = startTag;
        // tagName = tagName.trim();

        if (ModuleFactory.has(tagName)) {
            // 是模块标签
            attrString += `x-module=${tagName}`;
        }
        let isClosed = false;
        if (selfCloseStr == '/') {
            // 这个标签是自闭合标签
            isClosed = true;
        }
        let isDefinedElement = DefineElementManager.get(tagName.toUpperCase()) ? true : false;
        let element = new Element(tagName);
        let attrs = this.parseAttrString(attrString);
        // 虚拟DOM入栈
        stack1.push({
            element,
            attrs,
            isDefinedElement,
            isClosed
        });
        return startTag[0].length;
    }

    /**
     * 编译结束标签到AST
     * @param endTag 结束标签的匹配串
     * @param index 结束标签在原串中的位置
     * @param stack1 辅助栈1
     * @param stack2 辅助栈2
     * @returns index
     */
    private static compilerEndTagToAST(endTag, stack1): number {
        // 识别结束标记
        let [, , tagName] = endTag;
        // tagName = tagName.trim();
        let ind: number = -1;
        // 逆序找到stack2 里面应该闭合的节点位置
        for (let i = stack1.length - 1; i >= 0; i--) {
            if (stack1[i].element.tagName == tagName && stack1[i].isClosed == false) {
                ind = i;
                break;
            }
        }
        if (ind == -1) {
            throw new NError(`compile2`, `${endTag[0]}`);
        }
        let children = stack1.splice(ind + 1);
        let chd = [];
        for (let c of children) {
            let attrs = c.attrs;
            if (attrs && attrs != '') {
                this.handleAstAttrs(c.element, attrs, stack1[ind].element);
                // 处理完属性之后判断是不是自定义标签
                if (c.isDefinedElement) {
                    const de = DefineElementManager.get(tagName.toUpperCase())
                    de.init(c.element, stack1[ind].element);
                }
            }
            chd.push(c.element);
        }
        // stack1[ind].element.children = children.map(item => {
        //     return item.element;
        // });
        stack1[ind].element.children = chd;
        stack1[ind].isClosed = true;
        // stack1[ind].setTmpParam("isClosed", true);

        return endTag[0].length;
    }

    /**
     * 处理表达式串
     * @param exprStr   含表达式的串
     * @return          处理后的字符串和表达式数组
     */
    public static compileExpression(exprStr: string) {
        if (/\{.+?\}/.test(exprStr) === false) {
            return exprStr;
        }
        let reg: RegExp = /\{\{.+?\}?\s*\}\}/g;
        let retA = new Array();
        let re: RegExpExecArray;
        let oIndex: number = 0;
        while ((re = reg.exec(exprStr)) !== null) {
            let ind = re.index;
            //字符串
            if (ind > oIndex) {
                let s = exprStr.substring(oIndex, ind);
                retA.push(s);
            }
            //实例化表达式对象
            let exp = new Expression(re[0].substring(2, re[0].length - 2));
            //加入工厂
            retA.push(exp);
            oIndex = ind + re[0].length;
        }
        //最后的字符串
        if (oIndex < exprStr.length - 1) {
            retA.push(exprStr.substr(oIndex));
        }
        return retA;
    }
}
