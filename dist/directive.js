var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DirectiveManager } from "./directivemanager";
import { Filter } from "./filter";
import { Util } from "./util";
/**
 * 指令类
 */
export class Directive {
    /**
     * 构造方法
     * @param type  	类型名
     * @param value 	指令值
     * @param dom       指令对应的dom
     * @param filters   过滤器字符串或过滤器对象,如果为过滤器串，则以｜分割
     * @param notSort   不排序
     */
    constructor(type, value, dom, filters, notSort) {
        this.id = Util.genId();
        this.type = DirectiveManager.getType(type);
        if (Util.isString(value)) {
            value = value.trim();
        }
        this.value = value;
        if (filters) {
            this.filters = [];
            if (typeof filters === 'string') {
                let fa = filters.split('|');
                for (let f of fa) {
                    this.filters.push(new Filter(f));
                }
            }
            else if (Util.isArray(filters)) {
                for (let f of filters) {
                    if (typeof f === 'string') {
                        this.filters.push(new Filter(f));
                    }
                    else if (f instanceof Filter) {
                        this.filters.push(f);
                    }
                }
            }
        }
        if (type !== undefined && dom) {
            DirectiveManager.init(this, dom);
            dom.addDirective(this, !notSort);
        }
    }
    /**
     * 执行指令
     * @param module    模块
     * @param dom       指令执行时dom
     * @param parent    父虚拟dom
     */
    exec(module, dom, parent) {
        return __awaiter(this, void 0, void 0, function* () {
            return DirectiveManager.exec(this, dom, module, parent);
        });
    }
    /**
     * 克隆
     * @param dst   目标dom
     * @returns     新指令
     */
    clone(dst) {
        let dir = new Directive(this.type.name, this.value);
        if (this.filters) {
            dir.filters = [];
            for (let f of this.filters) {
                dir.filters.push(f.clone());
            }
        }
        if (this.params) {
            dir.params = Util.clone(this.params);
        }
        if (this.extra) {
            dir.extra = Util.clone(this.extra);
        }
        DirectiveManager.init(dir, dst);
        return dir;
    }
}
//# sourceMappingURL=directive.js.map