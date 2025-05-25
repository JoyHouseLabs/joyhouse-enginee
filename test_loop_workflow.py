#!/usr/bin/env python3
"""
测试循环工作流功能
"""

import requests
import json
import time
import sys

# API基础URL
BASE_URL = "http://localhost:1666"

# 测试用户认证token（需要替换为实际token）
AUTH_TOKEN = "your-jwt-token-here"

headers = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}

def create_simple_loop_workflow():
    """创建简单的计数循环工作流"""
    workflow_data = {
        "name": "测试计数循环",
        "description": "简单的计数循环测试",
        "nodes": [
            {
                "id": "start",
                "type": "start",
                "label": "开始",
                "position": {"x": 100, "y": 100},
                "data": {}
            },
            {
                "id": "init-counter",
                "type": "script",
                "label": "初始化计数器",
                "position": {"x": 300, "y": 100},
                "data": {
                    "script": "return { counter: 0 };"
                }
            },
            {
                "id": "loop-start",
                "type": "loop_start",
                "label": "循环开始",
                "position": {"x": 500, "y": 100},
                "data": {
                    "loopId": "counter-loop",
                    "maxIterations": 5,
                    "exitCondition": "counter >= 5"
                }
            },
            {
                "id": "increment",
                "type": "script",
                "label": "递增计数器",
                "position": {"x": 700, "y": 100},
                "data": {
                    "script": """
                        const currentCounter = context.counter || 0;
                        const newCounter = currentCounter + 1;
                        console.log(`计数: ${newCounter}`);
                        return { counter: newCounter };
                    """
                }
            },
            {
                "id": "loop-end",
                "type": "loop_end",
                "label": "循环结束",
                "position": {"x": 900, "y": 100},
                "data": {
                    "loopId": "counter-loop"
                }
            },
            {
                "id": "end",
                "type": "end",
                "label": "结束",
                "position": {"x": 1100, "y": 100},
                "data": {}
            }
        ],
        "edges": [
            {"id": "start-to-init", "source": "start", "target": "init-counter"},
            {"id": "init-to-loop", "source": "init-counter", "target": "loop-start"},
            {"id": "loop-to-increment", "source": "loop-start", "target": "increment"},
            {"id": "increment-to-end", "source": "increment", "target": "loop-end"},
            {
                "id": "loop-exit",
                "source": "loop-end",
                "target": "end",
                "condition": "loopExited === true"
            }
        ],
        "variables": {}
    }
    
    response = requests.post(f"{BASE_URL}/workflows", json=workflow_data, headers=headers)
    if response.status_code == 201:
        workflow = response.json()
        print(f"✅ 创建循环工作流成功: {workflow['id']}")
        return workflow
    else:
        print(f"❌ 创建工作流失败: {response.status_code} - {response.text}")
        return None

def create_monitoring_loop_workflow():
    """创建监控循环工作流"""
    workflow_data = {
        "name": "测试监控循环",
        "description": "持续监控直到用户输入stop",
        "nodes": [
            {
                "id": "start",
                "type": "start",
                "label": "开始",
                "position": {"x": 100, "y": 100},
                "data": {}
            },
            {
                "id": "loop-start",
                "type": "loop_start",
                "label": "开始监控循环",
                "position": {"x": 300, "y": 100},
                "data": {
                    "loopId": "monitoring-loop",
                    "maxIterations": 10,
                    "exitKeyword": "stop"
                }
            },
            {
                "id": "monitor-step",
                "type": "script",
                "label": "监控步骤",
                "position": {"x": 500, "y": 100},
                "data": {
                    "script": """
                        const iteration = context.currentIteration || 1;
                        console.log(`监控第 ${iteration} 次`);
                        return { 
                            monitoringData: `监控数据 #${iteration}`,
                            timestamp: new Date().toISOString()
                        };
                    """
                }
            },
            {
                "id": "wait-user-input",
                "type": "user_input",
                "label": "等待用户指令",
                "position": {"x": 700, "y": 100},
                "data": {
                    "prompt": "监控中... 输入'stop'停止，或其他内容继续",
                    "timeout": 30000
                }
            },
            {
                "id": "delay",
                "type": "delay",
                "label": "等待间隔",
                "position": {"x": 900, "y": 100},
                "data": {
                    "delayMs": 5000  # 5秒间隔用于测试
                }
            },
            {
                "id": "loop-end",
                "type": "loop_end",
                "label": "检查退出条件",
                "position": {"x": 1100, "y": 100},
                "data": {
                    "loopId": "monitoring-loop"
                }
            },
            {
                "id": "end",
                "type": "end",
                "label": "结束",
                "position": {"x": 1300, "y": 100},
                "data": {}
            }
        ],
        "edges": [
            {"id": "start-to-loop", "source": "start", "target": "loop-start"},
            {"id": "loop-to-monitor", "source": "loop-start", "target": "monitor-step"},
            {"id": "monitor-to-input", "source": "monitor-step", "target": "wait-user-input"},
            {"id": "input-to-delay", "source": "wait-user-input", "target": "delay"},
            {"id": "delay-to-end", "source": "delay", "target": "loop-end"},
            {
                "id": "loop-exit",
                "source": "loop-end",
                "target": "end",
                "condition": "loopExited === true"
            }
        ],
        "variables": {}
    }
    
    response = requests.post(f"{BASE_URL}/workflows", json=workflow_data, headers=headers)
    if response.status_code == 201:
        workflow = response.json()
        print(f"✅ 创建监控循环工作流成功: {workflow['id']}")
        return workflow
    else:
        print(f"❌ 创建工作流失败: {response.status_code} - {response.text}")
        return None

