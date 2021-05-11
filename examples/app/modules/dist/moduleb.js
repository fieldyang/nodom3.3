/**
 * 模块A
 */
class ModuleB extends nodom.Module {
    constructor(cfg) {
        let config = nodom.Util.merge(cfg, {
            template: 'b.html',
            data: {
                from: '',
                msg: '发送消息',
                msg1: ''
            },
            methods: {
                sendMsg: function (dom, module) {
                    console.log(this.msg);
                    module.broadcast(this.msg);
                },
                sendParent: function (dom, module) {
                    module.send('modb1', this.msg,2);
                },
                onReceive: function (module, from, msg) {
                    this.msg1 = msg;
                    this.from = from;
                }
            }
        });
        super(config);
    }
}
//# sourceMappingURL=moduleb.js.map