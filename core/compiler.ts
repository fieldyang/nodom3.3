import { DirectiveElementManager } from "./directiveelementmanager";
import { Directive } from "./directive";
import { VirtualDom } from "./virtualdom";
import { NError } from "./error";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";

export class Compiler {
    /**
     * element Id
     */
    private elementId:number;

    /**
     * 模块
     */
    private module:Module;

    /**
     * 构造器
     * @param module 
     */
    constructor(module:Module){
        this.elementId = 0;
        this.module = module;
    }
    /**
    * 编译
    * @param elementStr     待编译html串
    * @returns              虚拟dom
    */
    public compile(elementStr: string): VirtualDom {
        return this.compileTemplate(elementStr);
    }

    /**
     * 编译模版串
     * @param srcStr    源串
     * @returns         
     */
    private compileTemplate(srcStr:string):VirtualDom{
        // 清理comment
        let regExp = /\<\!\-\-[\s\S]*?\-\-\>/g;
        srcStr = srcStr.replace(regExp,'');
        //不可见字符正则式
        const regSpace = /^[\s\n\r\t\v]+$/;
        // 1 识别标签
        regExp = /(?<!{{[^}}]*)(?:<(\/?)\s*?([a-zA-Z][a-zA-Z0-9-_]*)([\s\S]*?)(\/?)(?<!=)>)(?![^{{]*}})/g;
        let st = 0;
        //标签串数组,含开始和结束标签
        let tagStack = [];
        //独立文本串数组，对应需要的标签串前面
        let textStack = [];
        //pre标签标志
        let isPreTag:boolean = false;
        let r;
        while((r = regExp.exec(srcStr)) !== null){
            tagStack.push(r[0]);
            //处理标签之间的文本
            let tmp='';
            if(st < r.index-1){
                tmp = srcStr.substring(st,r.index);
                //全为不可见字符，则保存空字符串
                if(!isPreTag && regSpace.test(tmp)){ 
                    tmp = '';
                }
            }
            textStack.push(tmp);
            st = regExp.lastIndex;
        }
        // 标签名数组
        let tagNames = [];
        // 标签对象数组
        let tagObjs:VirtualDom[] = [];
        // 根节点
        let root:VirtualDom;
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
                    chds = (tobj.children||[]).concat(chds);
                    chds.unshift(tobj);
                }
                //找到节点
                if(stg === etg){
                    // 添加到父节点
                    let po = tagObjs.pop();
                    po.children = (po.children||[]).concat(chds);
                    this.handleSlot(po);
                    if(tagObjs.length>0){
                        tagObjs[tagObjs.length-1].add(po);
                    }
                    if(isPreTag && etg === 'pre'){
                        isPreTag = false;
                    }
                }else{
                    throw new NError('wrongTemplate');
                }
            }else { //标签头
                //去掉标签前后< >
                let tmpS = tag.endsWith('\/>')?tag.substring(1,tag.length-2):tag.substring(1,tag.length-1);
                //处理标签头，返回dom节点和原始标签名
                const[dom,tagName] = this.handleTag(tmpS.trim());
                //设置pre标签标志
                if(tagName === 'pre'){
                    isPreTag = true;
                }
                //前一个文本节点存在，则作为前一个节点的孩子
                if(ii>0 && textStack[ii] !== ''){
                    tagObjs[tagObjs.length-1].add(this.handleText(textStack[ii]));
                    textStack[ii] = '';
                }
                if(!tag.endsWith('\/>')){ // 非自闭合
                    //标签头入栈
                    tagNames.push(tagName);
                    tagObjs.push(dom);
                }else{ //自闭合，直接作为前一个的孩子节点
                    if(tagObjs.length>0){
                        if(tagObjs[tagObjs.length-1].children){
                            tagObjs[tagObjs.length-1].children.push(dom);
                        }else{
                            tagObjs[tagObjs.length-1].children = [dom];
                        }
                    }
                }
                //设置根节点
                if(!root){
                    root = dom;
                }
            }
        });
        
        if(tagNames.length>0){
            throw new NError('wrongTempate');
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
        let ele:VirtualDom;
        //字符串和表达式替换
        const reg = /('[\s\S]*?')|("[\s\S]*?")|(`[\s\S]*?`)|({{[\S\s]*?\}{0,2}\s*}})|([\w$-]+(\s*=)?)/g;
        let pName:string;
        //标签原始名
        let tagName:string;
        let startValue:boolean;
        let r:RegExpExecArray;
        let allModelField:boolean = true;
        //属性名正则式
        const regName = /[a-zA-Z$_]\S*/;
        while((r=reg.exec(tagStr))!==null){
            let s = r[0];
            if(regName.test(s)){ //属性名
                if(!tagName){
                    tagName = s;
                    ele = new VirtualDom(tagName,me.genKey());
                }else if(s.endsWith('=')) { //带等号
                    if(pName){  //前一个属性名存在，设置空值
                        setValue();
                    }
                    pName = s.substring(0,s.length-1).trim();
                    startValue = true; 
                }else if(!pName){ //不带等号
                    pName = s;
                }else if(startValue){  //属性名存在，设置属性值
                    setValue(s);
                }
            }else{ //属性值
                if(pName && startValue){
                    setValue(s);
                }
            }
        }
        //存在空属性
        if(pName){
            setValue();
        }
        
        //后置处理
        this.postHandleNode(ele);
        ele.sortDirective();
        ele.allModelField = allModelField;
        return [ele,tagName];

        /**
         * 设置属性值
         * @param value     属性值
         */
        function setValue(value?:any){
            if(value){
                let r;
                //去掉字符串两端
                if(((r=/((?<=^')(.*?)(?='$))|((?<=^")(.*?)(?="$)|((?<=^`)(.*?)(?=`$)))/.exec(value)) !== null)){
                    value = r[0].trim();
                }
                //表达式编译
                if(/^\{\{[\S\s]*\}\}$/.test(value)){
                    value = me.compileExpression(value,ele)[0];
                    allModelField = value.allModelField;
                }
            }
            //指令
            if (pName.startsWith("x-")) {
                //不排序
                ele.addDirective(new Directive(pName.substr(2), value));
            } else if (pName.startsWith("e-")) { //事件
                ele.addEvent(new NEvent(pName.substr(2), value));
            } else { //普通属性
                ele.setProp(pName, value);
            }
            pName=undefined;
            startValue=false;
        }
    }

    /**
     * 处理模块子节点为slot节点
     * @param dom   dom节点
     */
    private handleSlot(dom:VirtualDom){
        if(dom.hasDirective('module')){ //po为子模块，其所有子模块判断是否加上slot
            let slotCt:VirtualDom;
            for(let j=0;j<dom.children.length;j++){
                let c = dom.children[j];
                if(c.hasDirective('slot')){ //带slot的不处理
                    continue;
                }
                if(!slotCt){//第一个直接被slotCt替换
                    slotCt = new VirtualDom('div',this.genKey());
                    slotCt.addDirective(new Directive('slot',null));
                    //当前位置，用slot替代
                    dom.children.splice(j,1,slotCt);
                }else{
                    //直接删除
                    dom.children.splice(j--,1);
                }
                slotCt.add(c);
            }
        }
    }

    /**
     * 编译txt为文本节点
     * @param txt 文本串
     */
    private handleText(txt:string) {
        let ele = new VirtualDom(null,this.genKey());
        txt = this.preHandleText(txt);
        if(/\{\{[\s\S]+\}\}/.test(txt)){  //检查是否含有表达式
            ele.expressions = <any[]>this.compileExpression(txt,ele);
        }else{
            ele.textContent = txt;
        }
        return ele;
    }
    /**
     * 处理表达式串
     * @param exprStr   含表达式的串
     * @return          处理后的字符串和表达式数组
     */
    public compileExpression(exprStr: string,dom:VirtualDom):string|any[]{
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
            let exp = new Expression(this.module,re[0].substring(2, re[0].length - 2));
            dom.allModelField = exp.allModelField;
            //加入数组
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
    private postHandleNode(node:VirtualDom){
        // 模块类判断
        if (ModuleFactory.hasClass(node.tagName)) {
            node.addDirective(new Directive('module',node.tagName));
            node.tagName = 'div';
        }else if(DirectiveElementManager.has(node.tagName)){ //自定义元素
            let clazz = DirectiveElementManager.get(node.tagName);
            Reflect.construct(clazz,[node,this.module]);
        }
    }

    /**
     * 预处理html保留字符 如 &nbsp;,&lt;等
     * @param str   待处理的字符串
     * @returns     解析之后的串
     */
    private preHandleText(str: string): string {
        let reg = /&[a-z]+;/;
        if(reg.test(str)){
            let div = document.createElement('div');
            div.innerHTML = str;
            return div.textContent;
        }
        return str;
    }

    /**
     * 产生可以
     * @returns     key
     */
    private genKey():string{
        // return this.module.id + '_' + this.elementId++;
        return this.elementId++ + '';
    }
}
