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
     * 编译模版串
     * @param srcStr    源串
     * @returns         
     */
    public static compileTemplateToAst(srcStr:string):ASTObj{
        const me = this;
        // 清理comment
        let regExp = /\<\!\-\-[\s\S]*\-\-\]>/;
        srcStr = srcStr.replace(regExp,'');
        // 1 识别标签
        regExp = /(?<!{{[^<}]*)(?:<(\/?)\s*?([a-zA-Z][a-zA-Z0-9-_]*)([\s\S]*?)(\/?)(?<!=)>)(?![^<{]*}})/g;
        let st = 0;
        //标签串数组,含开始和结束标签
        let tagStack = [];
        //独立文本串数组，对应需要的标签串前面
        let textStack = [];
        let r;
        while((r = regExp.exec(srcStr)) !== null){
            tagStack.push(r[0]);
            //处理标签之间的文本
            if(st < r.index-1){
                textStack.push(srcStr.substring(st,r.index));
            }else{
                textStack.push('');
            }
            st = regExp.lastIndex;
        }

        // 标签名数组
        let tagNames = [];
        // 标签对象数组
        let tagObjs = [];
        // 根节点
        let root:ASTObj;
        tagStack.forEach((tag,ii)=>{
            //开始标签名
            let stg;
            if(tag.startsWith('</')){ //结束标签
                let etg = tag.substring(2,tag.length-1).trim();
                let chds = [];
                //找到对应此结束标签的开始标签
                for(let i=ii;tagNames.length>0;i--){
                    // 结束标签前面的非空文本节点作为孩子
                    if(i>=0 && textStack[i] !== ''){
                        chds.push({textContent:textStack[i]});
                        // 文本已使用，置为空
                        textStack[i] = '';
                    }
                    if((stg = tagNames.pop())===etg){
                        break;
                    }
                    // 标签节点作为孩子
                    let tobj = tagObjs.pop();
                    //把孩子节点改为兄弟节点
                    for(;tobj.children.length>0;){
                        let o = tobj.children.pop();
                        chds.unshift(o);
                    }
                    chds.unshift(tobj);
                }
                //找到节点
                if(stg === etg){
                    // 添加到父节点
                    let po = tagObjs.pop();
                    po.children = po.children.concat(chds);
                    if(tagObjs.length>0){
                        tagObjs[tagObjs.length-1].children.push(po);
                    }
                }else{
                    throw '模版格式错误';
                }
            }else { //标签头
                //去掉标签前后< >
                let tmpS = tag.endsWith('\/>')?tag.substring(1,tag.length-2):tag.substring(1,tag.length-1);
                let obj = this.handleTagAttr(tmpS.trim());
                //前一个文本节点存在，则作为前一个节点的孩子
                if(ii>0 && textStack[ii] !== ''){
                    tagObjs[tagObjs.length-1].children.push({
                        textContent:textStack[ii]
                    });
                    textStack[ii] = '';
                }
                if(!tag.endsWith('\/>')){ // 非自闭合
                    //标签头入栈
                    tagNames.push(obj.tagName);
                    tagObjs.push(obj);
                }else{ //自闭合，直接作为前一个的孩子节点
                    if(tagObjs.length>0){
                        tagObjs[tagObjs.length-1].children.push(obj);
                    }
                }
                //设置根节点
                if(!root){
                    root = obj;
                }
            }
        });
        if(tagNames.length>0){
            throw '模版定义错误';
        }
        return root;
    }
    
    /**
     * 处理标签属性
     * @param tagStr    标签串
     * @returns 
     */
    private static handleTagAttr(tagStr:string):ASTObj{
        const me = this;
        //字符串和表达式替换
        let reg = /('[\s\S]*')|("[\s\S]*")|(`[\s\S]*`)|({{[\S\s]*?\}{0,2}\s*}})/g;
        let tagName:string;
        let attrs = new Map;
        let pName:string;
        let startValue:boolean;
        let finded:boolean = false; //是否匹配了有效的reg
        let st = 0;
        let r;
        while((r=reg.exec(tagStr))!==null){
            if(r.index>st){
                let tmp = tagStr.substring(st,r.index).trim();
                if(tmp === ''){
                    continue;
                }
                finded = true;
                handle(tmp);
                if(startValue){
                    setValue(r[0]);
                }
                st = reg.lastIndex;
            }
            st = reg.lastIndex;
        }
        if(!finded){
            handle(tagStr);
        }
        return{
            tagName:tagName,
            attrs:attrs,
            children:[]
        }

        /**
         * 处理串（非字符串和表达式）
         * @param s 
         */
        function handle(s){
            let reg = /([^ \f\n\r\t\v=]+)|(\=)/g;
            let r;
            while((r=reg.exec(s))!== null){
                if(!tagName){
                    tagName = r[0];
                }else if(!pName){
                    pName = r[0];
                }else if(startValue){
                    setValue(r[0]);
                }else if(pName && r[0] === '='){
                    startValue = true;
                }else if(pName && !startValue){ //无值属性
                    setValue();
                    pName=r[0];
                }
            }
            //只有名无值
            if(pName && !startValue){
                setValue();
            }
        }

        /**
         * 设置属性值
         * @param value     属性值
         */
        function setValue(value?:any){
            //属性名判断
            if(!/^[A-Za-z][\w\d-]*$/.test(pName)){
                return;
            }
            if(value){
                let r;
                //去掉字符串两端
                if(((r=/(?<!['`"])[\s\S]*(?:['`"])/.exec(value)) !== null)){
                    value = r[0].trim();
                }
                
                //表达式编译
                if(/^\{\{[\S\s]*\}\}$/.test(value)){
                    value = me.compileExpression(value)[0];
                }
            }
            attrs.set(pName,value);
            pName=undefined;
            startValue=false;
        }
    }
    /**
     * 把AST编译成虚拟dom
     * @param oe 虚拟dom的根容器
     * @param ast 抽象语法树也就是JSON对象
     * @returns oe 虚拟dom的根容器
     */
    public static compileAST(oe: Element, ast: ASTObj): Element {
        if (!ast) return;
        ast.tagName?this.handleAstNode(oe, ast):this.handleAstText(oe, ast);
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
        if(/\{\{[\s\S]+\}\}/.test(astObj.textContent)){
            text.expressions = <any[]>this.compileExpression(astObj.textContent);
        }else{
            text.textContent = astObj.textContent;
        }
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
        for(let a of astObj.children){
            this.compileAST(child, a);
        }
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
                let o = {
                    name:attr[0].substr(2),
                    value:attr[1]
                }
                directives.push(o);
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
                let value = attr[1].substring(2, attr[1].length - 2);
                // 变量别名，变量名（原对象.变量名)，双向绑定标志
                let data = [value, bindFlag];
                oe.datas[name] = data;
            } else {
                oe.setProp(attr[0], attr[1],attr[1] instanceof Expression);
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
     * 处理表达式串
     * @param exprStr   含表达式的串
     * @return          处理后的字符串和表达式数组
     */
    public static compileExpression(exprStr: string):string|any[]{
        if(!exprStr){
            return;
        }
        let reg: RegExp = /\{\{[\s\S]+?\}?\s*\}\}/g;
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
