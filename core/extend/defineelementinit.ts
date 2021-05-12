import { DefineElementManager } from "../defineelementmanager";
import { Directive } from "../directive";
import { Element } from "../element";
import { NError } from "../error";
import { NodomMessage } from "../nodom";

/**
 * module 元素
 */
DefineElementManager.add('MODULE',{
    init:function(element:Element,parent?:Element){
        element.tagName = 'div';
        //类名
        let clazz = element.getProp('classname');
        if(!clazz){
            throw new NError('itemnotempty',NodomMessage.TipWords['element'],'MODULE','classname');
        }
        //模块名
        let moduleName = element.getProp('name');
        if(moduleName){
            clazz += '|' + moduleName;
        }
        new Directive('module',clazz,element,parent);
    }
});

/**
 * for 元素
 */
DefineElementManager.add('FOR',{
    init:function(element:Element,parent?:Element){
        element.tagName = 'div';
        //条件
        let cond = element.getProp('condition');
        if(!cond){
            throw new NError('itemnotempty',NodomMessage.TipWords['element'],'for','condition');
        }
        new Directive('repeat',cond,element,parent);
    }
});

/**
 * if 元素
 */
DefineElementManager.add('IF',{
    init:function(element:Element,parent?:Element){
        element.tagName = 'div';
        //条件
        let cond = element.getProp('condition');
        if(!cond){
            throw new NError('itemnotempty',NodomMessage.TipWords['element'],'IF','condition');
        }
        new Directive('if',cond,element,parent);
    }
});

/**
 * else 元素
 */
DefineElementManager.add('ELSE',{
    init:function(element:Element,parent?:Element){
        element.tagName = 'div';
        new Directive('else',null,element,parent);
    }
});

/**
 * elseif 元素
 */
DefineElementManager.add('ELSEIF',{
    init:function(element:Element,parent?:Element){
        element.tagName = 'div';
        //条件
        let cond = element.getProp('condition');
        if(!cond){
            throw new NError('itemnotempty',NodomMessage.TipWords['element'],'ELSEIF','condition');
        }
        new Directive('elseif',cond,element,parent);
    }
});

/**
 * endif 元素
 */
 DefineElementManager.add('ENDIF',{
    init:function(element:Element,parent?:Element){
        element.tagName = 'div';
        new Directive('endif',null,element,parent);
    }
});

/**
 * switch 元素
 */
DefineElementManager.add('SWITCH',{
    init:function(element:Element,parent?:Element){
        element.tagName = 'div';
        //条件
        let cond = element.getProp('condition');
        if(!cond){
            throw new NError('itemnotempty',NodomMessage.TipWords['element'],'switch','condition');
        }
        new Directive('switch',cond,element,parent);
    }
});

/**
 * case 元素
 */
DefineElementManager.add('CASE',{
    init:function(element:Element,parent?:Element){
        element.tagName = 'div';
        //条件
        let cond = element.getProp('condition');
        if(!cond){
            throw new NError('itemnotempty',NodomMessage.TipWords['element'],'CASE','condition');
        }
        new Directive('case',cond,element,parent);
    }
});