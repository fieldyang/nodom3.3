import { IDefineElementCfg } from "./types";

/**
 * 自定义元素管理器
 */
export class DefineElementManager {
    /**
     * 自定义element
     */
    private static elements: Map<string, IDefineElementCfg> = new Map();
    /**
     * 添加自定义元素类
     * @param name  元素名
     * @param cfg   配置
     */
    public static add(name: string, cfg: IDefineElementCfg) {
        this.elements.set(name, cfg);
    }

    /**
     * 获取自定义元素类
     * @param tagName 元素名
     */
    public static get(tagName: string): IDefineElementCfg {
        return this.elements.get(tagName);
    }
}
