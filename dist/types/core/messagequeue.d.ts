/**
 * 消息类
 */
export declare class Message {
    /**
     * 来源模块id
     */
    fromModule: number;
    /**
     * 目标模块id 或 名字
     */
    toModule: number | string;
    /**
     * 来源模块父id，当 toModule 为模块名时需要
     */
    parentId: number;
    /**
     * 消息内容
     */
    content: any;
    /**
     * @param fromModule 	来源模块id
     * @param toModule 		目标模块id或名字
     * @param content 		消息内容
     * @param parentId      父模块id
     */
    constructor(fromModule: number, toModule: number | string, content: any, parentId?: number);
}
/**
 * 消息队列
 */
export declare class MessageQueue {
    /**
     * 消息数组
     */
    static messages: Array<Message>;
    static noOwnerNMessages: Array<Message>;
    /**
     * 添加消息到消息队列
     * @param fromModule 	来源模块名
     * @param toModule 		目标模块名
     * @param content 		消息内容
     * @param parentId      父模块消息
     */
    static add(from: number, to: number | string, data: any, parentId?: number): void;
    /**
     * 从 no owner队列移动到 待发队列
     * @param moduleName    模块名
     * @param moduleId      模块id
     * @param parentId      父模块id
     */
    static move(moduleName: string, moduleId: number, parentId: number): void;
    /**
     * 处理消息队列
     */
    static handleQueue(): void;
}