def publish_workflow(workflow_id):
    """发布工作流"""
    response = requests.post(f"{BASE_URL}/workflows/{workflow_id}/publish", headers=headers)
    if response.status_code == 200:
        print(f"✅ 工作流发布成功: {workflow_id}")
        return True
    else:
        print(f"❌ 工作流发布失败: {response.status_code} - {response.text}")
        return False

def validate_workflow(workflow_id):
    """验证工作流"""
    response = requests.get(f"{BASE_URL}/workflows/{workflow_id}/validate", headers=headers)
    if response.status_code == 200:
        validation = response.json()
        if validation['valid']:
            print(f"✅ 工作流验证通过: {workflow_id}")
        else:
            print(f"❌ 工作流验证失败: {validation['errors']}")
        return validation
    else:
        print(f"❌ 工作流验证请求失败: {response.status_code} - {response.text}")
        return None

def execute_workflow(workflow_id, input_data=None):
    """执行工作流"""
    execute_data = {
        "input": input_data or {},
        "triggerType": "manual"
    }
    
    response = requests.post(f"{BASE_URL}/workflows/{workflow_id}/execute", 
                           json=execute_data, headers=headers)
    if response.status_code == 200 or response.status_code == 201:
        execution = response.json()
        print(f"✅ 工作流执行开始: {execution['id']}")
        return execution
    else:
        print(f"❌ 工作流执行失败: {response.status_code} - {response.text}")
        return None

def get_execution_status(execution_id):
    """获取执行状态"""
    response = requests.get(f"{BASE_URL}/workflows/executions/{execution_id}", headers=headers)
    if response.status_code == 200:
        execution = response.json()
        return execution
    else:
        print(f"❌ 获取执行状态失败: {response.status_code} - {response.text}")
        return None

def continue_execution(execution_id, user_input):
    """继续执行（用户输入）"""
    continue_data = {"input": user_input}
    response = requests.post(f"{BASE_URL}/workflows/executions/{execution_id}/continue",
                           json=continue_data, headers=headers)
    if response.status_code == 200:
        print(f"✅ 继续执行成功")
        return True
    else:
        print(f"❌ 继续执行失败: {response.status_code} - {response.text}")
        return False

def monitor_execution(execution_id, max_wait_time=300):
    """监控执行状态"""
    start_time = time.time()
    
    while time.time() - start_time < max_wait_time:
        execution = get_execution_status(execution_id)
        if not execution:
            break
            
        status = execution['status']
        current_node = execution.get('currentNodeId', 'unknown')
        
        print(f"📊 执行状态: {status}, 当前节点: {current_node}")
        
        if status == 'completed':
            print(f"✅ 工作流执行完成!")
            print(f"📄 最终输出: {json.dumps(execution.get('output', {}), indent=2, ensure_ascii=False)}")
            break
        elif status == 'failed':
            print(f"❌ 工作流执行失败: {execution.get('error', 'Unknown error')}")
            break
        elif status == 'waiting_input':
            print(f"⏳ 等待用户输入...")
            user_input = input("请输入内容 (输入'stop'停止循环): ")
            if continue_execution(execution_id, {"userInput": user_input}):
                print(f"📤 已提交用户输入: {user_input}")
            else:
                break
        elif status in ['waiting_event', 'waiting_approval']:
            print(f"⏳ 等待外部事件或审批...")
            time.sleep(5)
        else:
            time.sleep(2)
    
    if time.time() - start_time >= max_wait_time:
        print(f"⏰ 监控超时 ({max_wait_time}秒)")

def test_simple_loop():
    """测试简单循环"""
    print("\n🔄 测试简单计数循环...")
    
    # 创建工作流
    workflow = create_simple_loop_workflow()
    if not workflow:
        return
    
    # 验证工作流
    validation = validate_workflow(workflow['id'])
    if not validation or not validation['valid']:
        return
    
    # 发布工作流
    if not publish_workflow(workflow['id']):
        return
    
    # 执行工作流
    execution = execute_workflow(workflow['id'])
    if not execution:
        return
    
    # 监控执行
    monitor_execution(execution['id'], max_wait_time=60)

def test_monitoring_loop():
    """测试监控循环"""
    print("\n🔄 测试监控循环...")
    
    # 创建工作流
    workflow = create_monitoring_loop_workflow()
    if not workflow:
        return
    
    # 验证工作流
    validation = validate_workflow(workflow['id'])
    if not validation or not validation['valid']:
        return
    
    # 发布工作流
    if not publish_workflow(workflow['id']):
        return
    
    # 执行工作流
    execution = execute_workflow(workflow['id'])
    if not execution:
        return
    
    # 监控执行
    monitor_execution(execution['id'], max_wait_time=300)

def main():
    """主函数"""
    print("🚀 开始测试循环工作流功能...")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--auth-token":
        if len(sys.argv) > 2:
            global AUTH_TOKEN
            AUTH_TOKEN = sys.argv[2]
            headers["Authorization"] = f"Bearer {AUTH_TOKEN}"
        else:
            print("❌ 请提供认证token: python test_loop_workflow.py --auth-token YOUR_TOKEN")
            return
    
    try:
        # 测试简单循环
        test_simple_loop()
        
        # 测试监控循环
        test_monitoring_loop()
        
        print("\n✅ 循环工作流测试完成!")
        
    except KeyboardInterrupt:
        print("\n⏹️ 测试被用户中断")
    except Exception as e:
        print(f"\n❌ 测试过程中发生错误: {str(e)}")

if __name__ == "__main__":
    main() 