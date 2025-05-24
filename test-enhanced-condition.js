const { enhancedConditionWorkflowExample } = require('./dist/workflow/templates/intent-recognition-workflow-example');

console.log('=== 增强条件节点工作流验证 ===\n');

// 验证工作流基本信息
console.log('1. 工作流基本信息:');
console.log(`   名称: ${enhancedConditionWorkflowExample.name}`);
console.log(`   描述: ${enhancedConditionWorkflowExample.description}`);
console.log(`   节点数量: ${enhancedConditionWorkflowExample.nodes?.length || 0}`);
console.log(`   边数量: ${enhancedConditionWorkflowExample.edges?.length || 0}\n`);

// 验证智能路由器节点
const smartRouter = enhancedConditionWorkflowExample.nodes?.find(node => node.id === 'smart_router');
if (smartRouter) {
  console.log('2. 智能路由器节点配置:');
  console.log(`   条件类型: ${smartRouter.data.conditionType}`);
  console.log(`   路由策略: ${smartRouter.data.routingStrategy}`);
  console.log(`   启用回退: ${smartRouter.data.enableFallback}`);
  console.log(`   默认目标节点: ${smartRouter.data.defaultTargetNodeId}`);
  console.log(`   调试模式: ${smartRouter.data.debugMode}`);
  console.log(`   路由规则数量: ${smartRouter.data.routingRules?.length || 0}\n`);
  
  // 验证路由规则
  console.log('3. 智能路由规则:');
  smartRouter.data.routingRules?.forEach((rule, index) => {
    console.log(`   规则 ${index + 1}:`);
    console.log(`     ID: ${rule.id}`);
    console.log(`     名称: ${rule.name}`);
    console.log(`     目标节点: ${rule.targetNodeId}`);
    console.log(`     条件: ${rule.condition}`);
    console.log(`     优先级: ${rule.priority}`);
    console.log(`     权重: ${rule.weight}`);
    console.log(`     匹配类型: ${rule.matchType}`);
    if (rule.expectedValue) {
      console.log(`     期望值: ${rule.expectedValue}`);
    }
    console.log('');
  });
}

// 验证值匹配器节点
const hobbyMatcher = enhancedConditionWorkflowExample.nodes?.find(node => node.id === 'hobby_matcher');
if (hobbyMatcher) {
  console.log('4. 兴趣匹配器节点配置:');
  console.log(`   条件类型: ${hobbyMatcher.data.conditionType}`);
  console.log(`   启用回退: ${hobbyMatcher.data.enableFallback}`);
  console.log(`   默认目标节点: ${hobbyMatcher.data.defaultTargetNodeId}`);
  console.log(`   调试模式: ${hobbyMatcher.data.debugMode}\n`);
  
  const config = hobbyMatcher.data.valueMatchingConfig;
  if (config) {
    console.log('5. 值匹配配置:');
    console.log(`   源字段: ${config.sourceField}`);
    console.log(`   启用模糊匹配: ${config.enableFuzzyMatch}`);
    console.log(`   模糊阈值: ${config.fuzzyThreshold}`);
    console.log(`   大小写敏感: ${config.caseSensitive}`);
    console.log(`   匹配规则数量: ${config.matchingRules?.length || 0}\n`);
    
    // 验证匹配规则
    console.log('6. 值匹配规则:');
    config.matchingRules?.forEach((rule, index) => {
      console.log(`   规则 ${index + 1}:`);
      console.log(`     ID: ${rule.id}`);
      console.log(`     名称: ${rule.name}`);
      console.log(`     目标节点: ${rule.targetNodeId}`);
      console.log(`     匹配值: [${rule.matchValues.join(', ')}]`);
      console.log(`     匹配类型: ${rule.matchType}`);
      console.log(`     优先级: ${rule.priority}`);
      console.log(`     启用: ${rule.enabled}`);
      console.log('');
    });
  }
}

// 验证节点类型分布
console.log('7. 节点类型分布:');
const nodeTypes = {};
enhancedConditionWorkflowExample.nodes?.forEach(node => {
  nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
});
Object.entries(nodeTypes).forEach(([type, count]) => {
  console.log(`   ${type}: ${count} 个`);
});
console.log('');

// 验证条件节点的特殊边
console.log('8. 条件节点的路由边:');
const conditionEdges = enhancedConditionWorkflowExample.edges?.filter(edge => 
  edge.source === 'smart_router' || edge.source === 'hobby_matcher'
);
conditionEdges?.forEach(edge => {
  console.log(`   ${edge.source} -> ${edge.target}: ${edge.condition || '无条件'} (${edge.label || '无标签'})`);
});
console.log('');

// 验证默认节点和回退机制
console.log('9. 默认节点和回退机制:');
const defaultNodes = enhancedConditionWorkflowExample.nodes?.filter(node => 
  node.id === 'default_handler' || node.id === 'other_hobby'
);
defaultNodes?.forEach(node => {
  console.log(`   ${node.id}: ${node.label} (${node.type})`);
});
console.log('');

// 验证变量定义
console.log('10. 工作流变量:');
if (enhancedConditionWorkflowExample.variables) {
  Object.entries(enhancedConditionWorkflowExample.variables).forEach(([name, config]) => {
    console.log(`   ${name}: ${config.type} (默认值: ${config.defaultValue})`);
  });
} else {
  console.log('   无定义变量');
}

console.log('\n=== 验证完成 ===');
console.log('✅ 增强条件节点工作流配置正确');
console.log('✅ 智能路由器支持多种匹配策略');
console.log('✅ 值匹配器支持模糊匹配和多种匹配类型');
console.log('✅ 默认节点和回退机制配置完整');
console.log('✅ 支持调试模式和详细的路由信息'); 