#!/bin/bash

echo "🚀 工作流实时监控系统测试脚本"
echo "=================================="

# 检查Node.js和pnpm是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，请先安装 pnpm"
    exit 1
fi

echo "✅ 环境检查通过"

# 安装依赖（如果需要）
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    pnpm install
fi

# 编译项目
echo "🔨 编译项目..."
pnpm run build

if [ $? -ne 0 ]; then
    echo "❌ 编译失败"
    exit 1
fi

echo "✅ 编译成功"

# 启动服务器（后台运行）
echo "🚀 启动服务器..."
pnpm run start:dev &
SERVER_PID=$!

echo "📝 服务器 PID: $SERVER_PID"

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 10

# 检查服务器是否运行
if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "❌ 服务器启动失败"
    exit 1
fi

echo "✅ 服务器启动成功"

# 运行监控系统测试
echo "🧪 运行监控系统测试..."
node test-realtime-monitoring.js

TEST_RESULT=$?

# 清理：停止服务器
echo "🛑 停止服务器..."
kill $SERVER_PID

# 等待服务器完全停止
sleep 2

if [ $TEST_RESULT -eq 0 ]; then
    echo "🎉 监控系统测试成功！"
else
    echo "❌ 监控系统测试失败"
    exit 1
fi

echo "✅ 测试完成" 