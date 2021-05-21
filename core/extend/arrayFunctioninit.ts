export const arrayFunc = new Map<string, Function>();

(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    const method = Array.prototype[key] as any;
    arrayFunc[key] = function (this: unknown[], ...args: unknown[]) {
        const res = method.apply(this, args);
        return res;
    }
});


// (['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
//     const method = Array.prototype[key] as any;
//     arrayFunc[key] = function (this: unknown[], ...args: unknown[]) {
//         console.log(this);

//     }

// });
