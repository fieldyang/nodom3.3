import { ASTObj } from "./types";
/**
 * 自定义元素
 * 用于扩充定义，主要对ast obj进行前置处理
 */
export class DefineElement {
    constructor(node:ASTObj){
        if (node.attrs.has('tag')) {
            node.tagName = node.attrs.get('tag');
            node.attrs.delete('tag');
        } else {
            node.tagName = 'div';
        }
    }
}
