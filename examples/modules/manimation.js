import { Module } from "../../dist/nodom.js";
export class MAnimation extends Module {
	template() {
		return `
            <div>
                <h1>基础用法</h1>
                <p> 你需要为x-animation指令指定一个对象，其中包括name和tigger </p>
                <p>name 为你过渡的类名，tigger为你过渡的触发条件</p>
                <p>过渡可分为enter和leave，播放enter还是leave由tigger触发，tigger：true的时候播放enter，tigger:false的时候播放leave</p>
                <p>对于enter过渡 你需要提供 -enter-active, -enter-from, -enter-to 后缀的css类名，当然你只需要提供名字，x-animation在工作的时候会为你自动添加这些后缀</p>
                <p>tigger为true时，指令会首先会为你的元素提供-leave-to的类，然后为你的元素添加后缀为-enter-active 和 -enter-from的类，</p>
                <p>再触发enter过渡之前，我们会执行你定义的before钩子函数，再触发动画的下一帧-enter-from的类会被移除 -enter-to的类会被添加，再过渡结束的时候会执行你定义的after钩子</p>
                <pre>
                    .shape-enter-active,
                    .shape-leave-active {
                        transition: all 1s ease;
                    }
                    .shape-enter-from,
                    .shape-leave-to {
                        height: 100px;
                        width: 100px;
                    }
                    .shape-enter-to,
                    .shape-leave-from {
                        height: 200px;
                        width: 200px;
                    }
                </pre> 
                <button e-click="tigger1">点我触发过渡1</button>
                <h2>过渡1</h2>
                <div class="container">
                    <div class='div2' x-animation={{transition1}}></div>
                </div>
                
                <h1>内置过渡</h1>
                <p> 内置过渡效果均为进入离开过渡，再播放离开动画之后会隐藏(dispaly:none)你的元素 </p>

                <button e-click='tigger2'>点我触发scale</button>
                <h2>scale</h2>
                <div class="container">
                    <div class='div2' x-animation={{transition2}}></div>
                    <div class='div2' x-animation={{transition3}}></div>
                    <div class='div2' x-animation={{transition4}}></div>
                </div>
                
                <button e-click='tigger3'>点我触发fold</button>
                  <h2>fold</h2>
                <div class="container">
                    <div class='div2' x-animation={{transition5}}></div>
                    <div class='div2' x-animation={{transition6}}></div>
                </div> 
                
                <button e-click='tigger4'>点我触发fade</button>
                <h2>fade</h2>
                <div class="container">
                    <div class='div2' x-animation={{transition7}}></div>
                </div> 

                

                <p>对于进入离开过渡，你可以分别配置，你也可以控制延时时间和播放时间以及timingFunction</p>
                <button e-click='tigger6'>点我触发过渡</button>
                <h2>进入/离开分开配置</h2>
                <div class="container">
                    <div class='div2' x-animation={{transition8}}></div>
                </div> 
            
                

                <h1>动画</h1>
                <p>我们将fade效果从transiton改为animation</p>
                <pre>
                    .myfade-enter-active {
                        animation-name: myfade;
                        animation-duration: 1s;
                    }
                    .myfade-leave-active {
                        animation-name: myfade;
                        animation-duration: 1s;
                        animation-direction: reverse;
                    }
                    @keyframes myfade {
                        0% {
                            opacity: 0;
                        }
                        100% {
                            opacity: 1;
                        }
                    }
                </pre> 
                  <button e-click='tigger5'>点我触发动画</button>
                <h2>fade动画</h2>
                <div class="container">
                    <div class='div2' x-animation={{animaiton}}></div>
                </div>
                
            </div> 
	`;
	}
	data() {
		return {
			transition1: {
				tigger: true, // 必填
				name: "shape", // 必填
				isAppear: false, // 是否是进入离开过渡，默认为true
				hooks: {
					before(module) {
						console.log("过渡1执行前钩子执行了！");
						console.log("过渡1执行前钩子的this是model：", this);
						console.log("过渡1执行前钩子传入的参数是module：", module);
					},
					after(module) {
						console.log("过渡1执行后钩子执行了！");
						console.log("过渡1执行后钩子的this是model：", this);
						console.log("过渡1执行后钩子传入的参数是module：", module);
					},
				},
			},
			transition2: {
				tigger: true, // 必填
				name: "scale-fixtop", // 必填
			},
			transition3: {
				tigger: true, // 必填
				name: "scale-fixleft", // 必填
			},
			transition4: {
				tigger: true, // 必填
				name: "scale-fixcenterY", // 必填
			},
			transition5: {
				tigger: true, // 必填
				name: "fold-width", // 必填
			},
			transition6: {
				tigger: true, // 必填
				name: "fold-height", // 必填
			},
			transition7: {
				tigger: true, // 必填
				name: "fade", // 必填
			},
			transition8: {
				tigger: true, // 必填
				name: {
					enter: "scale-fixtop",
					leave: "scale-fixleft",
				},
				duration: {
					enter: "0.5s",
					leave: "0.5s",
				},
				delay: {
					enter: "0.5s",
					leave: "0.5s",
				},
				timingFunction: {
					enter: "ease-in-out",
					leave: "cubic-bezier(0.55, 0, 0.1, 1)",
				},
				hooks: {
					enter: {
						before(module) {
							console.log("scale-fixtop前", module);
						},
						after(module) {
							console.log("scale-fixtop后", module);
						},
					},
					leave: {
						before(module) {
							console.log("scale-fixleft前", module);
						},
						after(module) {
							console.log("scale-fixleft后", module);
						},
					},
				},
			},
			animaiton: {
				tigger: true, // 必填
				isAppear: false,
				type: "animation",
				name: "myfade", // 必填
				hooks: {
					before(module) {
						console.log("动画执行前", module);
					},
					after(module) {
						console.log("动画执行后", module);
					},
				},
			},
		};
	}

	//触发过渡1
	tigger1(model) {
		console.log(111);
		model.transition1.tigger = !model.transition1.tigger;
	}
	tigger2(model) {
		model.transition2.tigger = !model.transition2.tigger;
		model.transition3.tigger = !model.transition3.tigger;
		model.transition4.tigger = !model.transition4.tigger;
	}
	tigger3(model) {
		model.transition5.tigger = !model.transition5.tigger;
		model.transition6.tigger = !model.transition6.tigger;
	}
	tigger4(model) {
		console.log(model);
		model.transition7.tigger = !model.transition7.tigger;
	}
	tigger5(model) {
		model.animaiton.tigger = !model.animaiton.tigger;
	}
	tigger6(model) {
		model.transition8.tigger = !model.transition8.tigger;
	}
}
