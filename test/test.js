// let obj = {
//     name:'aaa',
//     age:40,
//     edu:{id:1}
// }

// let handler = {
//     set:(src,key,value,receiver)=>{
//         console.log('set',key,value,receiver===p);
//         src[key] = value;
//         return true;
//     },
//     get:(src,key,receiver)=>{
//         console.log('get',key);
//         //未代理则进行代理
//         if(typeof src[key] === 'object' && !src[key].$proxy){
//             let p1 = new Proxy(src[key],handler);
//             receiver[key] = p1;
//         }
//         return src[key];
//     }
// }
// let p = new Proxy(obj,handler);
// p.__proxy = true;
// // obj.edu.id=2;
// console.log(obj,p);

let s = `<div class="tip">样式：price&gt;100，字体变红色；discount&lt;0.8，字体加粗</div>`;
let transferWords={'lt':'<','gt':'>','nbsp':' ','amp':'&','quot':'"'};
s = s.replace(/&(lt|gt|nbsp|amp|quot);/ig,function(all,t){return transferWords[t];});

console.log(s);
// let encoder = new TextEncoder();
// let s1 = encoder.encode(s);
// let decoder = new TextDecoder();
// console.log(decoder.decode(s1));
