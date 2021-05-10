/**
 * 应用类
 * 全局对象
 * @since 2.0
 */
export declare class Application {
    /**
     * 路径对象 包含 {
     *              app:appPath(应用基础路径),
     *              css:css路径(css加载基础路径 app+css),
     *              js:js路径(js加载基础路径 app+css),
     *              template:模版路径(模版加载基础 app+template)
     *              route:路由前置路径(路由完整路径为 route + routePath)
     *              module:模块基础路径
     */
    private static path;
    /**
     * 调度器执行间隔，如果支持requestAnimationFrame，则不需要
     */
    private static renderTick;
    /**
     * 根容器
     */
    private static rootContainer;
    /**
     * 获取路径
     * @param type  路径类型 app,template,css,js,module,route
     * @returns     type对应的基础路径
     */
    static getPath(type: string): string;
    /**
     * 设置path 对象
     * @param pathObj   路径对象
     */
    static setPath(pathObj: Object): void;
}
