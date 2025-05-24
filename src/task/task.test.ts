import { DataSource } from 'typeorm';
import { TaskGroup } from './task-group.entity';
import { TaskItem } from './task-item.entity';
import { TaskType } from './task-query.dto';
import { Reward, RewardType } from '../reward/reward.entity';

async function test() {
  // 创建数据库连接
  const dataSource = new DataSource({
    type: 'sqlite',
    database: 'test.db',
    entities: [TaskGroup, TaskItem, Reward],
    synchronize: true,
  });

  try {
    // 初始化连接
    await dataSource.initialize();
    console.log('数据库连接成功');

    // 1. 创建奖励
    const reward = new Reward();
    reward.name = "新手奖励";
    reward.icon = "reward.png";
    reward.description = "完成新手任务获得的奖励";
    reward.type = RewardType.POINTS;
    reward.amount = 1000;
    reward.isActive = true;

    const savedReward = await dataSource.getRepository(Reward).save(reward);
    console.log('创建奖励成功:', savedReward);

    // 2. 创建任务组
    const taskGroup = new TaskGroup();
    taskGroup.name = "新手引导";
    taskGroup.icon = "guide.png";
    taskGroup.description = "新用户引导任务";
    taskGroup.weight = 1;
    taskGroup.trigger = JSON.stringify({
      type: "first_login",
      params: {}
    });
    taskGroup.reward = savedReward;
    taskGroup.requireAllTasksCompleted = true; // 需要完成所有任务才给奖励

    // 保存任务组
    const savedTaskGroup = await dataSource.getRepository(TaskGroup).save(taskGroup);
    console.log('创建任务组成功:', savedTaskGroup);

    // 3. 创建关联到任务组的任务项
    const groupTask = new TaskItem();
    groupTask.name = "完善个人资料";
    groupTask.icon = "profile.png";
    groupTask.description = "请完善您的个人资料";
    groupTask.type = TaskType.CUSTOM;
    groupTask.weight = 1;
    groupTask.taskGroup = savedTaskGroup;
    groupTask.reward = savedReward; // 单个任务也可以有奖励

    // 保存关联任务项
    const savedGroupTask = await dataSource.getRepository(TaskItem).save(groupTask);
    console.log('创建关联任务项成功:', savedGroupTask);

    // 4. 查询任务组及其任务项
    const taskGroupWithItems = await dataSource.getRepository(TaskGroup)
      .findOne({
        where: { id: savedTaskGroup.id },
        relations: ['taskItems', 'reward']
      });
    console.log('查询任务组及其任务项:', JSON.stringify(taskGroupWithItems, null, 2));

    // 5. 查询所有任务项（包括独立和关联的）
    const allTasks = await dataSource.getRepository(TaskItem).find({
      relations: ['taskGroup', 'reward']
    });
    console.log('所有任务项:', JSON.stringify(allTasks, null, 2));

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 关闭数据库连接
    await dataSource.destroy();
    console.log('数据库连接已关闭');
  }
}

// 执行测试
test(); 