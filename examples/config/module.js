var NodomConfig = {
	/**调度器执行周期，支持requestAnimation时无效 */
	scheduleCircle: 50,
	/**全局路径 */
	path: {
		app: "/examples/app",
		template: "view",
		js: "js",
		css: "css",
		preRoute: "route",
		module: "modules/dist",
	},
	/**模块配置 */
	modules: [
		{ class: "ModuleA", path: "modulea", singleton: false, lazy: true, className: "md-a" },
		{ class: "ModuleB", path: "moduleb", singleton: false, lazy: true, className: "Send" },
		{ class: "ModuleC", path: "modulec", singleton: false, lazy: true },
		{ class: "Store", path: "store", singleton: false, lazy: true, className: "Store" },
		{ class: "UIText", path: "nodomui", singleton: false, lazy: true, className: "UIText" },
	],
	/**路由配置 */
	routes: [{ path: "" }],
};
