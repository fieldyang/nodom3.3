import { NFactory } from "./factory";
import { Module } from "./module";

export class DirectiveFactory extends NFactory {
    private paramMap:Map<number,any>;
    constructor(module:Module){
        super(module);
        this.paramMap = new Map();
    }

    /**
     * 设置指令参数
     * @param directiveId   指令id
     * @param name          参数名
     * @param value         参数值
     */
    setParam(directiveId:number,name:string,value:any){
        let obj = this.paramMap.get(directiveId);
        if(!obj){
            obj = {};
            this.paramMap.set(directiveId,obj);
        }
        obj[name] = value;
    }

    /**
     * 获取指令参数
     * @param directiveId   指令id
     * @param name          参数名
     * @returns             参数值
     */
    getParam(directiveId:number,name:string):any{
        let obj = this.paramMap.get(directiveId);
        if(!obj){
            return;
        }
        return obj[name];
    }

    /**
     * 移除参数
     * @param directiveId   指令id
     * @param name          参数名
     * @returns 
     */
    removeParam(directiveId:number,name:string){
        let obj = this.paramMap.get(directiveId);
        if(!obj){
            return;
        }
        delete obj[name];
    }
}
