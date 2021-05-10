import { ModuleFactory } from "./modulefactory";
/**
 * 消息类
 */
export class Message {
    /**
     * @param fromModule 	来源模块id
     * @param toModule 		目标模块id或名字
     * @param content 		消息内容
     * @param parentId      父模块id
     */
    constructor(fromModule, toModule, content, parentId) {
        this.fromModule = fromModule;
        this.toModule = toModule;
        this.content = content;
        this.parentId = parentId;
    }
}
/**
 * 消息队列
 */
export class MessageQueue {
    /**
     * 添加消息到消息队列
     * @param fromModule 	来源模块名
     * @param toModule 		目标模块名
     * @param content 		消息内容
     * @param parentId      父模块消息
     */
    static add(from, to, data, parentId) {
        if (parentId) {
            this.noOwnerNMessages.push(new Message(from, to, data, parentId));
        }
        else {
            this.messages.push(new Message(from, to, data));
        }
    }
    /**
     * 从 no owner队列移动到 待发队列
     * @param moduleName    模块名
     * @param moduleId      模块id
     * @param parentId      父模块id
     */
    static move(moduleName, moduleId, parentId) {
        let index;
        while ((index = this.noOwnerNMessages.findIndex(item => item.parentId === parentId && moduleName === item.toModule)) !== -1) {
            let msg = this.noOwnerNMessages[index];
            //从noowner数组移除
            this.noOwnerNMessages.splice(index, 1);
            msg.toModule = moduleId;
            delete msg.parentId;
            //加入待发队列
            this.messages.push(msg);
        }
    }
    /**
     * 处理消息队列
     */
    static handleQueue() {
        for (let i = 0; i < this.messages.length; i++) {
            let msg = this.messages[i];
            let module = ModuleFactory.get(msg.toModule);
            // 模块状态未激活或激活才接受消息
            if (module && module.state >= 2) {
                module.receive(msg.fromModule, msg.content);
                // 清除已接受消息，或已死亡模块的消息
                MessageQueue.messages.splice(i--, 1);
            }
        }
    }
}
/**
 * 消息数组
 */
MessageQueue.messages = [];
MessageQueue.noOwnerNMessages = [];
//# sourceMappingURL=messagequeue.js.map