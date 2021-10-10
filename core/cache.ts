/**
 * 存储
 */
export class NCache{
    private cacheData:any;

    constructor(){
        this.cacheData = {};
    }

    /**
     * 从cache
     * @param key   键，支持"."
     * @reutrns     值或undefined
     */
    public get(key:string){
        let p = this.cacheData;
        if(key.indexOf('.') !== -1){
            let arr = key.split('.');
            if(arr.length>1){
                for(let i=0;i<arr.length-1 && p;i++){
                    p = p[arr[i]];
                }
                if(p){
                    key = arr[arr.length-1];
                }
            }
        }
        if(p){
            return p[key];
        }
    }

    /**
     * 保存值
     * @param key       键 
     * @param value     值
     */
    public set(key:string,value:any){
        let p = this.cacheData;
        if(key.indexOf('.') !== -1){
            let arr = key.split('.');
            if(arr.length>1){
                for(let i=0;i<arr.length-1;i++){
                    if(!p[arr[i]] || typeof p[arr[i]] !== 'object'){
                        p[arr[i]] = {};
                    }
                    p = p[arr[i]];        
                }
                key = arr[arr.length-1];
            }
        }
        
        if(p){
            p[key] = value;
        }
    }

    /**
     * 移除键
     * @param key   键 
     */
    public remove(key:string){
        let p = this.cacheData;
        if(key.indexOf('.') !== -1){
            let arr = key.split('.');
            if(arr.length>1){
                for(let i=0;i<arr.length-1 && p;i++){
                    p = p[arr[i]];
                }
                if(p){
                    key = arr[arr.length-1];
                }
            }
        }
        
        if(p){
            delete p[key];
        }       
    }
}