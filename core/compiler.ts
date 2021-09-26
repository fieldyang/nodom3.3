import { DefineElementManager } from "./defineelementmanager";
import { Directive } from "./directive";
import { Element } from "./element";
import { NError } from "./error";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";

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
        return this.compileTemplate(elementStr);
    }

    /**
     * 编译模版串
     * @param srcStr    源串
     * @returns         
     */
    private compileTemplate(srcStr:string):Element{
        const me = this;
        // 清理comment
        let regExp = /\<\!\-\-[\s\S]*?\-\-\>/g;
        srcStr = srcStr.replace(regExp,'');
        //不可见字符正则式
        const regSpace = /^[\s\n\r\t\v]+$/;
        // 1 识别标签
        regExp = /(?<!\{\{[^<}}]*)(?:<(\/?)\s*?([a-zA-Z][a-zA-Z0-9-_]*)([\s\S]*?)(\/?)(?<!=)>)(?![^>{{]*?\}\})/g;
        let st = 0;
        //标签串数组,含开始和结束标签
        let tagStack = [];
        //独立文本串数组，对应需要的标签串前面
        let textStack = [];
        let r;
        while((r = regExp.exec(srcStr)) !== null){
            tagStack.push(r[0]);
            //处理标签之间的文本
            let tmp='';
            if(st < r.index-1){
                tmp = srcStr.substring(st,r.index);
                //全为不可见字符，则保存空字符串
                if(regSpace.test(tmp)){ 
                    tmp = '';
                }
            }
            textStack.push(tmp);
            st = regExp.lastIndex;
        }

        // 标签名数组
        let tagNames = [];
        // 标签对象数组
        let tagObjs = [];
        // 根节点
        let root:Element;
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
                        chds.push(this.handleText(textStack[i]));
                        // 文本已使用，置为空
                        textStack[i] = '';
                    }
                    if((stg = tagNames.pop())===etg){
                        break;
                    }
                    //当前节点及其子节点同时作为孩子节点
                    let tobj = tagObjs.pop();
                    chds = tobj.children.concat(chds);
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
                //处理标签头，返回dom节点和原始标签名
                const[dom,tagName] = this.handleTag(tmpS.trim());

                //前一个文本节点存在，则作为前一个节点的孩子
                if(ii>0 && textStack[ii] !== ''){
                    tagObjs[tagObjs.length-1].children.push(this.handleText(textStack[ii]));
                    textStack[ii] = '';
                }
                if(!tag.endsWith('\/>')){ // 非自闭合
                    //标签头入栈
                    tagNames.push(tagName);
                    tagObjs.push(dom);
                }else{ //自闭合，直接作为前一个的孩子节点
                    if(tagObjs.length>0){
                        tagObjs[tagObjs.length-1].children.push(dom);
                    }
                }
                //设置根节点
                if(!root){
                    root = dom;
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
     * @returns         [虚拟dom节点,原始标签名]
     */
    private handleTag(tagStr:string):any{
        const me = this;
        let ele:Element;
        //字符串和表达式替换
        let reg = /('[\s\S]*?')|("[\s\S]*?")|(`[\s\S]*?`)|({{[\S\s]*?\}{0,2}\s*}})/g;
        let pName:string;
        //标签原始名
        let tagName:string;
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
        //后置处理
        this.postHandleNode(ele);
        //指令排序
        if(ele.directives && ele.directives.length>1){
            ele.directives.sort((a, b) => {
                return a.type.prio - b.type.prio;
            });
        }
        
        return [ele,tagName];

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
                    ele = new Element(tagName,me.genKey());
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
                if(((r=/((?<=^')(.*?)(?='$))|((?<=^")(.*?)(?="$)|((?<=^`)(.*?)(?=`$)))/.exec(value)) !== null)){
                    value = r[0].trim();
                }
                
                //表达式编译
                if(/^\{\{[\S\s]*\}\}$/.test(value)){
                    value = me.compileExpression(value)[0];
                }
            }
            
            //指令
            if (pName.startsWith("x-")) {
                //不排序
                new Directive(pName.substr(2), value, ele,me.module, true);
            } else if (pName.startsWith("e-")) { //事件
                ele.addEvent(new NEvent(pName.substr(2), value,null,me.currentId++));
            } else { //普通属性
                ele.setProp(pName, value);
            }
            pName=undefined;
            startValue=false;
        }
    }

    /**
     * 编译txt为文本节点
     * @param txt 文本串
     */
    private handleText(txt:string) {
        let ele = new Element(null,this.genKey());
        if(/\{\{[\s\S]+\}\}/.test(txt)){  //检查是否含有表达式
            ele.expressions = <any[]>this.compileExpression(txt);
        }else{
            ele.textContent = txt;
        }
        return ele;
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
    private compileTemplateToAst(elementStr: string): Element {
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
        let root: Element;
        let tag;
        let preFlag = false;
        while ((tag = tagReg.exec(rest)) != null) {
            if (index <= tag.index) {
                let word = rest.substring(index, tag.index);
                if (!/^\s*$/.test(word) || preFlag) {
                    // stack1[stack1.length - 1].children.push({ textContent: word });
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
    private compilerStartTagToAST(startTag, stack1) {
        let [, , tagName, attrString, selfCloseStr] = startTag;
        let newEl = new Element(tagName, this.genKey());
        this.handleAstAttrs(newEl, this.parseAttrString(attrString), this.module);
        this.preHandleNode(newEl);
        //指令排序
        if (newEl.directives && newEl.directives.length > 1) {
            newEl.directives.sort((a, b) => {
                return a.type.prio - b.type.prio;
            });
        }
        if (selfCloseStr == '/') {
            // 这个标签是自闭合标签
            if (stack1.length > 0) {
                stack1[stack1.length - 1].children.push(newEl)
            }

        } else {
            // AST入栈
            stack1.push(newEl);
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
    private compilerEndTagToAST(endTag, stack1): Element {
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
     * 后置处理
     * 包括：模块类元素、自定义元素
     * @param node  虚拟dom节点
     */
    private postHandleNode(node:Element){
        // 模块类判断
        if (ModuleFactory.hasClass(node.tagName)) {
            new Directive('module',node.tagName,node,this.module);
            node.tagName = 'div';
        }else if(DefineElementManager.has(node.tagName)){ //自定义元素
            let clazz = DefineElementManager.get(node.tagName);
            Reflect.construct(clazz,[node,this.module]);
        }
    }

    /**
     * 产生可以
     * @returns     key
     */
    private genKey():string{
        // return this.module.id + '_' + this.currentId++;
        return this.currentId++ + '';
    }
}
