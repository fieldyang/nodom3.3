import { VirtualDom } from "./virtualdom";
/**
 * 比较器
 */
export class DiffTool{
    /**
     * 比较节点
     * @param src           待比较节点（渲染后节点）
     * @param dst 	        被比较节点
     * @param changeArr     增删改的节点数组
     * @returns	            [[type(add 1, upd 2,del 3,move 4 ,rep 5),dom(操作节点),dom1(被替换或修改节点),parent(父节点),loc(位置)]]
     */
    public static compare(src:any,dst:any,changeArr:Array<any>) {
        if (!src.tagName) { //文本节点
            if (!dst.tagName) {
                if ((src.staticNum || dst.staticNum) && src.textContent !== dst.textContent) {
                    addChange(2,src,null,dst.parent);
                }
            } else { //节点类型不同
                addChange(5,src,null, dst.parent);
            }
        } else { //element节点
            if (src.tagName !== dst.tagName) { //节点类型不同
                addChange(5,src,null, dst.parent);
            }else if(src.staticNum || dst.staticNum){ //节点类型相同，但有一个不是静态节点，进行属性和asset比较
                let change = false;
                for(let p of ['props','assets']){
                    //属性比较
                    if(src[p] && dst[p] || src[p] && !dst[p]){
                        change = true;
                    }else if(src[p] && dst[p]){
                        if(Object.keys(src[p]).length !== Object.keys(dst[p]).length){
                            change = true;
                        }else{
                            for(let k in src[p]){
                                if(src[p][k] !== dst[p][k]){
                                    change = true;
                                    break;
                                }
                            }
                        }
                    }
                    if(change){
                        addChange(2,src,null,dst.parent);    
                    }
                }
            }
        }
        if(src.staticNum>0){
            src.staticNum--;
        }
        
        //子节点处理
        if (!src.children || src.children.length === 0) {
            // 旧节点的子节点全部删除
            if (dst.children && dst.children.length > 0) {
                dst.children.forEach(item => addChange(3,item,null,dst));
            }
        } else {
            //全部新加节点
            if (!dst.children || dst.children.length === 0) {
                src.children.forEach(item => addChange(1, item,null, dst));
            } else { //都有子节点
                //存储比较后需要add的key
                let addObj={};
                //子节点对比策略
                let [oldStartIdx, oldStartNode, oldEndIdx, oldEndNode] = [0, dst.children[0], dst.children.length - 1, dst.children[dst.children.length - 1]];
                let [newStartIdx, newStartNode, newEndIdx, newEndNode] = [0, src.children[0], src.children.length - 1, src.children[src.children.length - 1]];
                while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
                    if (sameKey(oldStartNode, newStartNode)) {
                        DiffTool.compare(newStartNode,oldStartNode, changeArr);
                        newStartNode = src.children[++newStartIdx];
                        oldStartNode = dst.children[++oldStartIdx];
                    } else if (sameKey(oldEndNode, newEndNode)) {
                        DiffTool.compare(newEndNode,oldEndNode, changeArr);
                        newEndNode = src.children[--newEndIdx];
                        oldEndNode = dst.children[--oldEndIdx];
                    } else if (sameKey(newStartNode, oldEndNode)) {
                        //新前旧后
                        DiffTool.compare(newStartNode,oldEndNode, changeArr);
                       //跳过插入点会提前移动的节点
                        while(addObj.hasOwnProperty(oldStartNode.key)){
                            changeArr[addObj[oldStartNode.key]][0] = 4;
                            delete addObj[oldStartNode.key];
                            oldStartNode = dst.children[++oldStartIdx];
                        }
                         //接在待操作老节点前面
                        addChange(4,oldEndNode,  oldStartNode,dst);
                        newStartNode = src.children[++newStartIdx];
                        oldEndNode = dst.children[--oldEndIdx];
                    } else if (sameKey(newEndNode, oldStartNode)) {
                        DiffTool.compare(newEndNode,oldStartNode, changeArr);
                         //跳过插入点会提前移动的节点
                        while(addObj.hasOwnProperty(oldEndNode.key)){
                            changeArr[addObj[oldEndNode.key]][0] = 4;
                            delete addObj[oldEndNode.key];
                            oldEndNode = dst.children[--oldEndIdx];
                        }
                        //接在 oldEndIdx 之后，但是再下一个节点可能移动位置，所以记录oldEndIdx节点
                        addChange(4, oldStartNode, oldEndNode,dst,1);
                        newEndNode = src.children[--newEndIdx];
                        oldStartNode = dst.children[++oldStartIdx];
                    } else {
                        //跳过插入点会提前移动的节点
                        if(addObj.hasOwnProperty(oldStartNode.key)){
                            while(addObj.hasOwnProperty(oldStartNode.key)){
                                   changeArr[addObj[oldStartNode.key]][0] = 4;
                                   delete addObj[oldStartNode.key];
                                oldStartNode = dst.children[++oldStartIdx];
                            }
                            continue;//继续diff，暂不add
                        }
                       //加入到addObj
                        addObj[newStartNode.key]= addChange(1, newStartNode, oldStartNode,dst)-1;
                        newStartNode = src.children[++newStartIdx];
                    }
                }
                //有新增或删除节点
                if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
                    if (oldStartIdx > oldEndIdx) {
                        //没有老节点
                        for (let i = newStartIdx; i <= newEndIdx; i++) {
                            // 添加到dst.children[i]前面
                            addChange(1,src.children[i], i ,dst);
                        }
                    } else {
                        //有老节点，需要删除
                        for (let i = oldStartIdx; i <= oldEndIdx; i++) {
                            let ch=dst.children[i];
                            //如果要删除的节点在addArr中，则表示move，否则表示删除
                            if(!addObj.hasOwnProperty(ch.key)){ 
                                addChange(3,ch,null,dst);
                            }else{
                                changeArr[addObj[ch.key]][0] = 4;
                            }
                        }
                    }
                }
            }
        }

        /**
         * 是否有相同key
         * @param src   源节点
         * @param dst   目标节点
         * @returns     相同key为true，否则为false
         */
        function sameKey(src:VirtualDom, dst:VirtualDom):boolean {
            return src.key === dst.key;
        }
        
        /**
         * 添加刪除替換
        * @param type       类型 add 1, upd 2,del 3,move 4 ,rep 5
        * @param dom        虚拟节点    
        * @param dom1       相对节点
        * @param parent     父节点
        * @param extra      move时 0:相对节点前，1:相对节点后
        */
        function addChange(type:number,dom: VirtualDom, dom1?: VirtualDom|number,parent?:VirtualDom,loc?:number) {
            return changeArr.push([type,dom,dom1,parent,loc]);
        }
    }
}