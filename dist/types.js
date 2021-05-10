/**
 * 改变的dom类型
 * 用于比较需要修改渲染的节点属性存储
 */
export class ChangedDom {
    /**
     *
     * @param node      虚拟节点
     * @param type      修改类型  add(添加节点),del(删除节点),upd(更新节点),rep(替换节点),text(修改文本内容)
     * @param parent    父虚拟dom
     * @param index     在父节点中的位置索引
     */
    constructor(node, type, parent, index) {
        this.node = node;
        this.type = type;
        this.parent = parent;
        this.index = index;
    }
}
//# sourceMappingURL=types.js.map