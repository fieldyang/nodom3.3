import { DefineElementManager } from "./defineelementmanager";
import { Directive } from "./directive";
import { Element } from "./element";
import { NError } from "./error";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
// import { ASTObj } from "./types";

export class Compiler {

    /**
    * 当前id
    */
    private currentId: number;
    /**
     * 模块
     */
    private module: Module;

    constructor(module: Module) {
        this.currentId = 0;
        this.module = module;
    }

    /**
    * 编译
    * @param elementStr    待编译html串
    * @returns             虚拟dom
    */
    public compile(elementStr: string): Element {
        // 这里是把模板串通过正则表达式匹配 生成AST
        let ast = this.compileTemplateToAst(elementStr);
        return ast;
    }
    private handleSlot(node: Element) {
        if (node.hasDirective('module')) {
            let slotCt: Element;
            for (let i = 0; i < node.children.length; i++) {
                const c = node.children[i];
                if (c.hasDirective('slot')) {
                    continue;
                }
                if (!slotCt) {
                    slotCt = new Element('div');
                    slotCt.addDirective(new Directive(this.module, 'slot', null))
                }
                slotCt.add(c);
                node.children.splice(i, 1, slotCt);
            }
        }
    }
    /**
     * 前置处理
     * 包括：模块类元素、自定义元素
     * @param node  ast node
     */
    private preHandleNode(node: Element) {
        // 模块类判断
        if (ModuleFactory.hasClass(node.tagName)) {
            node.addDirective(new Directive(this.module, 'module', node.tagName))
            node.tagName = 'div';
        } else if (DefineElementManager.has(node.tagName)) { //自定义元素
            let clazz = DefineElementManager.get(node.tagName);
            Reflect.construct(clazz, [node, this.module]);
        }
    }
    /**
     * 处理html保留字符 如 &nbsp;、&lt;等
     * @param str 待处理的字符串
     * @returns 解析之后的串
     */
    private preHandleText(str: string): string {
        let div = document.createElement('div');
        div.innerHTML = str;
        return div.textContent;
    }
    /**
     * 编译ast 到虚拟dom
     * @param oe        虚拟dom
     * @param attrs     需要编译成虚拟dom的attrs
     * @param parent    父虚拟dom节点
     */
    public handleAstAttrs(oe: Element, attrs: Map<string, any>, module: Module) {
        //指令数组 先处理普通属性在处理指令
        let directives = [];
        if (!attrs) { return }
        for (let [key, value] of attrs) {
            // 统一吧属性名转换成小写
            key = key.toLocaleLowerCase()
            if (key.startsWith("x-")) {
                //指令 不排序
                oe.addDirective(new Directive(module, key.substr(2), value));
            } else if (key.startsWith("e-")) {
                // 事件
                oe.addEvent(new NEvent(module, key.substr(2), value));
            } else {
                oe.setProp(key, value);
            }
        }
    }

