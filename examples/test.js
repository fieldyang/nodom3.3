let str = "select t0.f1 as t0_f1,t1.f2 as t1_f2 from t0,t1 where t0.x=? and t1.x= ?  and and t0.name like 'x?y' ";
// let str = "x= ?";
// let str = "select t0.f1 as t0_f1,t1.f2 as t1_f2 from t0,t1 where t0.x=?";
let reg = /\?(?!(\S*'))/g;
// console.log(reg.test(str));
let r;
let index = 0;

reg.test(str);
while((r=reg.exec(str))!==null){
    str = str.substr(0,r.index) + (':@' + index++) + str.substr(r.index+1);
    // str = str.replace(RegExp.$1,':@' + index++);
    // console.log(str);
}
console.log(str);