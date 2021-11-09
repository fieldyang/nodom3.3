import { Directive } from "./directive";
import { DirectiveElementManager } from "./directiveelementmanager";
import { NError } from "./error";
import { NEvent } from "./event";
import { Expression } from "./expression";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { VirtualDom } from "./virtualdom";

export class Compiler {
    /**
     * element Id
     */
    private elementId: number;

    /**
     * 模块
     */
    private module: Module;

    /**
     * 构造器
     * @param module 
     */
    constructor(module: Module) {
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
        const me = this;
        // 清理comment
        const regExp = /\<\!\-\-[\s\S]*?\-\-\>/g;
        srcStr = srcStr.replace(regExp,'');
        
        // 正则式分解标签和属性
        const regTag = /((?<!\\)'[\s\S]*?(?<!\\)')|((?<!\\)"[\s\S]*?(?<!\\)")|((?<!\\)`[\s\S]*?(?<!\\)`)|({{[\S\s]*?\}{0,2}\s*}})|([\w$-]+(\s*=)?)|(<\s*[a-zA-Z][a-zA-Z0-9-_]*)|(\/?>)|(<\/\s*[a-zA-Z][a-zA-Z0-9-_]*>)/g;
        
        //dom数组
        let domArr = [];
        
        //已闭合的tag，与domArr对应
        let closedTag = [];

        //标签结束的index
        let lastIndex = 0;
        
        //属性值
        let propName:string;
        //属性名正则式
        const propReg = /^[a-zA-Z_$][$-\w]*?\s*?=?$/;
        //pre标签标志
        let isPreTag:boolean = false;
        
        //当前dom节点
        let dom;
        //正则式匹配结果
        let r;
        while((r = regTag.exec(srcStr)) !== null){
            let re = r[0];
            if(re[0] === '<'){ //标签
                //处理文本
                let txt = this.handleText(srcStr.substring(lastIndex,r.index),isPreTag);
                if(txt){
                    domArr.push(txt);
                    closedTag.push(false);
                }
                if(re[1] === '/'){ //标签结束
                    finishTag(re);
                }else{ //标签开始
                    let tagName = re.substr(1).trim();
                    isPreTag = (tagName.toLowerCase() === 'pre');
                    //新建dom节点
                    dom = new VirtualDom(tagName,this.genKey());    
                    domArr.push(dom);
                    closedTag.push(false);
                }
            }else if(re === '>'){ //标签头结束
                finishTagHead();
            }else if(re === '/>'){ //标签结束
                finishTag();
            }else if(dom){ //属性
                if(propReg.test(re)){
                    if(propName){ //propName=无值 情况，当无值处理
                        handleProp();
                    }
                    if(re.endsWith('=')){ //属性带=，表示后续可能有值
                        propName = re.substring(0,re.length-1).trim();
                    }else{ //只有属性，无属性值
                        propName = re;
                        handleProp();
                    }
                }else if(propName){ //属性值
                    handleProp(re);
                }
            }
        }
        return domArr[0];

        /**
         * 标签结束
         * @param ftag      结束标签
         */
        function finishTag(ftag?:string){
            if(ftag){
                let tag = ftag.substring(2,ftag.length-1).toLowerCase();
                let finded = false;
                //反向查找
                for(let i=domArr.length-1;i>=0;i--){
                    if(!closedTag[i] && domArr[i].tagName && domArr[i].tagName.toLowerCase() === tag){
                        domArr[i].children = domArr.slice(i+1);
                        //删除后续节点
                        domArr.splice(i+1);
                        //标注该节点已闭合
                        closedTag.splice(i+1);
                        finded = true;
                        break;
                    }
                }
                if(!finded){
                    throw new NError('wrongTemplate');
                }
            }
            //设置标签关闭
            let ele = domArr[domArr.length-1];
            closedTag[closedTag.length-1] = true;
            me.postHandleNode(ele);
            ele.sortDirective();
            me.handleSlot(ele);
            dom = undefined;
            propName = undefined;
            lastIndex = regTag.lastIndex;
            // ele.allModelField = allModelField;    
        }

        /**
         * 标签头结束
         */
        function finishTagHead(){
            if(dom){
                lastIndex = regTag.lastIndex;
            }
            dom = undefined;
            propName = undefined;
        }

        /**
         * 处理属性
         * @param value     属性值
         */
        function handleProp(value?:any){
            if(!dom || !propName){
                return;
            }
            let allModelField:boolean;
            if(value){
                let r;
                //去掉字符串两端
                if (((r = /((?<=^')(.*?)(?='$))|((?<=^")(.*?)(?="$)|((?<=^`)(.*?)(?=`$)))/.exec(value)) !== null)) {
                    value = r[0].trim();
                }
                //表达式编译
                if(/^\{\{[\S\s]*\}\}$/.test(value)){
                    value = me.compileExpression(value,dom)[0];
                    allModelField = value.allModelField;
                }
            }
            //指令
            if (propName.startsWith("x-")) {
                //不排序
                dom.addDirective(new Directive(propName.substr(2), value));
            } else if (propName.startsWith("e-")) { //事件
                dom.addEvent(new NEvent(propName.substr(2), value));
            } else { //普通属性
                dom.setProp(propName, value);
            }
            propName = undefined;
        }
    }
    
    
    /**
     * 处理模块子节点为slot节点
     * @param dom   dom节点
     */
    private handleSlot(dom:VirtualDom){
        if(!dom.children || dom.children.length === 0 || !dom.hasDirective('module')){
            return;
        }
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

    /**
     * 编译txt为文本节点
     * @param txt 文本串
     * @param isPre     是否
     */
    private handleText(txt:string,isPre:boolean):VirtualDom {
        let ele;
        if(!isPre){
            txt = txt.trim();
            if(txt === ''){
                return;
            }
            ele = new VirtualDom(null,this.genKey());
            txt = this.preHandleText(txt);
            if(/\{\{[\s\S]+\}\}/.test(txt)){  //检查是否含有表达式
                ele.expressions = <any[]>this.compileExpression(txt,ele);
            }else{
                ele.textContent = txt;
            }
        }else{
            ele = new VirtualDom(null,this.genKey());
            ele.textContent = txt;
        }
        return ele;
    }
    /**
     * 处理表达式串
     * @param exprStr   含表达式的串
     * @return          处理后的字符串和表达式数组
     */
    public compileExpression(exprStr: string, dom: VirtualDom): string | any[] {
        if (!exprStr) {
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
            let exp = new Expression(this.module, re[0].substring(2, re[0].length - 2));
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
    private postHandleNode(node: VirtualDom) {
        // 模块类判断
        if (ModuleFactory.hasClass(node.tagName)) {
            console.log('module',node.tagName)
            node.addDirective(new Directive('module',node.tagName));
            node.tagName = 'div';
        } else if (DirectiveElementManager.has(node.tagName)) { //自定义元素
            let clazz = DirectiveElementManager.get(node.tagName);
            Reflect.construct(clazz, [node, this.module]);
        }
    }

    /**
     * 预处理html保留字符 如 &nbsp;,&lt;等
     * @param str   待处理的字符串
     * @returns     解析之后的串
     */
    private preHandleText(str: string): string {
        let reg = /&[a-z]+;/;
        if (reg.test(str)) {
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
    private genKey(): string {
        // return this.module.id + '_' + this.elementId++;
        return this.elementId++ + '';
    }
}
