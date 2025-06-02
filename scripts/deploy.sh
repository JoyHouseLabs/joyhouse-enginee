#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置信息
SERVER_USER="root"  # 服务器用户名
SERVER_IP="10.10.0.40"  # 服务器IP
SERVER_PATH="/deploy/joyhouselabs/enginee"  # 服务器部署路径
LOCAL_PATH="$(pwd)"  # 本地项目路径

# 打印带颜色的信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装"
        exit 1
    fi
}

# 检查必要的命令
check_command "pnpm"
check_command "rsync"
check_command "ssh"

# 构建项目
print_info "开始构建项目..."
pnpm build:prod

if [ $? -ne 0 ]; then
    print_error "构建失败"
    exit 1
fi

# 创建临时目录
TEMP_DIR=$(mktemp -d)
print_info "创建临时目录: $TEMP_DIR"

# 复制必要文件到临时目录
print_info "复制文件到临时目录..."
cp -r dist-obfuscated/* $TEMP_DIR/
cp package.json $TEMP_DIR/
cp pnpm-lock.yaml $TEMP_DIR/
cp .env $TEMP_DIR/ 2>/dev/null || print_warn "未找到 .env 文件，将使用服务器上的配置"

# 同步文件到服务器
print_info "同步文件到服务器..."
rsync -avz --delete --exclude 'node_modules' $TEMP_DIR/ $SERVER_USER@$SERVER_IP:$SERVER_PATH/

if [ $? -ne 0 ]; then
    print_error "文件同步失败"
    rm -rf $TEMP_DIR
    exit 1
fi

# 清理临时目录
rm -rf $TEMP_DIR

# 在服务器上执行部署后操作
print_info "在服务器上执行部署后操作..."
ssh -t $SERVER_USER@$SERVER_IP "bash -l -c 'cd $SERVER_PATH && pnpm install --prod && pm2 restart joyhouse-engine || pm2 start dist-obfuscated/src/main.js --name joyhouse-engine'"

if [ $? -ne 0 ]; then
    print_error "服务器部署操作失败"
    exit 1
fi

print_info "部署完成！" 