import { DefineElementManager } from "./defineelementmanager";
import { Directive } from "./directive";
import { Element } from "./element";
import { NError } from "./error";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { ModuleFactory } from "./modulefactory";
import { ASTObj } from "./types";
import { Util } from "./util";

export class Compiler {

    /**
    * 编译
    * @param elementStr    待编译html串
    * @returns             虚拟dom
    */
    public static compile(elementStr: string): Element {
        // 这里是把模板串通过正则表达式匹配 生成AST
        let ast = this.compileTemplateToAst(elementStr);
        let oe = new Element('div');
        // 将AST编译成抽象语法树
        this.compileAST(oe, ast);
        return oe;
    }

    /**
     * 把AST编译成虚拟dom
     * @param oe 虚拟dom的根容器
     * @param ast 抽象语法树也就是JSON对象
     * @returns oe 虚拟dom的根容器
     */
    public static compileAST(oe: Element, ast: Array<ASTObj>): Element {
        if (!ast) return;
        for (const a of ast) {
            switch (a.tagName) {
                case 'text': //文本节点
                    this.handleAstText(oe, a);
                    break;
                case 'comment':// 注释不处理
                    break;
                default:
                    this.handleAstNode(oe, a);
                    break;
            }
        }
        return oe;
    }

    /**
     * 编译text类型的ast到虚拟dom
     * @param parent 父虚拟dom节点
     * @param ast 虚拟dom树
     */
    private static handleAstText(parent: Element, astObj: ASTObj) {
        let text = new Element();
        parent.children.push(text);
        // 处理属性
        this.handleAstAttrs(text, astObj.attrs, parent);
        // text 类型的节点不需要处理子节点。
        text.expressions = astObj.expressions;
        text.textContent = astObj.textContent;
    }
    /**
     * 
     * @param oe 虚拟dom   
     * @param astObj 
     */
    public static handleAstNode(parent: Element, astObj: ASTObj) {
        //前置处理
        this.preHandleNode(astObj);
        let child = new Element(astObj.tagName);
        parent.add(child);
        this.handleAstAttrs(child, astObj.attrs, parent);
        this.compileAST(child, astObj.children);
    }
    
