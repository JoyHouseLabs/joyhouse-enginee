#!/bin/bash
set -e

# 安装编译工具和依赖
apt-get update
apt-get install -y build-essential git postgresql-server-dev-all

# 克隆并编译 pgvector
cd /tmp
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
make install

# 在数据库中创建扩展
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION vector;
EOSQL 