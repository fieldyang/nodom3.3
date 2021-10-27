import { Module } from "../../../dist/nodom.js";
/**
 * 路由主模块
 */
export class MdlMod4 extends Module {
	template() {
		return `
        <div test='1'>
            这是{{$route.data.page}}页,编号是{{$route.data.id}}
            <!--<div>
                <a x-repeat='routes' x-route={{path}}  class={{active?'colorimp':''}} active='active'>{{title}}</a>
                <div x-router></div>
            </div>-->
        </div>`;
	}
	data = {
		routes: [
			{
				title: "商品详情",
				path: "/router/route2/rparam/home/1/desc",
				active: true,
			},
			{
				title: "评价",
				path: "/router/route2/rparam/home/1/comment",
				active: false,
			},
		],
	};

	onBeforeFirstRender(model) {
		console.log(model);
	}
}
