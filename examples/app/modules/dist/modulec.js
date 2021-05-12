/**
 * 模块A
 */
class ModuleC extends nodom.Module {
    constructor(cfg) {
        let config = nodom.Util.merge(cfg, {
            template: 'c.html',
            data: {
                from: 'xx',
                msg: '发送消息',
                msg1: 'yyy',
            },
            methods: {
                sendMsg: function (dom, module) {
                    module.broadcast(this.msg);
                },
                sendParent: function (dom, module) {
                    module.send('modb1', this.msg);
                },
                onReceive: function (module,from, msg) {
                    this.msg1 = msg;
                    this.from = from;
                }
            }
        });
        super(config);
    }
}
//# sourceMappingURL=modulec.js.map