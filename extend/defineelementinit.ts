import { DefineElement } from "../core/defineelement";
import { DefineElementManager } from "../core/defineelementmanager";
import { NError } from "../core/error";
import { NodomMessage } from "../core/nodom";
import { ASTObj } from "../core/types";

/**
 * module 元素
 */
class MODULE extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //类名
        let clazz = node.attrs.get('className');
        if (!clazz) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'MODULE', 'className');
        }
        //模块名
        let moduleName = node.attrs.get('name');
        if (moduleName) {
            clazz += '|' + moduleName;
        }
        node.attrs.set('x-module',clazz);
    }
}

/**
 * for 元素
 */
class FOR extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'FOR', 'cond');
        }
        node.attrs.set('x-repeat',cond);
    }
}

class RECUR extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'RECUR', 'cond');
        }
        node.attrs.set('x-recur',cond);
    }
}

class IF extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'IF', 'cond');
        }
        node.attrs.set('x-if',cond);
    }
}

class ELSE extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        node.attrs.set('x-else',undefined);
    }
}

class ELSEIF extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'ELSEIF', 'cond');
        }
        node.attrs.set('x-elseif',cond);
    }
}


class SWITCH extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'SWITCH', 'cond');
        }
        node.attrs.set('x-switch',cond);
    }
}

class CASE extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'CASE', 'cond');
        }
        node.attrs.set('x-case',cond);
    }
}

class PLUG extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('name');
        let cond1=node.attrs.get('plugName');
        node.attrs.set('plug',cond||cond1||'default');
        node.tagName='div';
    }
}
// DefineElementManager.add('SLOT', {
//     init: function (element: Element, parent?: Element) {
//         element.tagName = 'div';
//         if(element.hasProp('name'))
//         element.setTmpParam('slotName',element.getProp('name'));
//     }
// });

DefineElementManager.add([MODULE,FOR,RECUR,IF,ELSE,ELSEIF,SWITCH,CASE,PLUG]);