    /**
     * 编译ast 到虚拟dom
     * @param oe        虚拟dom
     * @param attrs     需要编译成虚拟dom的attrs
     * @param parent    父虚拟dom节点
     */
    public static handleAstAttrs(oe: Element, attrs: Map<string,any>, parent: Element) {
        //指令数组 先处理普通属性在处理指令
        let directives = [];
        if (!attrs) { return }
        for(const attr of attrs){
            if (attr[0].startsWith("x-")) {
                //指令
                directives.push({
                    name:attr[0].substr(2),
                    value:attr[1]
                });
            } else if (attr[0].startsWith("e-")) {
                // 事件
                let e = attr[0].substr(2);
                oe.addEvent(new NEvent(e, attr[1]));
            } else if (attr[0].startsWith("d-")) {
                // 数据
                let tempArr = attr[0].split(':');
                let bindFlag: boolean = false;
                if (tempArr.length == 2) {
                    bindFlag = tempArr[1] == 'true' ? true : false;
                }
                let name = tempArr[0].split('-')[1];
                if (/\{\{.+?\}\}/.test(attr[1]) === false) {
                    throw new NError('数据必须是由双大括号包裹');
                }
                let value = attr[1].substring(2, attr[1].length - 2);
                // 变量别名，变量名（原对象.变量名)，双向绑定标志
                let data = [value, bindFlag];
                oe.datas[name] = data;
            } else {
                // 普通属性 如class 等
                let isExpr: boolean = false;
                let v = attr[1];
                if (v !== '') {
                    let ra = this.compileExpression(v);
                    if (Util.isArray(ra)) {
                        oe.setProp(attr[0], ra, true);
                        isExpr = true;
                    }
                }
                if (!isExpr) {
                    oe.setProp(attr[0], v);
                }
            }
        }
        //处理属性
        for (let attr of directives) {
            new Directive(attr.name, attr.value, oe, parent, null, true);
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
     * @returns attrs map
     */
    private static parseAttrString(attrString: string | undefined): Map<string,any> {
        let map = new Map();
        if (attrString == undefined || attrString.length === 0) return map;

        attrString = attrString.trim();
        // 引号栈处理引号嵌套
        let yinghaoStack: string[] = [];
        //引号flag 当前是否在引号内
        let yinhaoFlag = false;
        // 断点
        let point = 0;

        let result = [];
        for (let i = 0; i < attrString.length; i++) {
            let s = attrString[i];
            if (/[\"\']/.test(s)) {
                // 遇到引号
                if (yinghaoStack.length != 0) {
                    // 引号栈不空
                    if (s === yinghaoStack[yinghaoStack.length - 1]) {
                        // 判断是不是匹配栈顶
                        yinghaoStack.pop();
                        if (yinghaoStack.length == 0) yinhaoFlag = false;
                    } else {
                        // 不匹配栈顶直接入栈
                        yinghaoStack.push(s);
                    }
                } else {
                    // 引号栈空 入栈
                    yinghaoStack.push(s);
                    yinhaoFlag = true;
                }

                // yinhaoFlag = !yinhaoFlag;
            } else if (/\s/.test(s) && !yinhaoFlag) {
                //遇到空格并且不在引号中
                if (!/^\s*?$/.test(attrString.substring(point, i))) {
                    result.push(attrString.substring(point, i).trim());
                    point = i;
                }
            }
        }
        let lastAttr = attrString.substring(point).trim();
        // 判断最后一个属性是不是自定义标签的'/' 如果是则不把他当作标签。
        if (lastAttr !== '/') {
            //循环结束之后还剩一个属性没加进去，因为可能最后一个属性后面没有空格
            result.push(attrString.substring(point).trim());
        }
        for(let r of result){
            // 如果match为空说明属性串里面没有“”,也就是自定义的只有属性名没有属性值的属性，这种直接设置value字段为空
            const e = r.match(/^(.+)=(\{\{[\s\S]*\}\})$/);
            if(e){
                map.set(e[1],e[2] || '');
            }else{
                const o = r.match(/^(.+)=[\'|\"]([\s\S]*)[\'|\"]$/) || [, r];
                map.set(o[1],o[2] || '');
            }
        }
        return map;
    }

    /**
     * 将模板字符串转换成AST抽象语法树结构
     * @param elementStr 模板字符串
     * @returns AST对象数组
     */
    private static compileTemplateToAst(elementStr: string): Array<ASTObj> {
        let templateStr = elementStr.trim();
        // 准备栈空间
        let stack1 = [];
        let stack2 = [{ tagName: undefined, children: [], attrs: new Map()}]

        let index = 0;

        // 开始标签的正则表达式 
        let startRegExp = /^\<(\s*)([a-zA-Z\-]*[0-9]?)((?:"(?:[^"]*)"+|'(?:[^']*)'+|(?:[^<>"'/]*)+|(?:\{\{.*\}\})+)*)*?(\s*\/){0,1}(\s*)\>/;
        // /^\<(\s*)([a-z\-]*[0-9]?)((?:\s+\w+\-?\w+(?:\=[\"\']?[\s\S]*?[\"\']?)?)*)*(\s*\/)?(\s*)\>/

        // 匹配结束标签的正则表达式
        let endRegExp = /^\<(\s*)\/(\s*)([a-zA-Z\-]*[0-9]?)(\s*)\>/
        // /^\<(\s*)\/(\s*)([a-z]+[1-6]?|ui\-[a-z]+[1-6]?)(\s*)\>/;
        // 匹配开始标签和结束标签之间的文字的正则表达式 
        let wordRegExp = /^([\s\S]+?)(?=\<(?:!--)?(?:\s*\/?\s*(?:[a-zA-Z\-]*[0-9]?)(?:(?:\s+\w+\-?\w+\=?[\"\']?[\s\S]*?[\"\']?)*)*|(?:[\s\S]+?))(?:--)?\>)/
        // /^([\s\S]+?)(?=\<(!--)?(?:(\s*)\/?(\s*)(?:[a-z]+[1-6]?|ui\-[a-z]+[1-6]?)(?:(?:\s+.+?[\"\'](?:[\s\S]*?)[\"\']|.*))?(\s*)|(?:[\s\S]+?))(--)?\>)/
        // 匹配裸字符串，全字符匹配配合wordRegExp标签判断是不是裸字符串
        let onlyWordRegExp = /^([\s\S]+)/;
        // 匹配注释
        let commentRegExp = /^\s*\<!--[\s\S]+?--\>/;
        // pre结束标签。
        let preEndTagRegExp = /^([\s\S]+)(?=\<(\s*)\/(\s*)pre(?:\s.+?)?(\s*)\>)/;
        // pre标签标志，遇到pre标签要把标签里面的内容当成文本节点。
        let preFlag = false;
        // 匹配到字符串末尾
        while (index < templateStr.length - 1) {
            let rest = templateStr.substring(index);

            if (preFlag) {
                // 现在进入到pre标签里面了 直接搜索</pre>结束标签
                let text = rest.match(preEndTagRegExp) ? rest.match(preEndTagRegExp)[1] : null;
                if (text) {
                    stack2[stack2.length - 1].children.push({ textContent: text, tagName: 'text' })
                    index += text.length;
                    preFlag = false;
                } else {
                    throw new Error("pre标签未闭合");

                }
            } else if (startRegExp.test(rest)) {

                // 识别遍历到的字符是不是一个开始标签

                // beforeSpaceString:左尖括号与标签名之间的空格
                // tagName:标签名  
                // attrString:标签里的属性字符串 
                // selfCloseStr: 自闭合标签的反斜杠
                // afterSpaceString:属性与右尖括号之间的空格
                let [, beforeSpaceString, tagName, attrString, selfCloseStr, afterSpaceString] = rest.match(startRegExp);
                const beforeSpaceLenght = beforeSpaceString ? beforeSpaceString.length : 0;
                const tagNameLenght = tagName ? tagName.length : 0;
                const atttLenght = attrString ? attrString.length : 0;
                const selfCloseLenght = selfCloseStr ? selfCloseStr.length : 0;
                const afterSpaceLenght = afterSpaceString ? afterSpaceString.length : 0;
                if (tagName === 'pre') {
                    // pre标签
                    preFlag = true;
                }
                // 判断是不是自闭合标签
                if (selfCloseStr && selfCloseStr != undefined) {
                    //自闭和标签
                    stack2[stack2.length - 1].children.push({
                        tagName,
                        children: [],
                        attrs: this.parseAttrString(attrString)
                    })
                } else {
                    // 这个标签是普通的标签
                    // 开始标签入栈
                    stack1.push(tagName);
                    // AST入栈
                    stack2.push({
                        tagName,
                        children: [],
                        attrs: this.parseAttrString(attrString)
                    });
                    // 需要跳过的长度 = 2个尖括号 + 左尖括号与标签名之间的空格长度 + 标签名长度 + 属性长度 + 属性与右尖括号之间的空格长度
                }
                index += 2 + beforeSpaceLenght + tagNameLenght + atttLenght + selfCloseLenght + afterSpaceLenght;
            } else if (endRegExp.test(rest)) {
                // 识别结束标记
                // let tagName = rest.match(endRegExp)[1];

                // beforeSpaceString: / 之前的空格
                // afterSpaceString: / 之后的空格
                // tagName: 标签名字
                // endSpaceString: 标签之后的空格
                let [, beforeSpaceString, afterSpaceString, tagName, endSpaceString] = rest.match(endRegExp)
                const beforeSpaceLenght = beforeSpaceString ? beforeSpaceString.length : 0;
                const afterSpaceLenght = afterSpaceString ? afterSpaceString.length : 0;
                const tagNameLenght = tagName ? tagName.length : 0;
                const endSpaceLenght = endSpaceString ? endSpaceString.length : 0;
                // 这时候tag一定和栈顶是相同的，因为html需要闭合，如果不相同哪么说明有标签没闭合
                if (tagName != stack1[stack1.length - 1]) {
                    throw new Error(stack1[stack1.length - 1] + "标签没有封闭");
                } else {
                    stack1.pop();
                    let pop_arr = stack2.pop();
                    if (stack2.length > 0) {
                        stack2[stack2.length - 1].children.push(pop_arr);
                    }
                }
                index += beforeSpaceLenght + afterSpaceLenght + tagNameLenght + endSpaceLenght + 3;
            } else if (commentRegExp.test(rest)) {
                // 识别注释
                index += rest.match(commentRegExp)[0].length;
            }
            //wordRegExp.test(rest)   rest.match(wordRegExp) || rest.match(onlyWordRegExp)
            else if (rest.match(wordRegExp) || rest.match(onlyWordRegExp)) {
                //识别为文本节点 
                // wordRegExp 匹配标签前面的字符，如果字符后面没有标签，匹配结果是null
                //当wordRegExp匹配结果是null的时候说明再节点之后有一个裸文本标签（由onlyWordRegExp匹配）
                //再处理之前我们要判断一下当前栈1是否为空，防止有标签没闭合的情况。
                if (!rest.match(wordRegExp) && rest.match(onlyWordRegExp)) {
                    //这里要处理一下可能标签没闭合 如:<div>123
                    if (stack1.length !== 0) {
                        let a = 111;
                        throw new Error(stack1[stack1.length - 1] + '标签没闭合');
                    }
                }
                // 这里要把裸字符串的情况与后面有标签的字符串（标签之间的字符串）分开处理
                let word = rest.match(wordRegExp) ? rest.match(wordRegExp)[1] : rest.match(onlyWordRegExp)[1];

                // 看word是不是全是空
                if (!/^\s+$/.test(word)) {
                    // 不全是空
                    // 改变栈顶元素
                    // 编译一下看是否有双大括号表达式
                    let expr = this.compileExpression(word);
                    if (typeof expr === 'string') {
                        // 返回的是字符串说明没有双大括号表达式，把属性放进textContent
                        stack2[stack2.length - 1].children.push({ textContent: expr, tagName: 'text' });
                    } else {
                        // 返回的是数组说明是有双大括号表达式的，编译了之后放进expressions属性
                        stack2[stack2.length - 1].children.push({ expressions: expr, tagName: 'text' });
                    }
                }
                index += word.length;
            } else {
                // 这里处理一下只有纯文本的形式
                index++;
            }
        }
        return stack2[0].children;
    }

    /**
     * 处理表达式串
     * @param exprStr   含表达式的串
     * @return          处理后的字符串和表达式数组
     */
    public static compileExpression(exprStr: string) {
        if (/\{\{.+?\}\}/.test(exprStr) === false) {
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

    /**
     * 前置处理
     * 包括：模块类元素、自定义元素
     * @param node  ast node
     */
    private static preHandleNode(node:ASTObj){
        // 模块类判断
        if (ModuleFactory.has(node.tagName)) {
            // node.attrs.push({propName:'x-module',value:node.tagName});
            node.attrs.set('x-module',node.tagName);
            node.tagName = 'div';
        }else if(DefineElementManager.has(node.tagName)){ //自定义元素
            let clazz = DefineElementManager.get(node.tagName);
            Reflect.construct(clazz,[node]);
        }
    }
}
