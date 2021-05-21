let str = "select t0.f1 as t0_f1,t1.f2 as t1_f2 from t0,t1 where t0.y like '?aaa' and t0.x= ? and t1.x=? and t0.name like 'x?y' ";
// str = "x= '?124";
// let str = "select t0.f1 as t0_f1,t1.f2 as t1_f2 from t0,t1 where t0.x=?";
str = "insert t1(x,y,z) values (?, ? ,?)";
str = "update t1 set x=?,y=?,  z =  ? where d= ?";
let reg = /(\'.*?\?.*?\')|\?/g;
// console.log(reg.test(str));
let r;
let index = 0;
let addInd = 0;
let s = str.replace(reg,(match,p1,offset,str1)=>{
    if(match !== '?'){
        return p1;
    }
    return (':@' + index++);
    // console.log(match,p1,offset,str1);
    // str = str.substr(0,offset+addInd) + (':@' + index++) + str.substr(offset + addInd +1);
    // addInd += 2;
    // console.log(str);
    // return str;
});
console.log(s);


// console.log(reg.test(str));
// while((r=reg.exec(str))!==null){
//     console.log(r);
//     // str = str.substr(0,r.index) + (':@' + index++) + str.substr(r.index+1);
//     // str = str.replace(RegExp.$1,':@' + index++);
//     // console.log(str);
// }
// console.log(str);