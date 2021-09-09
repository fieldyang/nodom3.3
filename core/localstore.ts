import { Util } from "./util";

export class LocalStore {
    /**
     * all topic  subscribers
     */
    subscribers: Map<string | symbol, Array<Function>> = new Map();


    /**
     * 
     * @param type  register a topic
     * @param fn    create a function to subscribe to topics
     * @returns     A function to unsubscribe from this topic
     */
     subscribe(type: string | symbol, fn: Function): Function {

        if (!Util.isFunction(fn)) {
            throw new Error(`${fn} should be a function`);
        };

        const { subscribers } = this;
        const fnArrays: Array<Function> =
            subscribers.get(type) === undefined ?
                subscribers.set(type, new Array()).get(type) :
                subscribers.get(type);
        fnArrays.push(fn);
        return () => {
            const index = fnArrays.indexOf(fn);
            if (index === -1) {
                return;
            }
            fnArrays.splice(index, 1);
        }
    }

    /**
     * 
     * @param type  publish a topic
     * @param data Sent data
     * @returns  Whether topic are  registered subscribers
     */
    publish(type: string | symbol, data: any): boolean {
        const { subscribers } = this;
        const fnArrays: Array<Function> =
            subscribers.get(type) === undefined ?
                [] :
                subscribers.get(type);
                
        if (fnArrays.length > 0) {

            fnArrays.forEach((fn) => {
                try {
                    fn(type, data);
                } catch (e) {
                    throw new Error(`Function:${fn} execution error`);
                }
            }
            )
            return true;
        } else {
            return false;
        }
    }
    // static update(fnArrays: Function[]) {
    //     // fnArrays.
    // }
    /**
     * Clean up all message subscribers
     */
    clearAllSubscriptions() {
        this.subscribers.clear();
    }
}
