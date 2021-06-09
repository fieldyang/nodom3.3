import { NEvent } from "../event";
import { DefineElement } from "../defineelement";
import { DefineElementManager } from "../defineelementmanager";
import { Element } from "../element";
import { Module } from "../module";
import { Directive } from "../directive";
import { Model } from "../model";
import { Expression } from "../expression";

class Img extends DefineElement {
    preSrcName: string;
    srcName: string;
    dataName: string;
    element: Element;
    imgs: any[];
    delay: number;
    constructor(params: Element) {

        super(params);
        let rootDom: Element = new Element();
        if (params) {
            rootDom = params;
            this.init(params);
        }
        rootDom.tagName = 'div';
        rootDom.defineEl = this;
        this.element = rootDom;
        console.log(this);



    }
    init(element: Element) {
        let that = this;
        // this.preSrcName =  element.getProp('presrcname')||'preSrc';
        // this.SrcName = element.getProp('srcname') || 'src';
        if (element.hasProp('prename')) {
            this.preSrcName = element.getProp('prename');
            element.delProp('prename');
        } else {
            this.preSrcName = 'preSrc';
        }
        if (element.hasProp('srcname')) {
            this.srcName = element.getProp('srcname');
            element.delProp('srcname');
        } else {
            this.srcName = 'src';
        }
        if (element.hasProp('dataname')) {
            this.dataName = element.getProp('dataname');
            element.delProp('dataname');
        } else {
            this.dataName = 'rows';
        }
        that.delay = 50;
        element.addEvent(new NEvent('scroll',
            function (dom, module, e, el) {
                if (this.$query('$timer')) clearTimeout(this.$query('$timer'));
                let timer = setTimeout(() => {
                    that.refresh(dom, el);
                }, that.delay || 50);
                this['$timer'] = timer;
            }));
        // element.defineEl=this;
    };
    // <div style="max-height: 500px; overflow-y: scroll; display: flex; flex-wrap: wrap; flex-direction: rows;"
    // 	e-scroll='scroll' e-click="click">
    // 	<img x-repeat="rows" src="img/mvvm.png" data-src="{{src}}" width="100%">
    // </div>
    // scroll(dom, model, module, e, el) {
    //     if (model.query('timer')) clearTimeout(model.query('timer'));
    //     var timer = setTimeout(() => {
    //             console.dir(el);
    //             render();

    //         },
    //         50);
    //     model.set('timer', timer);

    //     function render() {
    //         let height = el.offsetHeight;
    //         var start = el.scrollTop,
    //             end = start + height;
    //         let isPosition;
    //         let hasPosition = el.style.position == '';
    //         for (var i = 0; i < el.children.length; i++) {
    //             var item = el.children[i],
    //                 elemTop = hasPosition ? item.offsetTop - el.offsetTop : item.offsetTop;
    //             // console.log(item,start,end,elemTop);
    //             // console.dir(item);
    //             // console.log(el.scrollTop,height);
    //             if (elemTop >= start && elemTop <= end) {
    //                 if (item.getAttribute('data-src')) {
    //                     item.setAttribute('src', item.getAttribute('data-src'));
    //                     item.removeAttribute('data-src');
    //                     // console.log(item.getAttribute('data-src'));
    //                     // var src = item.attr('lay-src');
    //                 }
    //             }
    //             if (elemTop > end) break;
    //         }
    //     }

    beforeRender(module: Module, dom: Element) {
        super.beforeRender(module, dom);
        if (this.needPreRender) {
            dom.setProp('overflow-y', 'scroll');
            let child = dom.children[0];
            let img = child.query({
                tagName: 'img'
            });
            img.setProp('src', new Expression(`${this.preSrcName}`), true);
            new Directive('repeat', this.dataName, child, dom);
          
        }
    };
    afterRender(module: Module, dom: Element) {
        if(this.needPreRender){
            let md = this.getModel();
            md['$timer'] = null;
            setTimeout(() => {
                this.refresh(dom,module.getNode(dom.key));
            }, 50);
        }
        super.afterRender(module, dom);
        this.imgs = this.getImgElement(dom);
    }
    getImgElement(dom: Element, res = []) {
        for (let i = 0; i < dom.children.length; i++) {
            let item = dom.children[i];
            if (item.tagName === 'img') {
                res.push(item);
            } if (item.children.length > 0) {
                this.getImgElement(item, res);
            }
        }
        return res;
    }
    refresh(uidom: Element, el: HTMLElement) {
        console.log(uidom,el);
        
        let height = el.offsetHeight;
        let start = el.scrollTop,
            end = start + height;
        let hasPosition = el.style.position == '';
        for (let i = 0; i < el.children.length; i++) {
            for(let j = 0; j < el.children[i].children.length; j++){
                let item:any= el.children[i].children[j];
                if (item.tagName.toLowerCase() !== 'img')
                continue;
              let  elemTop = hasPosition ? item.offsetTop - el.offsetTop : item.offsetTop;
                console.log(elemTop,start,end);
                
            if (elemTop >= start && elemTop <= end) {
                let element: Element = uidom.query(item.getAttribute('key'));
                console.log(element);
                
                let em: Model = element.model;
                if (em.hasOwnProperty(this.srcName)) {
                    em[this.preSrcName] = em[this.srcName];
                    delete em[this.srcName];
                }
            }
            if (elemTop > end) break;
            }
           
        }
    }

}
DefineElementManager.add('NIMG', {
    init: function (element: Element, parent?: Element) {
        new Img(element);
    }
});
