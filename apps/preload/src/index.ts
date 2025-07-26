import { exposeRpcBridge } from './rpc.js'
import { exposePubsubBridge } from './pubsub.js'
import { exposeIPCRefBridge } from './ipcref.js'

exposeRpcBridge()
exposePubsubBridge()
exposeIPCRefBridge()
