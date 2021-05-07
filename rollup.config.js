import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import path from "path";
import ts from "rollup-plugin-typescript2";
export default {
	input: path.join(__dirname, "/index.ts"),
	output: {
		name: "nodom", // window.nodom
		file: path.resolve("dist/nodom.js"), // 输出的文件路径
		format: "umd", // 打包成umd 或者 iife 都可以
		sourcemap: true, //生成映射文件
	},
	plugins: [
		nodeResolve({
			extensions: [".js", ".ts"],
		}),
		commonjs(),
		ts(),
	],
};
