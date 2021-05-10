/**
 * 自定义元素管理器
 */
export declare class PluginManager {
    private static plugins;
    /**
     * 添加自定义元素类
     * @param name  元素名
     * @param cfg   元素类
     */
    static add(name: string, cfg: any): void;
    /**
     * 获取自定义元素类
     * @param tagName 元素名
     */
    static get(tagName: string): any;
}
//# sourceMappingURL=pluginmanager.d.ts.map