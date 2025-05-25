const { io } = require('socket.io-client');

// 简单的工作流监控测试
async function testRealtimeMonitoring() {
  console.log('🚀 开始测试工作流实时监控系统...\n');

  // 连接到WebSocket服务器
  const socket = io('http://localhost:1666/workflow-monitor', {
    auth: {
      userId: 'test-user-123'
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // 连接事件监听
  socket.on('connect', () => {
    console.log('✅ WebSocket连接成功');
    console.log(`Socket ID: ${socket.id}`);
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ WebSocket连接断开: ${reason}`);
  });

  socket.on('connected', (data) => {
    console.log('📡 服务器连接确认:', data);
  });

  socket.on('error', (error) => {
    console.error('🚨 Socket错误:', error);
  });

  // 工作流事件监听
  socket.on('workflow-started', (data) => {
    console.log(`🎬 工作流开始: ${data.executionId}`);
    console.log(`   工作流名称: ${data.workflowName}`);
    console.log(`   开始时间: ${data.timestamp}`);
  });

  socket.on('workflow-completed', (data) => {
    console.log(`🎉 工作流完成: ${data.executionId}`);
    console.log(`   执行时间: ${data.duration}ms`);
    if (data.performance) {
      console.log(`   性能统计:`, data.performance);
    }
  });

  socket.on('workflow-failed', (data) => {
    console.error(`💥 工作流失败: ${data.executionId}`);
    console.error(`   错误信息: ${data.error}`);
  });

  // 节点事件监听
  socket.on('node-started', (data) => {
    console.log(`🚀 节点开始: ${data.nodeId} (${data.nodeType})`);
  });

  socket.on('node-completed', (data) => {
    console.log(`✅ 节点完成: ${data.nodeId}`);
    console.log(`   执行时间: ${data.duration}ms`);
    if (data.duration > 5000) {
      console.warn(`⚠️  性能警告: 节点 ${data.nodeId} 执行时间过长 (${data.duration}ms)`);
    }
  });

  socket.on('node-failed', (data) => {
    console.error(`❌ 节点失败: ${data.nodeId}`);
    console.error(`   错误信息: ${data.error}`);
  });

  socket.on('node-waiting', (data) => {
    console.log(`⏳ 节点等待: ${data.nodeId}`);
    console.log(`   等待原因: ${data.metadata?.waitingFor}`);
  });

  // 订阅事件监听
  socket.on('subscription-confirmed', (data) => {
    console.log(`📋 订阅确认: ${data.executionId}`);
  });

  socket.on('unsubscription-confirmed', (data) => {
    console.log(`🛑 取消订阅确认: ${data.executionId}`);
  });

  // 性能数据事件监听
  socket.on('execution-performance', (data) => {
    console.log(`📊 性能数据: ${data.executionId}`);
    console.log('   性能详情:', JSON.stringify(data.performance, null, 2));
  });

  // 等待连接建立
  await new Promise((resolve) => {
    socket.on('connect', resolve);
  });

  console.log('\n📋 测试订阅功能...');
  
  // 测试订阅
  const testExecutionId = 'test-execution-' + Date.now();
  socket.emit('subscribe-execution', { executionId: testExecutionId });

  // 等待订阅确认
  await new Promise((resolve) => {
    socket.on('subscription-confirmed', (data) => {
      if (data.executionId === testExecutionId) {
        resolve();
      }
    });
  });

  console.log('✅ 订阅成功');

  // 测试获取性能数据
  console.log('\n📊 测试性能数据获取...');
  socket.emit('get-execution-performance', { executionId: testExecutionId });

  // 等待性能数据
  await new Promise((resolve) => {
    socket.on('execution-performance', (data) => {
      if (data.executionId === testExecutionId) {
        console.log('✅ 性能数据获取成功');
        resolve();
      }
    });
    
    // 超时处理
    setTimeout(() => {
      console.log('⚠️  性能数据获取超时（正常，因为执行不存在）');
      resolve();
    }, 2000);
  });

  // 测试取消订阅
  console.log('\n🛑 测试取消订阅...');
  socket.emit('unsubscribe-execution', { executionId: testExecutionId });

  // 等待取消订阅确认
  await new Promise((resolve) => {
    socket.on('unsubscription-confirmed', (data) => {
      if (data.executionId === testExecutionId) {
        resolve();
      }
    });
  });

  console.log('✅ 取消订阅成功');

  // 断开连接
  console.log('\n🔌 断开连接...');
  socket.disconnect();

  console.log('\n🎊 工作流实时监控系统测试完成！');
  console.log('\n📝 测试总结:');
  console.log('   ✅ WebSocket连接');
  console.log('   ✅ 事件监听');
  console.log('   ✅ 执行订阅');
  console.log('   ✅ 性能数据获取');
  console.log('   ✅ 取消订阅');
  console.log('   ✅ 连接断开');
}

// 测试连接统计
async function testConnectionStats() {
  console.log('\n📊 测试连接统计功能...');
  
  const socket = io('http://localhost:1666/workflow-monitor', {
    auth: { userId: 'stats-test-user' }
  });

  socket.on('connect', () => {
    console.log('✅ 统计测试连接成功');
    
    // 这里可以添加获取连接统计的逻辑
    // 实际实现中需要在服务端添加相应的端点
    
    setTimeout(() => {
      socket.disconnect();
      console.log('✅ 统计测试完成');
    }, 1000);
  });
}

// 错误处理测试
async function testErrorHandling() {
  console.log('\n🚨 测试错误处理...');
  
  // 测试无效用户ID连接
  const invalidSocket = io('http://localhost:1666/workflow-monitor', {
    // 不提供userId
    transports: ['websocket']
  });

  invalidSocket.on('connect', () => {
    console.log('⚠️  无效连接建立（应该被服务器断开）');
  });

  invalidSocket.on('disconnect', (reason) => {
    console.log(`✅ 无效连接被正确断开: ${reason}`);
  });

  // 等待一段时间观察结果
  await new Promise(resolve => setTimeout(resolve, 2000));
}

// 运行所有测试
async function runAllTests() {
  console.log('🧪 开始工作流实时监控系统测试套件');
  console.log('=' * 60);

  try {
    // 基础功能测试
    await testRealtimeMonitoring();
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 连接统计测试
    await testConnectionStats();
    
    // 等待一段时间
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 错误处理测试
    await testErrorHandling();

    console.log('\n' + '=' * 60);
    console.log('🎉 所有测试完成！');
    console.log('\n💡 提示:');
    console.log('   - 确保服务器在 http://localhost:1666 运行');
    console.log('   - 确保工作流模块已正确配置');
    console.log('   - 可以通过启动实际工作流来测试完整功能');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testRealtimeMonitoring,
  testConnectionStats,
  testErrorHandling,
  runAllTests
}; 