    /**
     * 处理属性字符串
     * @param attrString 属性字符串
     * @returns attrs数组 
     */
    private parseAttrString(attrString: string | undefined): Map<string, any> {
        if (attrString == undefined) {
            return new Map();
        } else {
            attrString += ' ';
        }
        const attrReg = /([a-zA-Z][a-zA-Z0-9-_]*)=?((?<==)(?:[^'"{}]*?(?=\s)|'.*?'|".*?"|\{\{[\s\S]*?\}{0,2}\s*\}\}))?/;
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
                    attrValue = this.compileExpression(attrValue)[0];
                    attrValue = this.module.objectManager.getExpression(attrValue);
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
    private compileTemplateToAst(elementStr: string): Element {
        let templateStr = elementStr.trim();
        // 准备栈空间
        let stack1 = []; //{ tagName: undefined, children: [], attrs: new Map() ,isClosed:false }

        let stack2 = [];//tag栈
        let index = -2;
        // 开始标签的正则表达式 
        const tagReg =
            /(?<!{{[^}}]*)(?:<(\/?)\s*?([a-zA-Z][a-zA-Z0-9-_]*)([\s\S]*?)(\/?)(?<!=)>)(?![^{{]*}})/g
        // 匹配注释
        const commentRegExp = /\s*\<!--[\s\S]+?--\>/g;
        // 不需要注释节点
        let rest = templateStr.replace(commentRegExp, '');
        // 匹配到字符串末尾
        let root: Element;
        let tag;
        let preFlag = false;
        while ((tag = tagReg.exec(rest)) != null) {
            if (index <= tag.index) {
                let word = rest.substring(index, tag.index);
                if (!/^\s*$/.test(word) || preFlag) {
                    if (word.indexOf('&') !== -1) {
                        // 有& 处理一下字符串
                        word = this.preHandleText(word);
                    }
                    let text = new Element(null, this.genKey())
                    const compiledStr = this.compileExpression(word);
                    if (typeof compiledStr == 'string') {
                        text.textContent = compiledStr;
                    } else {
                        text.expressions = compiledStr;
                    }
                    stack1[stack1.length - 1].children.push(text);
                }
                if (tag[1] && tag[1] == '/') {
                    root = this.compilerEndTagToAST(tag, stack1, stack2);
                    if (tag[2] == 'pre') {
                        preFlag = false;
                    }
                } else {
                    this.compilerStartTagToAST(tag, stack1, stack2);
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
     * @param stack1 element栈
     * @param stack2 tag栈
     * @param preFlag pre标签Flag
     * @returns 截断原串的位置
     */
    private compilerStartTagToAST(startTag, stack1, stack2) {
        let [, , tagName, attrString, selfCloseStr] = startTag;
        // 创先新element
        let newEl = new Element(tagName, this.genKey());
        // 处理属性
        this.handleAstAttrs(newEl, this.parseAttrString(attrString), this.module);
        // 预处理
        this.preHandleNode(newEl);
        //指令排序
        newEl.sortDirective();
        if (selfCloseStr == '/') {
            // 这个标签是自闭合标签
            if (stack1.length > 0) {
                stack1[stack1.length - 1].children.push(newEl)
            }

        } else {
            // AST入栈
            stack1.push(newEl);
            stack2.push(tagName);
        }
    }

    /**
     * 编译结束标签到AST
     * @param endTag 结束标签的匹配串
     * @param index 结束标签在原串中的位置
     * @param stack1 element栈
     * @param stack2 tag栈
     * @returns index
     */
    private compilerEndTagToAST(endTag, stack1, stack2): Element {
        // 识别结束标记
        let [, , tagName] = endTag;
        let ind: number = -1;
        // 逆序找到stack2 里面应该闭合的节点位置，stack1里面也是相同的位置，因为文本节点不会在stack1中占位置
        for (let i = stack2.length - 1; i >= 0; i--) {
            // && stack1[i].isClosed == false
            if (stack2[i] == tagName) {
                ind = i;
                break;
            }
        }
        if (ind == -1) {
            throw new NError(`compile2`, `${endTag[0]}`);
        }
        stack2.splice(ind);
        let children = stack1.splice(ind + 1);
        let chd = [];
        for (const c of children) {
            // 子节点展开成为兄弟节点
            chd.push(c);
            chd = chd.concat(c.children);
            c.children = [];
        }
        stack1[ind].children = stack1[ind].children.concat(chd);
        this.handleSlot(stack1[ind]);
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
    public compileExpression(exprStr: string) {
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
            let exp = new Expression(this.module, re[0].substring(2, re[0].length - 2));
            //加入工厂
            retA.push(exp.id);
            oIndex = ind + re[0].length;
        }
        //最后的字符串
        if (oIndex < exprStr.length - 1) {
            retA.push(exprStr.substr(oIndex));
        }
        return retA;
    }
    /**
   * 产生可以
   * @returns     key
   */
    private genKey(): string {
        return this.module.id + '_' + this.currentId++;
    }
}
