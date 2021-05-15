// let str = "select t0.f1 as t0_f1,t1.f2 as t1_f2 from t0,t1 where t0.x=? and and t0.name like 'x?y' ";
let str = "x= '?12'";
let reg = /\?(?!('))/;
console.log(reg.test(str));
let r;
// while((r = reg.exec(str)) !== null){
//     console.log(r);
// }