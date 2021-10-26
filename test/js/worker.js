
self.onmessage = (e)=>{

    // if(e.data.op === 1){
    //     console.log('worker 收到消息1');
    //     self.postMessage('收到消息1');
    // }else{
    //     console.log('worker 收到消息2');
    //     self.postMessage('收到消息2');
    // }
    console.log(e.data)
}