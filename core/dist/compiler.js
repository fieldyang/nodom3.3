"use strict";
exports.__esModule = true;
exports.Compiler = void 0;
var directive_1 = require("./directive");
var element_1 = require("./element");
var event_1 = require("./event");
var expression_1 = require("./expression");
var pluginmanager_1 = require("./pluginmanager");
var types_1 = require("./types");
var util_1 = require("./util");
var Compiler = /** @class */ (function () {
    function Compiler() {
    }
    /**
    * 编译
    * @param elementStr    待编译html串
    * @returns             虚拟dom
    */
    Compiler.compile = function (elementStr) {
        // 这里是把模板串通过正则表达式匹配 生成AST
        var ast = this.compileTemplateToAst(elementStr);
        // console.log(ast);
        var oe = new element_1.Element('div');
        // 将AST编译成抽象语法树
        this.compileAST(oe, ast);
        return oe;
        // // 这里是使用游离的dom来充当ast的流程 暂时先保留着以便对比
        // const div: HTMLElement = Util.newEl('div');
        // try {
        //     div.innerHTML = elementStr;
        // } catch (e) { }
        // let oe = new Element('div');
        // this.handleChildren(oe, div);
        // //保证模块只有一个根节点
        // // if (oe.children.length === 1) {
        // //     return oe.children[0];
        // // }
        // // console.log(oe);
        // return oe;
    };
    /**
     * 把AST编译成虚拟dom
     * @param oe 虚拟dom的根容器
     * @param ast 抽象语法树也就是JSON对象
     * @returns oe 虚拟dom的根容器
     */
    Compiler.compileAST = function (oe, ast) {
        // const div: HTMLElement = Util.newEl('div');
        // let oe = new Element('div');
        if (!ast)
            return;
        for (var _i = 0, ast_1 = ast; _i < ast_1.length; _i++) {
            var a = ast_1[_i];
            switch (a.tagName) {
                case 'text': //文本节点
                    this.handleAstText(oe, a);
                    break;
                case 'comment': // 注释不处理
                    break;
                default:
                    if (a.tagName !== 'svg') {
                        // let chlid = new Element(a.tagName);
                        this.handleAstNode(oe, a);
                    }
                    break;
            }
        }
        return oe;
    };
    /**
     * 编译text类型的ast到虚拟dom
     * @param parent 父虚拟dom节点
     * @param ast 虚拟dom树
     */
    Compiler.handleAstText = function (parent, astObj) {
        var text = new element_1.Element();
        // 处理属性
        this.handleAstAttrs(text, astObj.attrs);
        // text 类型的节点不需要处理子节点。
        text.expressions = astObj.expressions;
        text.textContent = astObj.textContent;
        parent.children.push(text);
    };
    /**
     *
     * @param oe 虚拟dom
     * @param astObj
     */
    Compiler.handleAstNode = function (parent, astObj) {
        var de = pluginmanager_1.PluginManager.get(astObj.tagName.toUpperCase());
        var child = new element_1.Element(astObj.tagName);
        // 处理属性
        this.handleAstAttrs(child, astObj.attrs);
        this.compileAST(child, astObj.children);
        if (de) {
            parent.children.push(Reflect.construct(de, [child]).element);
        }
        else {
            parent.children.push(child);
        }
    };
    /**
     * 编译ast 到虚拟dom
     * @param oe 虚拟dom
     * @param attrs 需要编译成虚拟dom的attrs
     */
    Compiler.handleAstAttrs = function (oe, attrs) {
        //指令数组 先处理普通属性在处理指令
        var directives = [];
        if (!attrs) {
            return;
        }
        for (var _i = 0, attrs_1 = attrs; _i < attrs_1.length; _i++) {
            var attr = attrs_1[_i];
            if (attr.propName.startsWith("x-")) {
                //指令
                directives.push(attr);
            }
            else if (attr.propName.startsWith("e-")) {
                // 事件
                var e = attr.propName.substr(2);
                oe.addEvent(new event_1.NEvent(e, attr.value.trim()));
            }
            else {
                // 普通属性 如class 等
                var isExpr = false;
                var v = attr.value.trim();
                if (v !== '') {
                    var ra = this.compileExpression(v);
                    if (util_1.Util.isArray(ra)) {
                        oe.setProp(attr.propName, ra, true);
                        isExpr = true;
                    }
                }
                if (!isExpr) {
                    oe.setProp(attr.propName, v);
                }
            }
        }
        //处理属性
        for (var _a = 0, directives_1 = directives; _a < directives_1.length; _a++) {
            var attr = directives_1[_a];
            console.log(attr);
            var dir = new directive_1.Directive(attr.propName.substr(2), attr.value.trim(), oe, null, true);
            console.log(dir);
        }
        if (directives.length > 1) {
            //指令排序
            oe.directives.sort(function (a, b) {
                return a.type.prio - b.type.prio;
            });
        }
    };
    /**
     * 处理属性字符串
     * @param attrString 属性字符串
     * @returns attrs数组
     */
    Compiler.parseAttrString = function (attrString) {
        if (attrString == undefined || attrString.length === 0)
            return [];
        attrString = attrString.trim();
        //引号flag 当前是否在引号内
        var yinhaoFlag = false;
        // 断点
        var point = 0;
        var result = [];
        for (var i = 0; i < attrString.length; i++) {
            var s = attrString[i];
            if (s == '"') {
                yinhaoFlag = !yinhaoFlag;
            }
            else if (s == " " && !yinhaoFlag) {
                //遇到空格并且不在引号中
                if (!/^\s*?$/.test(attrString.substring(point, i))) {
                    result.push(attrString.substring(point, i).trim());
                    point = i;
                }
            }
        }
        var lastAttr = attrString.substring(point).trim();
        // 判断最后一个属性是不是自定义标签的'/' 如果是则不把他当作标签。
        if (lastAttr !== '/') {
            //循环结束之后还剩一个属性没加进去，因为可能最后一个属性后面没有空格
            result.push(attrString.substring(point).trim());
        }
        result = result.map(function (item) {
            // 如果match为空说明属性串里面没有“”也就是自定义的只有属性名没有属性值得属性，这种直接给他的value字段设置为空就行了
            var o = item.match(/^(.+)=[\'|\"](.+)[\'|\"]$/) || [, item];
            return {
                propName: o[1],
                value: o[2] ? o[2] : ''
            };
        });
        return result;
    };
    /**
     * 将模板字符串转换成AST抽象语法树结构
     * @param elementStr 模板字符串
     * @returns AST对象数组
     */
    Compiler.compileTemplateToAst = function (elementStr) {
        var templateStr = elementStr.trim();
        // 准备栈空间
        var stack1 = [];
        var stack2 = [{ tagName: undefined, children: [], attrs: [] }];
        var index = 0;
        // 开始标签的正则表达式
        var startRegExp = /^\<(\s*)([a-z]+[1-6]?|ui\-[a-z]+[1-6]?)((?:\s+.+?)*?)(\s*)\>/;
        // 匹配结束标签的正则表达式
        var endRegExp = /^\<(\s*)\/(\s*)([a-z]+[1-6]?|ui\-[a-z]+[1-6]?)(\s*)\>/;
        // 匹配开始标签和结束标签之间的文字的正则表达式 
        var wordRegExp = /^([\s\S]+?)(?=\<(\s*)\/?(\s*)(?:[a-z]+[1-6]?|ui\-[a-z]+[1-6]?)((?:\s+.+?)*?)(\s*)\>)/;
        // 匹配裸字符串，全字符匹配配合wordRegExp标签判断是不是裸字符串
        var onlyWordRegExp = /^([\s\S]+)/;
        // 匹配注释
        var commentRegExp = /^\<!--[\s\S]+?--\>/;
        // pre结束标签。
        var preEndTagRegExp = /^([\s\S]+)(?=\<(\s*)\/(\s*)pre(?:\s.+?)?(\s*)\>)/;
        // pre标签标志，遇到pre标签要把标签里面的内容当成文本节点。
        var preFlag = false;
        // 匹配到字符串末尾
        while (index < templateStr.length - 1) {
            var rest = templateStr.substring(index);
            if (preFlag) {
                // 现在进入到pre标签里面了 直接搜索</pre>结束标签
                var text = rest.match(preEndTagRegExp) ? rest.match(preEndTagRegExp)[1] : null;
                if (text) {
                    stack2[stack2.length - 1].children.push({ textContent: text, tagName: 'text' });
                    index += text.length;
                    preFlag = false;
                }
                else {
                    throw new Error("pre标签未闭合");
                }
            }
            else if (startRegExp.test(rest)) {
                // 识别遍历到的字符是不是一个开始标签
                // beforeSpaceString:左尖括号与标签名之间的空格
                // tagName:标签名  
                // attrString:标签里的属性字符串 
                // afterSpaceString:属性与右尖括号之间的空格
                var _a = rest.match(startRegExp), beforeSpaceString = _a[1], tagName = _a[2], attrString = _a[3], afterSpaceString = _a[4];
                var beforeSpaceLenght = beforeSpaceString ? beforeSpaceString.length : 0;
                var tagNameLenght = tagName ? tagName.length : 0;
                var atttLenght = attrString ? attrString.length : 0;
                var afterSpaceLenght = afterSpaceString ? afterSpaceString.length : 0;
                if (tagName === 'pre') {
                    // pre标签
                    preFlag = true;
                }
                if (types_1.selfClosingTag.indexOf(tagName) !== -1) {
                    // 这个标签是自闭合标签
                    stack2[stack2.length - 1].children.push({
                        tagName: tagName,
                        children: [],
                        attrs: this.parseAttrString(attrString)
                    });
                }
                else {
                    // 这个标签是普通的标签
                    // 开始标签入栈
                    stack1.push(tagName);
                    // AST入栈
                    stack2.push({
                        tagName: tagName,
                        children: [],
                        attrs: this.parseAttrString(attrString)
                    });
                    // 需要跳过的长度 = 2个尖括号 + 左尖括号与标签名之间的空格长度 + 标签名长度 + 属性长度 + 属性与右尖括号之间的空格长度
                    index += 2 + beforeSpaceLenght + tagNameLenght + atttLenght + afterSpaceLenght;
                }
            }
            else if (endRegExp.test(rest)) {
                // 识别结束标记
                // let tagName = rest.match(endRegExp)[1];
                // beforeSpaceString: / 之前的空格
                // afterSpaceString: / 之后的空格
                // tagName: 标签名字
                // endSpaceString: 标签之后的空格
                var _b = rest.match(endRegExp), beforeSpaceString = _b[1], afterSpaceString = _b[2], tagName = _b[3], endSpaceString = _b[4];
                var beforeSpaceLenght = beforeSpaceString ? beforeSpaceString.length : 0;
                var afterSpaceLenght = afterSpaceString ? afterSpaceString.length : 0;
                var tagNameLenght = tagName ? tagName.length : 0;
                var endSpaceLenght = endSpaceString ? endSpaceString.length : 0;
                // 这时候tag一定和栈顶是相同的，因为html需要闭合，如果不相同哪么说明有标签没闭合
                if (tagName != stack1[stack1.length - 1]) {
                    throw new Error(stack1[stack1.length - 1] + "标签没有封闭");
                }
                else {
                    stack1.pop();
                    var pop_arr = stack2.pop();
                    if (stack2.length > 0) {
                        stack2[stack2.length - 1].children.push(pop_arr);
                    }
                }
                index += beforeSpaceLenght + afterSpaceLenght + tagNameLenght + endSpaceLenght + 3;
            }
            else if (commentRegExp.test(rest)) {
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
                        throw new Error(stack1[stack1.length - 1] + '标签没闭合');
                    }
                }
                // 这里要把裸字符串的情况与后面有标签的字符串（标签之间的字符串）分开处理
                var word = rest.match(wordRegExp) ? rest.match(wordRegExp)[1] : rest.match(onlyWordRegExp)[1];
                // 看word是不是全是空
                if (!/^\s+$/.test(word)) {
                    // 不全是空
                    // 改变栈顶元素
                    // 编译一下看是否有双大括号表达式
                    var expr = this.compileExpression(word);
                    if (typeof expr === 'string') {
                        // 返回的是字符串说明没有双大括号表达式，把属性放进textContent
                        stack2[stack2.length - 1].children.push({ textContent: expr, tagName: 'text' });
                    }
                    else {
                        // 返回的是数组说明是有双大括号表达式的，编译了之后放进expressions属性
                        stack2[stack2.length - 1].children.push({ expressions: expr, tagName: 'text' });
                    }
                }
                index += word.length;
            }
            else {
                // 这里处理一下只有纯文本的形式
                index++;
            }
        }
        return stack2[0].children;
    };
    /**
     * 处理表达式串
     * @param exprStr   含表达式的串
     * @return          处理后的字符串和表达式数组
     */
    Compiler.compileExpression = function (exprStr) {
        if (/\{\{.+?\}\}/.test(exprStr) === false) {
            return exprStr;
        }
        var reg = /\{\{.+?\}\}/g;
        var retA = new Array();
        var re;
        var oIndex = 0;
        while ((re = reg.exec(exprStr)) !== null) {
            var ind = re.index;
            //字符串
            if (ind > oIndex) {
                var s = exprStr.substring(oIndex, ind);
                retA.push(s);
            }
            //实例化表达式对象
            var exp = new expression_1.Expression(re[0].substring(2, re[0].length - 2));
            //加入工厂
            retA.push(exp);
            oIndex = ind + re[0].length;
        }
        //最后的字符串
        if (oIndex < exprStr.length - 1) {
            retA.push(exprStr.substr(oIndex));
        }
        return retA;
    };
    return Compiler;
}());
exports.Compiler = Compiler;
// /**
//  * 编译器，负责模版的编译
//  * @since 1.0
//  */
// export  class Compiler {
//     /**
//      * 编译
//      * 如果为el.innerHTML方式，可能存在多个子节点，则在外面包一层父节点，因为模块只能有一个根节点，否则返回模块根节点
//      * @param elementStr    待编译html串
//      * @returns             虚拟dom
//      */
//     public static compile(elementStr:string):Element {
//         const div:HTMLElement = Util.newEl('div');
//         try{
//             div.innerHTML = elementStr;
//         }catch(e){}
//         let oe = new Element('div');
//         oe.setProp('role','moduleContainer')
//         this.handleChildren(oe,div);
//         // //保证模块只有一个根节点
//         // if(oe.children.length===1){
//         //     return oe.children[0];
//         // }
//         return oe;
//     }
//     /**
//      * 编译dom
//      * @param ele           待编译html element
//      * @param parent        父节点（virtualdom）   
//      */
//     public static compileDom(ele:Node) {
//         let oe:Element;
//         //注视标志
//         let isComment = false;
//         switch (ele.nodeType) {
//         case Node.ELEMENT_NODE: //元素
//             let el:HTMLElement = <HTMLElement>ele;
//             oe = this.handleDefineEl(el);
//             if(!oe){
//                 oe = this.handleEl(el);
//             }
//             break;
//         case Node.TEXT_NODE: //文本节点
//             oe = new Element();
//             let txt = ele.textContent;
//             let expA = this.compileExpression(txt);
//             if (typeof expA === 'string') { //无表达式
//                 oe.textContent = expA;
//             } else { //含表达式
//                 oe.expressions = expA;
//             }
//             break;
//         case Node.COMMENT_NODE: //注释
//             isComment = true;
//             break;
//         }
//         //添加到子节点,comment节点不需要    
//         if (!isComment) {
//             return oe;
//         }
//     }
//     /**
//      * 编译html element
//      * @param oe    新建的虚拟dom
//      * @returns     虚拟dom
//      */
//     public static handleEl(el:HTMLElement):Element{
//         let oe:Element = new Element(el.tagName);
//         this.handleAttributes(oe,el);
//         this.handleChildren(oe,el);
//         return oe;
//     }
//     /**
//      * 编译插件
//      * @param el 待处理的html element
//      * @returns  如果识别自定义el，则返回编译后的虚拟dom，否则返回undefined
//      */
//     static handleDefineEl(el:HTMLElement):Element{
//         let de:any = PluginManager.get(el.tagName);
//         if(!de){
//             return;
//         }
//         return Reflect.construct(de,[el]).element;
//     }
//     /**
//      * 处理属性
//      * @param oe 新建的虚拟dom
//      * @param el 待处理的html element
//      */
//     public static handleAttributes(oe:Element,el:HTMLElement){
//         //遍历attributes
//         //先处理普通属性，再处理指令
//         let directives = [];
//         for (let i = 0; i < el.attributes.length; i++) {
//             let attr = el.attributes[i];
//             if (attr.name.startsWith('x-')) { //指令，先存，最后处理
//                 directives.push(attr);
//             } else if (attr.name.startsWith('e-')) { //事件
//                 let en = attr.name.substr(2);
//                 oe.addEvent(new NEvent(en, attr.value.trim()));
//             } else {
//                 let isExpr:boolean = false;
//                 let v = attr.value.trim();
//                 if (v !== '') {
//                     let ra = this.compileExpression(v);
//                     if (Util.isArray(ra)) {
//                         oe.setProp(attr.name, ra,true);
//                         isExpr = true;
//                     }
//                 }
//                 if (!isExpr) {
//                     oe.setProp(attr.name, v);
//                 }
//             }
//         }
//         //处理属性
//         for(let attr of directives){
//             new Directive(attr.name.substr(2), attr.value.trim(),oe,null,true);
//         }
//         if(directives.length>1){
//             //指令排序
//             oe.directives.sort((a, b) => {
//                 return a.type.prio - b.type.prio;
//             });    
//         }
//     }
//     /**
//      * 处理子节点
//      * @param oe 新建的虚拟dom
//      * @param el 待处理的html element
//      */
//     public static handleChildren(oe:Element,el:HTMLElement){
//         //子节点编译
//         for(let i=0;i<el.childNodes.length;i++){
//             let nd = el.childNodes[i];
//             let o = this.compileDom(nd);
//             if(o){
//                 if(o.tagName && oe.isSvgNode){ //设置svg对象
//                     o.isSvgNode = true;
//                 }
//                 oe.children.push(o);
//             }
//         }
//     }
//     /**
//      * 处理表达式串
//      * @param exprStr   含表达式的串
//      * @return          处理后的字符串和表达式数组
//      */
//     private static compileExpression(exprStr:string):string|any[] {
//         if (/\{\{.+?\}\}/.test(exprStr) === false) {
//             return exprStr;
//         }
//         let reg:RegExp = /\{\{.+?\}\}/g;
//         let retA = new Array();
//         let re:RegExpExecArray;
//         let oIndex:number = 0;
//         while ((re = reg.exec(exprStr)) !== null) {
//             let ind = re.index;
//             //字符串
//             if (ind > oIndex) {
//                 let s = exprStr.substring(oIndex, ind);
//                 retA.push(s);
//             }
//             //实例化表达式对象
//             let exp = new Expression(re[0].substring(2, re[0].length - 2));
//             //加入工厂
//             retA.push(exp);
//             oIndex = ind + re[0].length;
//         }
//         //最后的字符串
//         if (oIndex < exprStr.length - 1) {
//             retA.push(exprStr.substr(oIndex));
//         }
//         return retA;
//     }
// }
