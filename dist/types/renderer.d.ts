import { Module } from "./module";
/**
 * 渲染器
 */
export declare class Renderer {
    /**
     * 等待渲染列表（模块名）
     */
    private static waitList;
    /**
     * 添加到渲染列表
     * @param module 模块
     */
    static add(module: Module): void;
    static remove(module: Module): void;
    /**
     * 队列渲染
     */
    static render(): void;
}
//# sourceMappingURL=renderer.d.ts.map