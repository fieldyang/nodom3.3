import { Module } from "../../dist/nodom.js";
export class ModuleA extends Module {
	template() {
		return `
        <div>
            <slot>
                这是模块A的默认显示
            </slot>
        </div>
        `;
	}
}
