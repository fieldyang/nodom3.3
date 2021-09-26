import { DefineElement } from "../core/defineelement";
import { DefineElementManager } from "../core/defineelementmanager";
import { NError } from "../core/error";
import { NodomMessage } from "../core/nodom";
import { Element } from "../core/element";
import { Directive } from "../core/directive";
import { Module } from "../core/module";

/**
 * module 元素
 */
class MODULE extends DefineElement{
    constructor(node: Element,module:Module){
        super(node,module);
        //类名
        let clazz = node.getProp('name');
        if (!clazz) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'MODULE', 'className');
        }
        node.delProp('name');
        new Directive('module',clazz,node);
    }
}

/**
 * for 元素
 */
class FOR extends DefineElement{
    constructor(node: Element,module:Module){
        super(node,module);
        //条件
        let cond = node.getProp('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'FOR', 'cond');
        }
        node.delProp('cond');
        new Directive('repeat',cond,node,module);
    }
}


class IF extends DefineElement{
    constructor(node: Element,module:Module){
        super(node,module);
        //条件
        let cond = node.getProp('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'IF', 'cond');
        }
        node.delProp('cond');
        new Directive('if',cond,node,module);
    }
}

class ELSE extends DefineElement{
    constructor(node: Element,module:Module){
        super(node,module);
        new Directive('else','',node,module);
    }
}

class ELSEIF extends DefineElement{
    constructor(node: Element,module:Module){
        super(node,module);
        //条件
        let cond = node.getProp('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'ELSEIF', 'cond');
        }
        node.delProp('cond');
        new Directive('elseif',cond,node,module);
    }
}

class ENDIF extends DefineElement{
    constructor(node: Element,module:Module){
        super(node,module);
        new Directive('endif','',node,module);
    }
}


/**
 * 替代器
 */
class SWAP extends DefineElement{
    constructor(node: Element,module:Module){
        super(node,module);
        //条件
        let cond = node.getProp('name') || 'default';
        node.delProp('name');
        new Directive('swap',cond,node,module);
    }
}

DefineElementManager.add([MODULE,FOR,IF,ELSE,ELSEIF,ENDIF,SWAP]);