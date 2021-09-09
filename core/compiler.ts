import { DefineElementManager } from "./defineelementmanager";
import { Directive } from "./directive";
import { Element } from "./element";
import { NError } from "./error";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { ModuleFactory } from "./modulefactory";
import { ASTObj } from "./types";


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
    public static compileAST(oe: Element, ast: ASTObj): Element {
        if (!ast) return;
        ast.tagName ? this.handleAstNode(oe, ast) : this.handleAstText(oe, ast);
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
        if (/\{\{.+\}\}/.test(astObj.textContent)) {
            text.expressions = <any[]>this.compileExpression(astObj.textContent);
        } else {
            text.textContent = astObj.textContent;
        }
    }
    /**
     * 前置处理
     * 包括：模块类元素、自定义元素
     * @param node  ast node
     */
    private static preHandleNode(node: ASTObj) {
        // 模块类判断
        if (ModuleFactory.has(node.tagName)) {
            // node.attrs.push({propName:'x-module',value:node.tagName});
            node.attrs.set('x-module', node.tagName);
            node.tagName = 'div';
        } else if (DefineElementManager.has(node.tagName)) { //自定义元素
            let clazz = DefineElementManager.get(node.tagName);
            Reflect.construct(clazz, [node]);
        }
    }
    /**
     * 
     * @param oe 虚拟dom   
     * @param astObj 
     */
    public static handleAstNode(parent: Element, astObj: ASTObj) {
        this.preHandleNode(astObj);
        let child = new Element(astObj.tagName);
        parent.add(child);
        this.handleAstAttrs(child, astObj.attrs, parent);
        for (let a of astObj.children) {
            this.compileAST(child, a);
        }
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
            } else {
                oe.setProp(key, value, value instanceof Expression);
            }
        }
        //处理属性
        for (let attr of directives) {
            new Directive(attr.key.substr(2), attr.value, oe, parent,true);
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
        if (attrString == undefined) {
            return new Map();
        } else {
            attrString += ' ';
        }
        const attrReg = /([a-zA-Z][a-zA-Z0-9-_]*)(?:=\s*)?((?<==\s*)(?:[^'"{}]*?(?=\s)|'[\s\S]*?'|"[\s\S]*?"|\{\{[\s\S]*?\}{0,2}\s*\}\}))?/
        // /([a-zA-Z][a-zA-Z0-9-_]*)(?:=?\s*?)((?<==)(?:[^'"{}]*?(?=\s)|'[\s\S]*?'|"[\s\S]*?"|\{\{[\s\S]*?\}{0,2}\s*\}\}))?/;
        let index = 0;
        let attrs = new Map();
        while (index < attrString.length - 1) {
            attrString = attrString.substring(index);
            index = 0;
            const attr = attrString.match(attrReg)
            if (attr) {
                let [attrStr, attrName, attrValue]: any = attr;
                if (attrValue?.startsWith("'") || attrValue?.startsWith('"')) {
                    attrValue = attrValue.substring(1, attrValue.length - 1).trim();
                }
                if (attrValue?.startsWith('{{')) {
                    attrValue = new Expression(attrValue.substring(2, attrValue.length - 2));
                }
                if (attrName != undefined) {
                    attrs.set(attrName, attrValue ? attrValue : '');
                }
                index += attrStr.length + attr.index;
            } else {
                return attrs
            }
        }
        return attrs;
    }

    /**
     * 将模板字符串转换成AST抽象语法树结构
     * @param elementStr 模板字符串
     * @returns AST对象数组
     */
    private static compileTemplateToAst(elementStr: string): ASTObj {
        let templateStr = elementStr.trim();
        // 准备栈空间
        let stack1 = []; //{ tagName: undefined, children: [], attrs: new Map() ,isClosed:false }
        let index = -2;
        // 开始标签的正则表达式 
        const tagReg =
            /(?<!\{\{[^<}}]*)(?:<(\/?)\s*?([a-zA-Z][a-zA-Z0-9-_]*)([\s\S]*?)(\/?)(?<!=)>)(?![^>{{]*?\}\})/g;
        // 匹配注释
        const commentRegExp = /\s*\<!--[\s\S]+?--\>/g;
        // 不需要注释节点
        let rest = templateStr.replace(commentRegExp, '');
        // 匹配到字符串末尾
        let root: ASTObj;
        let tag;
        let preFlag = false;
        while ((tag = tagReg.exec(rest)) != null) {
            if (index <= tag.index) {
                let word = rest.substring(index, tag.index);
                if (!/^\s*$/.test(word) || preFlag) {
                    stack1[stack1.length - 1].children.push({ textContent: word });
                }
                if (tag[1] && tag[1] == '/') {
                    root = this.compilerEndTagToAST(tag, stack1);
                    if (tag[2] == 'pre') {
                        preFlag = false;
                    }
                } else {
                    this.compilerStartTagToAST(tag, stack1);
                    if (tag[2] == 'pre') {
                        preFlag = true;
                    }
                }
                index = tagReg.lastIndex;
            }
        }
        if (stack1.length != 0) {
            throw new NError('compile1', `${stack1[0]}`)
        }
        return root;
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
    private static compilerStartTagToAST(startTag, stack1) {
        let [, , tagName, attrString, selfCloseStr] = startTag;
        if (ModuleFactory.has(tagName)) {
            // 是模块标签
            attrString += `x-module=${tagName}`;
        }
        if (selfCloseStr == '/') {
            // 这个标签是自闭合标签
            if (stack1.length > 1) {
                stack1[stack1.length - 1].children.push({
                    tagName,
                    children: [],
                    attrs: this.parseAttrString(attrString)
                })
            }

        } else {
            // AST入栈
            stack1.push({
                tagName,
                children: [],
                attrs: this.parseAttrString(attrString)
            });
        }
    }

    /**
     * 编译结束标签到AST
     * @param endTag 结束标签的匹配串
     * @param index 结束标签在原串中的位置
     * @param stack1 辅助栈1
     * @param stack2 辅助栈2
     * @returns index
     */
    private static compilerEndTagToAST(endTag, stack1): ASTObj {
        // 识别结束标记
        let [, , tagName] = endTag;
        // tagName = tagName.trim();
        let ind: number = -1;
        // 逆序找到stack2 里面应该闭合的节点位置
        for (let i = stack1.length - 1; i >= 0; i--) {
            // && stack1[i].isClosed == false
            if (stack1[i].tagName == tagName) {
                ind = i;
                break;
            }
        }
        if (ind == -1) {
            throw new NError(`compile2`, `${endTag[0]}`);
        }
        let children = stack1.splice(ind + 1);
        let chd = [];
        for (const c of children) {
            // 子节点展开成为兄弟节点
            chd.push(c);
            chd = chd.concat(c.children);
            c.children = [];
        }
        stack1[ind].children = stack1[ind].children.concat(chd);
        let pop = stack1.pop();
        if (stack1.length != 0) {
            stack1[stack1.length - 1].children.push(pop);
        } else {
            return pop;
        }
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
