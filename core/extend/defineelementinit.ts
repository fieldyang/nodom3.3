import { DefineElementManager } from "../defineelementmanager";
import { Directive } from "../directive";
import { Element } from "../element";
import { NError } from "../error";
import { NodomMessage } from "../nodom";

/**
 * module 元素
 */
DefineElementManager.add('NMODULE', {
    init: function (element: Element, parent?: Element) {
        //tagname 默认div
        if (element.hasProp('tag')) {
            element.tagName = element.getProp('tag');
            element.delProp('tag');
        } else {
            element.tagName = 'div';
        }
        //类名
        let clazz = element.getProp('classname');
        if (!clazz) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NMODULE', 'classname');
        }
        //模块名
        let moduleName = element.getProp('name');
        if (moduleName) {
            clazz += '|' + moduleName;
        }
        new Directive('module', clazz, element, parent);

    }
});

/**
 * for 元素
 */
DefineElementManager.add('NFOR', {
    init: function (element: Element, parent?: Element) {
        //tagname 默认div
        if (element.hasProp('tag')) {
            element.tagName = element.getProp('tag');
            element.delProp('tag');
        } else {
            element.tagName = 'div';
        }
        //条件
        let cond = element.getProp('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NFOR', 'condition');
        }
        new Directive('repeat', cond, element, parent);
    }
});

/**
 * recur 元素
 */
DefineElementManager.add('NRECUR', {
    init: function (element: Element, parent?: Element) {
        //tagname 默认div
        if (element.hasProp('tag')) {
            element.tagName = element.getProp('tag');
            element.delProp('tag');
        } else {
            element.tagName = 'div';
        }
        //条件
        let cond = element.getProp('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NRECUR', 'condition');
        }
        new Directive('recur', cond, element, parent);
    }
});

/**
 * if 元素
 */
DefineElementManager.add('NIF', {
    init: function (element: Element, parent?: Element) {
        //tagname 默认div
        if (element.hasProp('tag')) {
            element.tagName = element.getProp('tag');
            element.delProp('tag');
        } else {
            element.tagName = 'div';
        }
        //条件
        let cond = element.getProp('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NIF', 'condition');
        }
        new Directive('if', cond, element, parent);
    }
});

/**
 * else 元素
 */
DefineElementManager.add('NELSE', {
    init: function (element: Element, parent?: Element) {
        //tagname 默认div
        if (element.hasProp('tag')) {
            element.tagName = element.getProp('tag');
            element.delProp('tag');
        } else {
            element.tagName = 'div';
        }
        new Directive('else', null, element, parent);
    }
});

/**
 * elseif 元素
 */
DefineElementManager.add('NELSEIF', {
    init: function (element: Element, parent?: Element) {
        //tagname 默认div
        if (element.hasProp('tag')) {
            element.tagName = element.getProp('tag');
            element.delProp('tag');
        } else {
            element.tagName = 'div';
        }
        //条件
        let cond = element.getProp('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NELSEIF', 'condition');
        }
        new Directive('elseif', cond, element, parent);
    }
});

/**
 * endif 元素
 */
DefineElementManager.add('NENDIF', {
    init: function (element: Element, parent?: Element) {
        //tagname 默认div
        if (element.hasProp('tag')) {
            element.tagName = element.getProp('tag');
            element.delProp('tag');
        } else {
            element.tagName = 'div';
        }
        new Directive('endif', null, element, parent);
    }
});

/**
 * switch 元素
 */
DefineElementManager.add('NSWITCH', {
    init: function (element: Element, parent?: Element) {
        //tagname 默认div
        if (element.hasProp('tag')) {
            element.tagName = element.getProp('tag');
            element.delProp('tag');
        } else {
            element.tagName = 'div';
        }
        //条件
        let cond = element.getProp('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NSWITCH', 'condition');
        }
        new Directive('switch', cond, element, parent);
    }
});

/**
 * case 元素
 */
DefineElementManager.add('NCASE', {
    init: function (element: Element, parent?: Element) {
        //tagname 默认div
        if (element.hasProp('tag')) {
            element.tagName = element.getProp('tag');
            element.delProp('tag');
        } else {
            element.tagName = 'div';
        }
        //条件
        let cond = element.getProp('condition');
        if (!cond) {
            throw new NError('itemnotempty', NodomMessage.TipWords['element'], 'NCASE', 'condition');
        }
        new Directive('case', cond, element, parent);
    }
});

DefineElementManager.add('SLOT', {
    init: function (element: Element, parent?: Element) {
        element.tagName = 'div';
        if(element.hasProp('name'))
        element.setTmpParam('slotName',element.getProp('name'));
    }
});
