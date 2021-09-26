import {Module} from '../../dist/nodom.js'
export class MRepeat extends Module{
    template(){
        return `
        <div class="view">
            <button e-click='pop'>pop</button>
            <button e-click='push'>push</button>
            <button e-click='addFood'>addFood</button>
            <button e-click='desc'>价格降序</button>
            
            <div class="tip">基本使用</div>
            <div class="code">
                菜单：
                <for cond="{{foods}}">
                    菜名：{{name}}，价格：{{price}}
                </for>
            </div>
            <div class=tip>索引号的使用（编号从0开始）</div> 
            <div class=code>
                菜单：
                <for cond={{foods}}>
                    编号：{{$index}}，菜名：{{name}}，价格：{{price}}
                </for>
            </div>
            
            <div class=tip>自定义过滤数组</div>
            <div class="code">
                菜单：
                <for cond={{getOdd(foods)}}>
                    菜名：{{name}}，价格：{{price}}
                </for>
            </div>
            
            <div class=tip>价格升序排序（编号从1开始）</div>
            <div class=code>
                菜单：
                <div x-repeat={{foods.sort((a,b)=>{if(a.price>b.price)  return 1;return -1;})}}>
                    编号：{{$index+1}}，菜名：{{name}}，价格：{{price}}
                </div>
            </div>
        </div>
        `
    }
    data={
        show:0,
        date1:new Date().getTime(),
        discount:{data:0.9},
        xxx:true,
        foods: [{
            name: '夫妻肺片',
            price: 25
        }, {
            name: '京酱肉丝',
            price: 22
        }, {
            name: '糖醋里脊',
            price: 20
        }, {
            name: '红烧茄子',
            price: 12
        }, {
            name: '口水鸡',
            price: 18
        }, {
            name: '水煮肉片',
            price: 24
        }]
    }
    methods={
        top(arr){
            var a = [];
            for(let i=0;i<3;i++){
                a.push(arr[i]);
            }
            
            return a;
        },
        getOdd(arr){
            let a1 = [];
            for(let i=0;i<arr.length;i++){
                if(i%2){
                    a1.push(arr[i]);
                }
            }
            return a1;
        },
        desc(){
            this.foods.sort((a,b)=>{if(a.price>b.price)return -1;return 1;})
        },
        pop(){
            this.foods.pop();
        },
        push(){
            this.foods.push({name:'push菜单',price:50});
        },
        addFood(){
            this.foods.splice(2,0,
                {
                    name: '新增1',
                    price: 20
                },
                {
                    name: '新增2',
                    price: 30
                }
            )
        }
    }
}