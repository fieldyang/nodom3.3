let map = new Map();
map.set('a',1);
map.set('b',{x:2});
for(let o in map){
    console.log(o);
}

let o = {a:1,b:2}
let arr = [1,2,3,4];
console.log(Object.values(o));