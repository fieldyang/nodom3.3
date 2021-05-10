import { NError } from "./error";
import { Nodom } from "./nodom";
/**
 * 自定义元素管理器
 */
export class PluginManager {
    /**
     * 添加自定义元素类
     * @param name  元素名
     * @param cfg   元素类
     */
    static add(name, cfg) {
        if (this.plugins.has(name)) {
            throw new NError('exist1', Nodom.tipMessage.TipWords['element'], name);
        }
        this.plugins.set(name, cfg);
    }
    /**
     * 获取自定义元素类
     * @param tagName 元素名
     */
    static get(tagName) {
        return this.plugins.get(tagName);
    }
}
PluginManager.plugins = new Map();
//# sourceMappingURL=pluginmanager.js.map