import { Module } from "../../dist/nodom.js";
import { ModuleA } from "./modulea.js";
export class ModuleMain extends Module {
	template() {
		return `
            <div>
                <button e-click='change'>change</button>
<<<<<<< HEAD
                <div>y is {{y}}</div>
                <div>x.y is {{x.y}}</div>
                <h2>默认plug</h2>
                <p>第一个子模块</p>
                <ModuleA x-data={{getData()}} xxx='111'>
                    <slot>
                        <h3 style='color:blue'> hello change plug 1</h3>    
                    </slot>
                    <slot name='s2'>替换的第二个slot  {{name}}</slot>
                </ModuleA>
                <hr/>
                <p>第二个子模块</p>
                <h2>替换plug</h2>
                <ModuleA x-data={{{n:'name',x1:'x.y',x2:['y',true]}}} xxx='222'>
                    <slot>
                        <h3 style='color:red'> hello change plug 2</h3>    
                    </slot>
                    
                </ModuleA>

                <p>第三个子模块</p>
                <h2>默认子节点自动转换为slot节点</h2>
                <ModuleA xxx='333'>
                    
                    <p style='color:gold'>
                        我自动作为solot节点
                    </p>
                    <slot name='s2'>hahaha</slot>
                    <h3 style='color:gold'>
                        我自动作为solot节点
                    </h3>
=======
                <div>hello world!</div>
                <div>x.y is {{x.y}}</div>
                <div>x2:{{y}}</div>
                <h2>默认plug</h2>
                <ModuleA x-data={{getData()}} xxx='111'>
                    <swap name='s1'>
                        <h3 style='color:blue'> hello change plug 1</h3>    
                    </swap>
                    <swap name='s2'>替换的第二个swap  {{name}}</swap>
                </ModuleA>
                <p>hello</p>
                <h2>替换plug</h2>
                <ModuleA x-data={{getData()}} xxx='222'>
                    <swap name='s1'>
                        <h3 style='color:red'> hello change plug 2</h3>    
                    </swap>
>>>>>>> 336098f0c5db8ff4d25308a1963f72a1fac84a0f
                </ModuleA>
           </div>
        `;
	}
	data = {
		show: true,
		x: {
			y: 123,
		},
<<<<<<< HEAD
		y: "hello world!",
=======
		y: "hello",
>>>>>>> 336098f0c5db8ff4d25308a1963f72a1fac84a0f
		name: "yanglei",
		rows: [{ name: "yang" }, { name: "lei" }],
	};

	methods = {
		getData() {
			// return {
			//     x1:'x.y',
			//     x2:['y',true]
			// }
			return {
				n: "name",
				x1: "x.y",
				x2: ["y", true],
			};
		},
		change() {
			this.show = false;
			this.y = "aaaa";
			// console.log(this);
		},
	};
	modules = [ModuleA];
}
