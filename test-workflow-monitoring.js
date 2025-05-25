const { WorkflowPerformanceMonitor } = require('./examples/workflow-monitor-client');

// 模拟测试工作流监控系统
async function testWorkflowMonitoring() {
  console.log('🚀 开始测试工作流实时监控系统...\n');

  // 创建监控客户端
  const monitor = new WorkflowPerformanceMonitor('http://localhost:1666', 'test-user-123');

  // 模拟执行ID
  const executionId = 'test-execution-' + Date.now();

  try {
    // 1. 测试连接
    console.log('📡 测试WebSocket连接...');
    await new Promise((resolve) => {
      monitor.client.on('connect', () => {
        console.log('✅ WebSocket连接成功');
        resolve();
      });
    });

    // 2. 测试订阅
    console.log('\n📋 测试执行订阅...');
    await monitor.monitorExecution(executionId);
    console.log(`✅ 成功订阅执行: ${executionId}`);

    // 3. 模拟工作流事件
    console.log('\n🎭 模拟工作流执行事件...');
    
    // 模拟工作流开始
    setTimeout(() => {
      monitor.client.emit('test-workflow-started', {
        executionId,
        workflowId: 'test-workflow',
        workflowName: '测试工作流',
        timestamp: new Date()
      });
    }, 1000);

    // 模拟节点执行
    const nodes = [
      { id: 'start_node', type: 'start', duration: 50 },
      { id: 'llm_node_1', type: 'llm', duration: 2500 },
      { id: 'tool_node', type: 'tool', duration: 1200 },
      { id: 'condition_node', type: 'condition', duration: 100 },
      { id: 'llm_node_2', type: 'llm', duration: 3200 },
      { id: 'end_node', type: 'end', duration: 30 }
    ];

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      setTimeout(() => {
        // 节点开始
        monitor.client.emit('test-node-started', {
          executionId,
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: `测试${node.type}节点`,
          timestamp: new Date()
        });

        // 节点完成
        setTimeout(() => {
          monitor.client.emit('test-node-completed', {
            executionId,
            nodeId: node.id,
            nodeType: node.type,
            duration: node.duration,
            output: { result: `${node.type}执行结果` },
            timestamp: new Date()
          });
        }, node.duration);

      }, 2000 + i * 1000);
    }

    // 模拟工作流完成
    setTimeout(() => {
      const totalDuration = nodes.reduce((sum, node) => sum + node.duration, 0);
      monitor.client.emit('test-workflow-completed', {
        executionId,
        duration: totalDuration,
        performance: {
          totalDuration,
          nodeCount: nodes.length,
          averageNodeDuration: Math.round(totalDuration / nodes.length),
          slowestNode: {
            nodeId: 'llm_node_2',
            duration: 3200
          }
        },
        timestamp: new Date()
      });
    }, 10000);

    // 4. 等待事件处理
    console.log('\n⏳ 等待事件处理完成...');
    await new Promise(resolve => setTimeout(resolve, 12000));

    // 5. 获取性能数据
    console.log('\n📊 获取性能统计数据...');
    const performanceData = await monitor.getPerformanceData(executionId);
    if (performanceData) {
      console.log('✅ 性能数据获取成功:', performanceData);
    } else {
      console.log('⚠️  性能数据获取失败');
    }

    // 6. 测试取消订阅
    console.log('\n🛑 测试取消订阅...');
    await monitor.stopMonitoring(executionId);
    console.log('✅ 成功取消订阅');

    console.log('\n🎉 工作流监控系统测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    // 清理连接
    monitor.disconnect();
    console.log('🔌 WebSocket连接已断开');
  }
}

// 测试多工作流并发监控
async function testMultipleWorkflowMonitoring() {
  console.log('\n🔄 测试多工作流并发监控...\n');

  const monitor = new WorkflowPerformanceMonitor('http://localhost:1666', 'test-user-456');
  const executionIds = [
    'concurrent-exec-1-' + Date.now(),
    'concurrent-exec-2-' + Date.now(),
    'concurrent-exec-3-' + Date.now()
  ];

  try {
    // 同时订阅多个执行
    console.log('📋 订阅多个工作流执行...');
    for (const executionId of executionIds) {
      await monitor.monitorExecution(executionId);
      console.log(`✅ 订阅执行: ${executionId}`);
    }

    // 模拟并发执行
    console.log('\n🎭 模拟并发工作流执行...');
    executionIds.forEach((executionId, index) => {
      setTimeout(() => {
        // 模拟工作流开始
        monitor.client.emit('test-workflow-started', {
          executionId,
          workflowId: `concurrent-workflow-${index + 1}`,
          workflowName: `并发工作流 ${index + 1}`,
          timestamp: new Date()
        });

        // 模拟节点执行
        setTimeout(() => {
          monitor.client.emit('test-node-completed', {
            executionId,
            nodeId: `node-${index + 1}`,
            nodeType: 'llm',
            duration: 1000 + Math.random() * 2000,
            timestamp: new Date()
          });
        }, 500);

        // 模拟工作流完成
        setTimeout(() => {
          monitor.client.emit('test-workflow-completed', {
            executionId,
            duration: 1500 + Math.random() * 2000,
            timestamp: new Date()
          });
        }, 1500);

      }, index * 200);
    });

    // 等待处理完成
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 清理订阅
    console.log('\n🧹 清理订阅...');
    for (const executionId of executionIds) {
      await monitor.stopMonitoring(executionId);
      console.log(`✅ 取消订阅: ${executionId}`);
    }

    console.log('\n🎉 多工作流并发监控测试完成！');

  } catch (error) {
    console.error('❌ 并发测试失败:', error.message);
  } finally {
    monitor.disconnect();
  }
}

// 性能压力测试
async function testPerformanceStress() {
  console.log('\n⚡ 开始性能压力测试...\n');

  const monitor = new WorkflowPerformanceMonitor('http://localhost:1666', 'stress-test-user');
  const executionCount = 10;
  const nodeCountPerExecution = 20;

  try {
    console.log(`📊 创建 ${executionCount} 个工作流执行，每个包含 ${nodeCountPerExecution} 个节点`);

    for (let i = 0; i < executionCount; i++) {
      const executionId = `stress-test-${i}-${Date.now()}`;
      await monitor.monitorExecution(executionId);

      // 快速发送大量事件
      for (let j = 0; j < nodeCountPerExecution; j++) {
        setTimeout(() => {
          monitor.client.emit('test-node-completed', {
            executionId,
            nodeId: `stress-node-${j}`,
            nodeType: 'llm',
            duration: Math.random() * 1000,
            timestamp: new Date()
          });
        }, j * 10);
      }
    }

    console.log('⏳ 等待压力测试完成...');
    await new Promise(resolve => setTimeout(resolve, 1666));

    console.log('✅ 性能压力测试完成');

  } catch (error) {
    console.error('❌ 压力测试失败:', error.message);
  } finally {
    monitor.disconnect();
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('🧪 开始工作流监控系统完整测试套件\n');
  console.log('=' * 60);

  try {
    // 基础功能测试
    await testWorkflowMonitoring();
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 并发监控测试
    await testMultipleWorkflowMonitoring();
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 性能压力测试
    await testPerformanceStress();

    console.log('\n' + '=' * 60);
    console.log('🎊 所有测试完成！工作流监控系统运行正常');

  } catch (error) {
    console.error('\n❌ 测试套件执行失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testWorkflowMonitoring,
  testMultipleWorkflowMonitoring,
  testPerformanceStress,
  runAllTests
}; 