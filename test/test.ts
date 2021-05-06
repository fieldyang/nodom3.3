import { Model } from "../core/model";
import { Module } from "../core/module";

let data = {
    name:'yang',
    age:40,
    edu:{id:1,title:'本科'},
    hobbies:[
        {name:'健身'},
        {name:'旅游'}
    ]
}
// console.log(data);
let module1:Module = new Module();
let model:any = new Model(data,module1);
// console.log(model instanceof Model);
// model.name = 'aaa';
// model.hobbies[0].name='123';

// console.log(model,data);
model.$watch('edu.id',function(oldValue,newValue){
    console.log(this.id,oldValue,newValue);
});

model.$watch('name',function(oldValue,newValue){
    console.log(this,oldValue,newValue);
});
model.name='aaa';
// console.log(model.edu);
model.edu.id=3;
console.log(model,data);
// console.log(model.name,model.age);
// console.log(model.hobbies[0]);
// console.log(model.hobbies[0]);