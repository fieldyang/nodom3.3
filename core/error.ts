import { NodomMessage } from "./nodom";
import { Util } from "./util";

/**
 * 异常处理类
 * @since       1.0.0
 */
export  class NError extends Error{
    constructor(errorName:string,p1?:string,p2?:string,p3?:string,p4?:string){
        super(errorName);
        let msg:string = NodomMessage.ErrorMsgs[errorName];
        if(msg === undefined){
            this.message = "未知错误";
            return;
        }
        //复制请求参数
        let params:Array<string> = [msg];
        for(let i=1;i<arguments.length;i++){
            params.push(arguments[i]);
        }
        this.message = Util.compileStr.apply(null,params);
    }
}
