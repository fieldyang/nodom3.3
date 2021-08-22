import { DefineElement } from "../core/defineelement";
import { DefineElementManager } from "../core/defineelementmanager";
import { NError } from "../core/error";
import { NodomMessage } from "../core/nodom";
import { ASTObj } from "../core/types";

/**
 * module 元素
 */
class NMODULE extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //类名
        let clazz = node.attrs.get('className');
        if (!clazz) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NMODULE', 'className');
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
class NFOR extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NFOR', 'condition');
        }
        node.attrs.set('x-repeat',cond);
    }
}

class NRECUR extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NFOR', 'condition');
        }
        node.attrs.set('x-recur',cond);
    }
}

class NIF extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NFOR', 'condition');
        }
        node.attrs.set('x-if',cond);
    }
}

class NELSE extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NFOR', 'condition');
        }
        node.attrs.set('x-else',cond);
    }
}

class NELSEIF extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NFOR', 'condition');
        }
        node.attrs.set('x-elseif',cond);
    }
}

class NENDIF extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NFOR', 'condition');
        }
        node.attrs.set('x-endif',null);
    }
}

class NSWITCH extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NFOR', 'condition');
        }
        node.attrs.set('x-switch',cond);
    }
}

class NCASE extends DefineElement{
    constructor(node: ASTObj){
        super(node);
        //条件
        let cond = node.attrs.get('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NFOR', 'condition');
        }
        node.attrs.set('x-case',cond);
    }
}


// DefineElementManager.add('SLOT', {
//     init: function (element: Element, parent?: Element) {
//         element.tagName = 'div';
//         if(element.hasProp('name'))
//         element.setTmpParam('slotName',element.getProp('name'));
//     }
// });

DefineElementManager.add([NMODULE,NFOR,NRECUR,NIF,NELSE,NELSEIF,NENDIF,NSWITCH,NCASE]);