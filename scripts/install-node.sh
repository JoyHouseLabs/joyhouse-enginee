#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then 
    print_error "请使用 sudo 运行此脚本"
    exit 1
fi

# 安装必要的依赖
print_info "安装必要的依赖..."
apt update
apt install -y curl git build-essential

# 安装 NVM
print_info "安装 NVM..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 加载 NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# 验证 NVM 安装
if ! command -v nvm &> /dev/null; then
    print_error "NVM 安装失败"
    exit 1
fi

# 安装 Node.js LTS 版本
print_info "安装 Node.js LTS 版本..."
nvm install --lts

# 设置默认 Node.js 版本
nvm alias default node

# 验证 Node.js 安装
if ! command -v node &> /dev/null; then
    print_error "Node.js 安装失败"
    exit 1
fi

# 安装 pnpm 23.1.0
print_info "安装 pnpm 23.1.0..."
npm install -g pnpm@23.1.0

# 验证 pnpm 安装
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm 安装失败"
    exit 1
fi

# 配置 npm 和 pnpm
print_info "配置 npm 和 pnpm..."
npm config set registry https://registry.npmmirror.com
pnpm config set registry https://registry.npmmirror.com

# 显示版本信息
print_info "安装完成！版本信息："
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"
echo "pnpm: $(pnpm -v)"

# 添加环境变量到 .bashrc
print_info "配置环境变量..."
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"' >> ~/.bashrc

print_info "请运行 'source ~/.bashrc' 或重新登录以使环境变量生效" 