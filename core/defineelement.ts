import { Element } from "./element";
import { Module } from "./module";
/**
 * 自定义元素
 * 用于扩充定义，主要对ast obj进行前置处理
 */
export class DefineElement {
    constructor(node:Element,module:Module){
        if (node.hasProp('tag')) {
            node.tagName = node.getProp('tag');
            node.delProp('tag');
        } else {
            node.tagName = 'div';
        }
    }
}
