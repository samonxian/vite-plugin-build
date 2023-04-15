export interface TaskResult {
  success: boolean;
  fail: boolean;
  reTryTimes: number;
  err?: Error;
  result?: any;
}

export interface ReturnTaskListResult {
  hasPartialError: boolean | null;
  result: TaskResult[];
}
/**
 * 在任务池中并发运行任务，可设置任务池中最大并发任务量，后续的任务需等待前面的任务完成才能运行，默认为 6 个
 * @param taskList 任务列表，可以是任意的数组
 * @param taskEachCallback(task, taskIndex) 任务运行后每个遍历的回调（需返回 Promise），建议使用 async 函数，然后需要把处理的结果返回
 * 如果有错误也需要抛出
 * @param options.limit 当前可并发运行的最大任务数 @deault 6
 * @param options.limitReTryTimes 每个任务失败后重试的次数 @deault 3
 * @returns
 * {
 *   hasPartialError: true,  // 有部分错误
 *   result: [
 *     { success: true, fail: false, reTryTimes: 0, result: 1, err: null},
 *     { success: false, fail: true, reTryTimes: 0, err: Error('error') }
 *   ]
 * }
 */
function runInTaskPool(
  taskList: any[],
  taskEachCallback: (task: any, taskIndex: number) => Promise<any>,
  options: { limit?: number; limitReTryTimes?: number } = { limit: 6, limitReTryTimes: 3 },
): Promise<ReturnTaskListResult> {
  if (!Array.isArray(taskList)) {
    throw new Error('Expected the taskList to be an array.');
  }
  if (!taskEachCallback) {
    throw new Error('The taskEachCallback is required.');
  }
  if (taskList.length === 0) {
    return Promise.resolve({ hasPartialError: null, result: [] });
  }

  let { limit } = options;
  const { limitReTryTimes } = options;

  if (taskList.length < limit) {
    limit = taskList.length;
  }

  // 累计完成任务量
  let accFinishedTaskCount = 0;
  // 任务当前运行到了哪个位置，一开始默认为 limit，后面成功或者失败一个就加 1
  let taskProgressIndex = limit - 1;
  let hasPartialError = false;
  // 正在运行任务数，最大值为 limit
  runInTaskPool.runningTaskCount = limit;
  // 完成后的所有任务状态记录
  const taskListStatus: TaskResult[] = [
    { success: false, fail: false, reTryTimes: 0, err: undefined, result: undefined },
  ];

  return new Promise((resolve) => {
    const run = (taskIndex: number) => {
      taskEachCallback(taskList[taskIndex], taskIndex)
        .then((result) => {
          runInTaskPool.runningTaskCount -= 1;
          accFinishedTaskCount += 1;
          taskListStatus[taskIndex] = { success: true, fail: false, reTryTimes: 0, result, err: undefined };

          if (accFinishedTaskCount === taskList.length) {
            resolve({ hasPartialError, result: taskListStatus });
          } else if (taskProgressIndex < taskList.length - 1) {
            taskProgressIndex += 1;
            runInTaskPool.runningTaskCount += 1;
            // 队列中有任务成功后添加一个任务进来，直到全部处理完成
            run(taskProgressIndex);
          }
        })
        .catch((err) => {
          if (!taskListStatus[taskIndex]) {
            taskListStatus[taskIndex] = {
              success: false,
              fail: true,
              reTryTimes: 0,
              err: undefined,
              result: undefined,
            };
          }
          if (taskListStatus[taskIndex].reTryTimes >= limitReTryTimes) {
            runInTaskPool.runningTaskCount -= 1;
            taskListStatus[taskIndex].fail = true;
            taskListStatus[taskIndex].err = err;
            accFinishedTaskCount += 1;

            if (accFinishedTaskCount === taskList.length) {
              hasPartialError = true;
              resolve({ hasPartialError, result: taskListStatus });
            } else if (taskProgressIndex < taskList.length - 1) {
              taskProgressIndex += 1;
              // 队列中有任务失败后添加一个任务进来，直到全部处理完成
              runInTaskPool.runningTaskCount += 1;
              run(taskProgressIndex);
            }
          } else {
            taskListStatus[taskIndex].reTryTimes += 1;
            // 重试
            run(taskIndex);
          }
        });
    };

    for (let i = 0; i < limit; i++) {
      run(i);
    }
  });
}

runInTaskPool.runningTaskCount = 0;

export default runInTaskPool;
