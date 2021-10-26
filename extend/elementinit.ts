import { DirectiveElement } from "../core/directiveelement";
import { DirectiveElementManager } from "../core/directiveelementmanager";
import { NError } from "../core/error";
import { NodomMessage } from "../core/nodom";
import { VirtualDom } from "../core/virtualdom";
import { Directive } from "../core/directive";
import { Module } from "../core/module";
import { GlobalCache } from "../core/globalcache";

/**
 * module 元素
 */
class MODULE extends DirectiveElement{
    constructor(node: VirtualDom,module:Module){
        super(node,module);
        //类名
        let clazz = node.getProp('name');
        if (!clazz) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'MODULE', 'className');
        }
        node.delProp('name');
        node.addDirective(new Directive('module',clazz));
    }
}

/**
 * for 元素
 */
class FOR extends DirectiveElement{
    constructor(node: VirtualDom,module:Module){
        super(node,module);
        //条件
        let cond = node.getProp('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'FOR', 'cond');
        }
        node.delProp('cond');
        if(typeof cond === 'number'){ //表达式
            cond = GlobalCache.getExpression(cond);
        }
        
        node.addDirective(new Directive('repeat',cond));
    }
}

/**
 * 递归元素
 */
class RECUR extends DirectiveElement{
    constructor(node: VirtualDom,module:Module){
        super(node,module);
        //条件
        let cond = node.getProp('cond');
        node.delProp('cond');
        if(typeof cond === 'number'){ //表达式
            cond = GlobalCache.getExpression(cond);
        }
        node.addDirective(new Directive('recur',cond));
    }
}

/**
 * IF 元素
 */
class IF extends DirectiveElement{
    constructor(node: VirtualDom,module:Module){
        super(node,module);
        //条件
        let cond = node.getProp('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'IF', 'cond');
        }
        node.delProp('cond');
        if(typeof cond === 'number'){ //表达式
            cond = GlobalCache.getExpression(cond);
        }
        node.addDirective(new Directive('if',cond));
    }
}

class ELSE extends DirectiveElement{
    constructor(node: VirtualDom,module:Module){
        super(node,module);
        node.addDirective(new Directive('else',null));
    }
}
/**
 * ELSEIF 元素
 */
class ELSEIF extends DirectiveElement{
    constructor(node: VirtualDom,module:Module){
        super(node,module);
        //条件
        let cond = node.getProp('cond');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'ELSEIF', 'cond');
        }
        node.delProp('cond');
        if(typeof cond === 'number'){ //表达式
            cond = GlobalCache.getExpression(cond);
        }
        node.addDirective(new Directive('elseif',cond));
    }
}
/**
 * ENDIF 元素
 */
class ENDIF extends DirectiveElement{
    constructor(node: VirtualDom,module:Module){
        super(node,module);
        node.addDirective(new Directive('endif',null));
    }
}

/**
 * 替代器
 */
class SLOT extends DirectiveElement{
    constructor(node: VirtualDom,module:Module){
        super(node,module);
        //条件
        let cond = node.getProp('name') || 'default';
        node.delProp('name');
        node.addDirective(new Directive('slot',cond));
    }
}

DirectiveElementManager.add([MODULE,FOR,IF,RECUR,ELSE,ELSEIF,ENDIF,SLOT]);
