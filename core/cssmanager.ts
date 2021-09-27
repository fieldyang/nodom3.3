import {Module} from "./module";

/**
 * css 管理器
 * 针对不同的rule，处理方式不同
 * CSSStyleRule 进行保存和替换，同时 scopeInModule(模块作用域)有效
 * CSSImportRule 路径不重复添加，因为必须加在stylerule前面，所以需要记录最后的import索引号
 */
export class CssManager{

    /**
     * style sheet
     */
    private static sheet:any;

    /**
     * import url map，用于存储import的href路径
     */
    private static importMap = new Map();

    /**
     * importrule 位置
     */
    private static importIndex = 0;

    /**
     * 添加多个css rule
     * @param cssText           rule集合 
     * @param module            模块
     * @param scopeInModule     作用域在模块内
     */
    public static addRules(module:Module,cssText:string,scopeInModule?:boolean){
        let removeArr = [];
        let removeIndex:number;
        //sheet 初始化
        if(!this.sheet){
            //safari不支持 cssstylesheet constructor，用 style代替
            let sheet = document.createElement('style');
            document.head.appendChild(sheet);
            this.sheet = document.styleSheets[0];
        }
        

        const reg = /(@import\s+url\(.+?\))|([.#@a-zA-Z][\S\s]*?\{[\s\S]+?\})/g;
        let re;
        while((re=reg.exec(cssText)) !== null){
            if(re[0].startsWith('@import')){ //import
                handleImport(re[0]);
            }else if(re[0].startsWith('@')){ //keyframe font...
                this.sheet.insertRule(re[0]);
            }else{ //style
                handleStyle(module,re[0],scopeInModule);
            }
        }

        //清理旧name
        if(removeArr.length>0){
            for(let i=0;i<removeIndex;i++){
                let r = this.sheet.cssRules[i];
                if(r.selectorText && removeArr.indexOf(r.selectorText)){
                    this.sheet.deleteRule(i--);
                    break;
                }
            }
        }

        console.log(this.sheet.cssRules);
        
        /**
         * 
         * @param module 
         * @param cssText 
         * @param scopeInModule 
         */
        function handleStyle(module:Module,cssText:string,scopeInModule?:boolean){
            const reg = /.+(?=\{)/;
            let r = reg.exec(cssText);
            if(!r){
                return;
            }
            
            if(!removeIndex){
                removeIndex = CssManager.sheet.cssRules?CssManager.sheet.cssRules.length:0;
            }

            //前置标识
            let pre = scopeInModule?('.___module___' + module.id + ' '):'';
            
            //如果样式局部使用，则之前的名字需要移除
            if(pre !== ''){
                //移除样式名保存
                removeArr.push(pre + r[0]);
            }

            
            //加入到样式表
            CssManager.sheet.insertRule(pre + cssText,CssManager.sheet.cssRules?CssManager.sheet.cssRules.length:0);
        } 

        /**
         * 处理import
         * @param cssText 
         * @returns 
         */
        function handleImport(cssText:string){
            const reg = /(?<=\()\S+(?=\))/;
            let r;
            if((r = reg.exec(cssText))!==null){
                if(CssManager.importMap.has(r[0])){
                    return;
                }
                //插入import rule
                CssManager.sheet.insertRule(cssText,CssManager.importIndex++);
                CssManager.importMap.set(r[0],true);
            }
        }
    }
}