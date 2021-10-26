import { Module, registModule } from "../../dist/nodom.js";

export class ModuleD extends Module {
	template(props) {
		return `
            <div>
                <p>mod-d</p>
                <button style='background:gold' e-click=print>按钮</button>
            </div>
        `;
	}
	data = {
		x1: 0,
		x2: 0,
	};
	methods = {
		print() {
			console.log(this);
		},
	};
}

registModule(ModuleD, "mod-d");
