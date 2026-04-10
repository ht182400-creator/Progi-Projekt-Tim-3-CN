#!/bin/bash
# Fertutor Linux 安装脚本
# 支持: Ubuntu 20.04/22.04/24.04
# macOS: 预留接口，暂未测试

set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_FILE="$APP_DIR/install.log"
SERVICE_NAME="fertutor"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}$1${NC}"; echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }
log_warn()  { echo -e "${YELLOW}[警告] $1${NC}"; echo "[$(date '+%Y-%m-%d %H:%M:%S')] [警告] $1" >> "$LOG_FILE"; }
log_error() { echo -e "${RED}[错误] $1${NC}"; echo "[$(date '+%Y-%m-%d %H:%M:%S')] [错误] $1" >> "$LOG_FILE"; }

# 检测操作系统
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        log_warn "macOS 支持为预留接口，未经完整测试"
    elif [[ -f /etc/ubuntu-release ]] || grep -qi ubuntu /etc/os-release 2>/dev/null; then
        OS="ubuntu"
    elif [[ -f /etc/debian_version ]]; then
        OS="debian"
    else
        log_error "不支持的操作系统，仅支持 Ubuntu/Debian"
        exit 1
    fi
    log_info "检测到系统: $OS"
}

# ============================================================
# [1/5] 检查/安装 Node.js 20 LTS
# ============================================================
install_nodejs() {
    log_info "[1/5] 检查 Node.js..."
    if command -v node &>/dev/null; then
        NODE_VER=$(node --version)
        log_info "[跳过] Node.js 已安装: $NODE_VER"
        return
    fi

    log_info "安装 Node.js 20 LTS..."
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &>/dev/null; then
            brew install node@20
        else
            log_error "请先安装 Homebrew: https://brew.sh"
            exit 1
        fi
    fi

    NODE_VER=$(node --version)
    log_info "Node.js 安装完成: $NODE_VER"
}

# ============================================================
# [2/5] 检查/安装 PostgreSQL 16
# ============================================================
install_postgresql() {
    log_info "[2/5] 检查 PostgreSQL..."
    if command -v psql &>/dev/null; then
        PG_VER=$(psql --version)
        log_info "[跳过] PostgreSQL 已安装: $PG_VER"
        # 确保服务运行
        sudo systemctl start postgresql 2>/dev/null || true
        return
    fi

    log_info "安装 PostgreSQL 16..."
    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        sudo apt-get install -y curl ca-certificates
        sudo install -d /usr/share/postgresql-common/pgdg
        sudo curl -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc --fail https://www.postgresql.org/media/keys/ACCC4CF8.asc
        sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
        sudo apt-get update
        sudo apt-get install -y postgresql-16
        sudo systemctl enable postgresql
        sudo systemctl start postgresql
    elif [[ "$OS" == "macos" ]]; then
        brew install postgresql@16
        brew services start postgresql@16
    fi

    log_info "PostgreSQL 安装完成"
}

