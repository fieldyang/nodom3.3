module.exports = function (grunt) {
	//初始化配置grunt任务
	grunt.initConfig({
		ts: {
			options: {
				compile: true,
				comments: false,
				target: "es6",
				module: "amd",
				lib: ["es7", "dom"],
				fast: "never",
			},
			dev1: {
				src: [
					"./core/*.ts",
					"./core/**/*.ts",
					// "./core/types.ts",
					// "./core/nodom.ts",
					// "./core/util.ts",
					// "./core/application.ts",
					// "./core/factory.ts",
					// "./core/compiler.ts",
					// "./core/directive.ts",
					// "./core/directivetype.ts",
					// "./core/directivefactory.ts",
					// "./core/directivemanager.ts",
					// "./core/element.ts",
					// "./core/expression.ts",
					// "./core/expressionfactory.ts",
					// "./core/filter.ts",
					// "./core/filterfactory.ts",
					// "./core/filtermanager.ts",
					// "./core/resourcemanager.ts",
					// "./core/messagequeue.ts",
					// "./core/methodfactory.ts",
					// "./core/model.ts",
					// "./core/modelfactory.ts",
					// "./core/module.ts",
					// "./core/modulefactory.ts",
					// "./core/nodomerror.ts",
					// "./core/nodomevent.ts",
					// "./core/renderer.ts",
					// "./core/router.ts",
					// "./core/scheduler.ts",
					// "./core/serializer.ts",
					// "./core/extend/directiveinit.ts",
					// "./core/extend/filterinit.ts",
					// "./core/locales/tipmsg.ts",
					// "./core/locales/msg_zh.ts",
					// "./core/locales/msg_en.ts",
					// "./core/plugin.ts",
					// "./core/pluginmanager.ts",
				],
				out: "bin/nodom.js",
			},
			dev2: {
				src: [
					"./plugins/*.ts",
					// "./plugins/msg_zh.ts",
					// "./plugins/uibase.ts",
					// "./plugins/accordion.ts",
					// "./plugins/button.ts",
					// "./plugins/buttongroup.ts",
					// "./plugins/checkbox.ts",
					// "./plugins/datetime.ts",
					// "./plugins/dialog.ts",
					// "./plugins/file.ts",
					// "./plugins/form.ts",
					// "./plugins/grid.ts",
					// "./plugins/layout.ts",
					// "./plugins/list.ts",
					// "./plugins/listtransfer.ts",
					// "./plugins/menu.ts",
					// "./plugins/pagination.ts",
					// "./plugins/panel.ts",
					// "./plugins/radio.ts",
					// "./plugins/relationmap.ts",
					// "./plugins/select.ts",
					// // './plugins/selectgroup.ts',
					// "./plugins/tab.ts",
					// "./plugins/tip.ts",
					// "./plugins/toolbar.ts",
					// "./plugins/text.ts",
					// "./plugins/tree.ts",
					// "./plugins/loading.ts",
					// "./plugins/floatbox.ts",
				],
				out: "bin/nodomui.js",
			},
		},
		clean: {
			folder: "bin",
		},
	});
	//grunt任务执行的时候加载对应的任务插件
	grunt.loadNpmTasks("grunt-ts");
	grunt.loadNpmTasks("grunt-contrib-clean");
	//注册grunt的默认任务
	// grunt.registerTask("default", ["clean", "ts:dev1", "ts:dev2"]);
	grunt.registerTask("default", ["clean", "ts:dev1"]);
	//"clean" , "ts:dev1", "ts:dev2"
};
