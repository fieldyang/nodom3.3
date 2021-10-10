var kayak = (function () {
  'use strict';

  const randomString = () => Math.random().toString(36).substring(8).split('').join('_');
  const ActionTypes = {
      INIT: `@@kayak/INIT${randomString()}`,
      REPLACE: `@@kayak/REPLACE${randomString()}`,
  };
  function isObject(action) {
      return typeof action == 'object' && action != null;
  }

  class Watcher {
      static watchers = [];
      static keyMap = new Map();
      static isExec = false;
      static async update(key, fn) {
          if (this.isExec) {
              return;
          }
          this.isExec = true;
          let extra = [];
          if (key !== undefined) {
              extra = Watcher.keyMap.get(key) || [];
          }
          let watchers = [...Watcher.watchers, ...extra];
          await fn();
          watchers?.forEach(fn => fn());
          this.isExec = false;
      }
      static remove(fn, key) {
          let watchers = this.watchSelect(key);
          watchers?.splice(watchers.indexOf(fn), 1);
      }
      static add(fn, key) {
          let watchers = this.watchSelect(key);
          if (key && watchers === undefined) {
              this.keyMap.set(key, new Array());
              this.keyMap.get(key)?.push(fn);
          }
          watchers?.push(fn);
      }
      static watchSelect(key) {
          return key === undefined ? Watcher.watchers : Watcher.keyMap.get(key);
      }
  }

  class Model {
      constructor(data, fn) {
          let proxy = new Proxy(data, {
              set: (src, key, value, receiver) => {
                  //值未变,proxy 不处理
                  if (src[key] === value) {
                      return true;
                  }
                  //不处理原型属性 
                  let excludes = ['__proto__', 'constructor'];
                  if (excludes.includes(key)) {
                      return true;
                  }
                  if (key != '$watch') {
                      Watcher.update(key, fn);
                  }
                  return Reflect.set(src, key, value, receiver);
              },
              get: (src, key, receiver) => {
                  let res = Reflect.get(src, key, receiver);
                  let data = ModelManager.getFromDataMap(src[key]);
                  if (data) {
                      return data;
                  }
                  if (typeof res === 'object' && res !== null) {
                      if (!src[key].$watch) {
                          let p = new Model(res, fn);
                          return p;
                      }
                  }
                  return res;
              },
              deleteProperty: function (src, key) {
                  if (src[key] != null && typeof src[key] === 'object') {
                      ModelManager.delToDataMap(src[key]);
                  }
                  delete src[key];
                  return true;
              }
          });
          proxy.$watch = true;
          ModelManager.addToDataMap(data, proxy);
          return proxy;
      }
  }
  class ModelManager {
      static dataMap = new WeakMap();
      static addToDataMap(data, proxy) {
          this.dataMap.set(data, proxy);
      }
      static delToDataMap(data) {
          this.dataMap.delete(data);
      }
      static getFromDataMap(data) {
          return this.dataMap.get(data);
      }
  }

  function combineReducers(reducers) {
      const reducerKeys = Object.keys(reducers);
      const combineReducers = {};
      for (let i = 0; i < reducerKeys.length; i++) {
          const key = reducerKeys[i];
          if (typeof reducers[key] === 'function') {
              combineReducers[key] = reducers[key];
          }
          else {
              throw new Error(`${key}对应的reducer不是函数，请确保${reducers[key]}为函数,
                      Please ensure that the reducer you provide is a function
        `);
          }
      }
      const combineKeys = Object.keys(combineReducers);
      let shapeAssertionError;
      try {
          assertReducerShape(combineReducers);
      }
      catch (e) {
          shapeAssertionError = e;
      }
      return function (state = {}, action) {
          if (shapeAssertionError) {
              throw shapeAssertionError;
          }
          for (let i = 0; i < combineKeys.length; i++) {
              const key = combineKeys[i];
              const reducer = combineReducers[key];
              const previousStateForKey = state[key];
              const nextStateForKey = reducer(previousStateForKey, action);
              if (typeof nextStateForKey === 'undefined') {
                  const actionType = action && action.type;
                  throw new Error(`When called with an action of type ${actionType ? `"${String(actionType)}"` : '(unknown type)'}, the slice reducer for key "${key}" returned undefined. ` +
                      `To ignore an action, you must explicitly return the previous state. ` +
                      `If you want this reducer to hold no value, you can return null instead of undefined.`);
              }
              state[key] = nextStateForKey;
          }
      };
  }
  function assertReducerShape(reducers) {
      Object.keys(reducers).forEach(key => {
          const reducer = reducers[key];
          const initialState = reducer(undefined, { type: ActionTypes.INIT });
          if (typeof initialState === 'undefined') {
              throw new Error(`The slice reducer for key "${key}" returned undefined during initialization. ` +
                  `If the state passed to the reducer is undefined, you must ` +
                  `explicitly return the initial state. The initial state may ` +
                  `not be undefined. If you don't want to set a value for this reducer, ` +
                  `you can use null instead of undefined.`);
          }
          if (typeof reducer(undefined, {
              type: ActionTypes.INIT + '1'
          }) === 'undefined') {
              throw new Error(`The slice reducer for key "${key}" returned undefined when probed with a random type. ` +
                  `Don't try to handle '${ActionTypes.INIT}' or other actions in "redux/*" ` +
                  `namespace. They are considered private. Instead, you must return the ` +
                  `current state for any unknown actions, unless it is undefined, ` +
                  `in which case you must return the initial state, regardless of the ` +
                  `action type. The initial state may not be undefined, but can be null.`);
          }
      });
  }

  function clone(proxy, ...exc) {
      let ds = Object.getOwnPropertyNames(proxy);
      let res = new Object();
      for (let i = 0; i < ds.length; i++) {
          if (proxy.hasOwnProperty(ds[i]) && ds[i] !== '$watch' && !exc.includes(ds[i])) {
              let param = Reflect.get(proxy, ds[i]);
              Object.defineProperty(res, ds[i], {
                  value: function () {
                      if (typeof param === 'object' && param !== null) {
                          return clone(param);
                      }
                      else {
                          return param;
                      }
                  }(),
                  enumerable: true
              });
          }
      }
      return res;
  }

  /**
   *
   * @param reducer A function to process your action state
   * @returns An object that controls your state repository
   */
  function createStore(reducer) {
      /**
       * Is the scheduling Reducer method being executed
       */
      let isDispatching = false;
      /**
       *
       *  If there is only one reducer function, set the default value
       */
      let currentReducer = typeof reducer === 'function' ? reducer : combineReducers(reducer);
      /**
       *
          初始化数据
          Initialization data
       */
      let data = {
          'currentState': undefined
      };
      /**
       * 初始化代理对象返回的proxy
       * Initializes the proxy returned by the proxy object
       */
      let proxy;
      let combine = typeof reducer === 'function' ? false : true;
      /**
       *
       * @param action Action对象，要求传入type,
       *              Action object. Type is required
       */
      function dispatch(action) {
          if (!isObject(action)) {
              throw new Error(`Actions must be a objects. Instead, the actual type was: '${typeof action}'`);
          }
          if (typeof action.type === 'undefined') {
              throw new Error('Actions may not have an undefined "type" property. You may have misspelled an action type string constant.');
          }
          let currentState = data.currentState;
          try {
              isDispatching = true;
              if (combine) {
                  currentReducer(proxy, action);
              }
              else {
                  proxy['currentState'] = currentReducer(currentState, action);
              }
          }
          finally {
              isDispatching = false;
          }
      }
      function subscribe(listener, key) {
          if (typeof listener !== 'function') {
              throw new Error(`Expected the listener to be a function. Instead, received: '${typeof (listener)}'`);
          }
          if (isDispatching) {
              throw new Error('You may not call store.subscribe() while the reducer is executing. ' +
                  'If you would like to be notified after the store has been updated, subscribe from a ' +
                  'component and invoke store.getState() in the callback to access the latest state. ' +
                  'See https://redux.js.org/api/store#subscribelistener for more details.');
          }
          let isSubscribed = true;
          key !== undefined ? Watcher.add(listener, key) : Watcher.add(listener);
          return function unsubscribe() {
              if (!isSubscribed) {
                  return;
              }
              if (isDispatching) {
                  throw new Error('You may not unsubscribe from a store listener while the reducer is executing. ');
              }
              Watcher.remove(listener, key);
              isSubscribed = false;
          };
      }
      function getState() {
          if (isDispatching) {
              throw new Error('You may not call store.getState() while the reducer is executing. ' +
                  'The reducer has already received the state as an argument. ' +
                  'Pass it down from the top reducer instead of reading it from the store.' +
                  'reducer还在执行中');
          }
          /**
           * get clone object
           */
          const res = combine ? clone(data, 'currentState') : clone(data);
          return combine ? res : res['currentState'];
      }
      /**
       *
       * @param newReducer A new Reducer replaces the original reducer function
       * @returns store
       */
      function replace(newReducer) {
          if (typeof newReducer !== 'function') {
              throw new Error(`Expected the nextReducer to be a function. Instead, received: '${typeof newReducer}`);
          }
          currentReducer = newReducer;
          dispatch({ type: ActionTypes.REPLACE });
          return store;
      }
      function update() {
          isDispatching = false;
      }
      /**
       *   proxy Initialize data
       */
      proxy = new Model(data, update);
      /**
       * state get default data
       */
      dispatch({ type: ActionTypes.INIT });
      const store = {
          dispatch: dispatch,
          subscribe,
          getState,
          replace,
      };
      return store;
  }

  return createStore;

}());
//# sourceMappingURL=kayak.js.map