# ============================================================
# [3/5] 初始化数据库
# ============================================================
init_database() {
    log_info "[3/5] 初始化数据库..."

    # 读取配置
    PG_USER="${PG_USER:-postgres}"
    PG_PASSWORD="${PG_PASSWORD:-postgres123}"
    PG_PORT="${PG_PORT:-5432}"
    PG_DB="fertutor"

    # 创建数据库用户和数据库
    sudo -u postgres psql -c "CREATE USER $PG_USER WITH PASSWORD '$PG_PASSWORD';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE $PG_DB OWNER $PG_USER;" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $PG_DB TO $PG_USER;" 2>/dev/null || true

    # 检查是否已初始化
    TABLE_COUNT=$(sudo -u postgres psql -d "$PG_DB" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='users';" 2>/dev/null || echo "0")
    if [[ "$TABLE_COUNT" == "1" ]]; then
        log_info "[跳过] 数据库已初始化"
        return
    fi

    log_info "导入数据库结构..."
    export PGPASSWORD="$PG_PASSWORD"
    psql -U "$PG_USER" -p "$PG_PORT" -d "$PG_DB" -f "$APP_DIR/app/server/baze/baze.sql" >> "$LOG_FILE" 2>&1
    psql -U "$PG_USER" -p "$PG_PORT" -d "$PG_DB" -f "$APP_DIR/app/server/baze/migration_admin.sql" >> "$LOG_FILE" 2>&1
    [[ -f "$APP_DIR/app/server/baze/testingData.sql" ]] && \
        psql -U "$PG_USER" -p "$PG_PORT" -d "$PG_DB" -f "$APP_DIR/app/server/baze/testingData.sql" >> "$LOG_FILE" 2>&1
    for f in "$APP_DIR/app/server/baze/migrations/"*.sql; do
        [[ -f "$f" ]] && psql -U "$PG_USER" -p "$PG_PORT" -d "$PG_DB" -f "$f" >> "$LOG_FILE" 2>&1
    done
    log_info "数据库初始化完成"
}

# ============================================================
# [4/5] 安装依赖 + 构建前端
# ============================================================
build_app() {
    log_info "[4/5] 安装依赖并构建前端..."

    # 生成 .env
    if [[ ! -f "$APP_DIR/app/server/.env" ]]; then
        log_info "生成服务器配置文件..."
        cat > "$APP_DIR/app/server/.env" <<EOF
DB_HOST=localhost
DB_PORT=${PG_PORT:-5432}
DB_NAME=fertutor
DB_USER=${PG_USER:-postgres}
DB_PASSWORD=${PG_PASSWORD:-postgres123}
PORT=8080
HOST=0.0.0.0
NODE_ENV=production
FRONTEND_URL=http://localhost:8080
JWT_SECRET=change-me-jwt-secret-please
VERIFY_SECRET=change-me-verify-secret
RESET_SECRET=change-me-reset-secret
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
EOF
        log_warn "请编辑 $APP_DIR/app/server/.env 修改密钥"
    fi

    # 后端依赖
    log_info "安装后端依赖..."
    cd "$APP_DIR/app/server"
    npm install --omit=dev --prefer-offline >> "$LOG_FILE" 2>&1

    # 前端构建
    if [[ -f "$APP_DIR/app/client/dist/index.html" ]]; then
        log_info "[跳过] 前端已构建"
    else
        log_info "安装前端依赖并构建..."
        cd "$APP_DIR/app/client"
        npm install --prefer-offline >> "$LOG_FILE" 2>&1
        npm run build >> "$LOG_FILE" 2>&1
        log_info "前端构建完成"
    fi
}

# ============================================================
# [5/5] 注册 systemd 服务
# ============================================================
register_service() {
    log_info "[5/5] 注册系统服务..."

    NODE_BIN=$(which node)
    mkdir -p "$APP_DIR/logs"

    if [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=Fertutor Web Server
After=network.target postgresql.service

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$APP_DIR/app/server
ExecStart=$NODE_BIN server.js
Restart=on-failure
RestartSec=10
StandardOutput=append:$APP_DIR/logs/server.log
StandardError=append:$APP_DIR/logs/server-error.log
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
        sudo systemctl daemon-reload
        sudo systemctl enable "$SERVICE_NAME"
        sudo systemctl restart "$SERVICE_NAME"
        log_info "systemd 服务已注册并启动"

    elif [[ "$OS" == "macos" ]]; then
        # macOS launchd (预留)
        log_warn "macOS 服务注册预留，请手动运行: node $APP_DIR/app/server/server.js"
    fi
}

# ============================================================
# 主流程
# ============================================================
main() {
    log_info "========================================="
    log_info "  Fertutor Linux 安装"
    log_info "========================================="

    detect_os
    install_nodejs
    install_postgresql
    init_database
    build_app
    register_service

    echo ""
    echo "========================================="
    echo "  安装完成！"
    echo "  访问: http://localhost:8080"
    echo "  日志: $APP_DIR/logs/"
    echo "  服务管理: sudo systemctl status $SERVICE_NAME"
    echo "========================================="
}

main "$@"
