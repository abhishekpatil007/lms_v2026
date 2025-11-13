import { createModuleLogger } from '../logger.js';
const batchLogger = createModuleLogger('batch', { errorsOnly: false });
export default batchLogger;
