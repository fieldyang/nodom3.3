import { Element } from "./element";
import { Model } from "./model";
import { Module } from "./module";
import { ModuleFactory } from "./modulefactory";
import { ASTObj } from "./types";
import { Util } from "./util";

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
