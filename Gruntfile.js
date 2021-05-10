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
					],
				out: "bin/nodom.js",
			},
			dev2: {
				src: [
					"./plugins/*.ts",
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
