let obj = {
    name:'aaa',
    age:40,
    edu:{id:1}
}

let handler = {
    set:(src,key,value,receiver)=>{
        console.log('set',key,value,receiver===p);
        src[key] = value;
        return true;
    },
    get:(src,key,receiver)=>{
        console.log('get',key);
        //未代理则进行代理
        if(typeof src[key] === 'object' && !src[key].$proxy){
            let p1 = new Proxy(src[key],handler);
            receiver[key] = p1;
        }
        return src[key];
    }
}
let p = new Proxy(obj,handler);
p.__proxy = true;
// obj.edu.id=2;
console.log(obj,p);
