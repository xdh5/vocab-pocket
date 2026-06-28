# Vocaboom

Vocaboom 是一个 Windows 个人生词收集应用。桌面端负责系统托盘、鼠标悬停取词和悬浮卡片；React 提供界面；FastAPI 与 SQLite 保存个人词库。

应用内置本地用户名密码登录。密码使用 PBKDF2-SHA256 哈希保存，登录会话默认长期有效，主动退出后失效；不同账号的单词、变体和复习进度完全隔离。

PC 端用于收集和管理单词：列表只显示精简词条，点击后查看 AI 详情。本地 ECDICT 会先即时把普通复数、动词时态和比较级等变体归入词典原形，再让豆包只按原形生成词卡，同时分别记录每种实际遇到形式的次数。收藏请求会立即返回，AI 词卡和图片在后台生成。手机端位于 `/mobile`，用于翻卡背词并记录复习进度。

## 技术栈

- Electron：Windows 桌面壳、托盘、悬浮窗和本地进程管理
- React + TypeScript + Vite：主界面与悬浮卡片
- FastAPI + SQLAlchemy + Alembic：本地 API、业务逻辑与数据库迁移
- SQLite：个人单词、学习方式和累计遇见次数
- ECDICT：离线音标与中文基础释义
- 豆包：收藏单词时生成结构化学习词卡，并在需要时生成词义图片
- Biome + Ruff：前端、桌面端和后端静态检查与格式化

## 项目结构

```text
apps/
  api/
    alembic/            数据库迁移
    app/
      api/              FastAPI 路由与依赖
      core/             配置
      db/               SQLAlchemy 会话与迁移入口
      models/           ORM 模型
      repositories/     数据访问
      schemas/          API 输入输出模型
      services/         业务逻辑与 Windows 取词
  desktop/
    src/                Electron 功能模块
    main.cjs            应用生命周期与依赖编排
  web/
    src/
      api/              HTTP client
      components/       可复用组件
      hooks/            页面状态与数据同步
      pages/            页面组合
      types/            前端领域类型
docs/architecture.md    架构说明
```

## 开发环境

需要 Node.js 20+、Python 3.13 和 Windows 10/11。

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r apps\api\requirements-dev.txt
npm run db:migrate
npm run dev
```

`npm run dev` 会同时启动 FastAPI、Vite 和 Electron。关闭主窗口后应用继续驻留在系统托盘。

## 手机端调试

1. 确保 Windows 电脑和 iPhone 在同一个 Wi-Fi。
2. 执行 `npm run dev`，在终端的 Vite 输出中找到 `Network` 地址。
3. 用 iPhone Safari 打开 `http://电脑局域网IP:5173/mobile`，例如 `http://192.168.1.4:5173/mobile`。
4. 如果 Windows 防火墙询问权限，只允许“专用网络”。
5. Safari 中点击“分享”→“添加到主屏幕”。

手机端设置页保存每天固定的“到期复习”和“新背单词”目标，首页只保留开始学习、今日进度和词库统计；完成目标后显示鼓励信息，也可以继续背新词。学习队列会交替安排复习词和新词，某一类用完后再继续另一类。学习日按北京时间凌晨 5:00 切换，词库页区分未开始、学习中和已掌握状态。

背词页提供 `全部 / 仅听说 / 阅读` 三种队列。点击“显示答案”后选择“认识”或“再来一次”，结果会写回电脑上的同一个 SQLite 词库。复习采用 8 阶段艾宾浩斯间隔：5 分钟、30 分钟、12 小时、1 天、2 天、4 天、7 天、15 天；完成后标记为“已掌握”，每 30 天维护复习一次。答错或在电脑端重新加入同一个词都会将掌握度归零。只有已经生成 AI 词卡且到期的单词会进入复习队列。

“仅听说”单词的正面不会显示拼写，而是先自动朗读 AI 例句；翻面后显示单词和详情。详情中的“开始朗读”会调用浏览器语音识别，对识别结果与目标单词进行匹配评分，并把未匹配的字母标红。这个分数用于快速跟读反馈，不等同于专业的逐音素发音评测。

局域网 HTTP 地址适合开发调试，但 iOS 不会在该地址开放麦克风识别。正式作为可离线安装、可朗读评分的 iOS PWA 使用时，需要把 Web 与 API 部署在同一个 HTTPS 域名下；前端在 HTTPS 环境会自动使用同源 `/api`。

## 常用命令

```powershell
npm run db:migrate   # 升级 SQLite 数据库结构
npm run lint         # Biome + Ruff 静态检查
npm run typecheck    # TypeScript 类型检查
npm run format       # 格式化前端、桌面端和后端
npm run check        # 静态检查、类型检查和前端构建
npm run build:win    # 生成 Windows NSIS 安装包
```

## 配置

后端配置示例见 `apps/api/.env.example`，前端配置示例见 `apps/web/.env.example`。开发环境默认使用：

- API：`http://127.0.0.1:8000`
- Web：`http://localhost:5173`
- SQLite：`data/vocabulary.db`

启用 AI 词卡前，复制后端配置并填入火山方舟 API Key：

```powershell
Copy-Item apps\api\.env.example apps\api\.env
```

```dotenv
VOCABULARY_ARK_API_KEY=your_ark_api_key
VOCABULARY_DOUBAO_TEXT_MODEL=doubao-seed-2-0-lite-260428
VOCABULARY_DOUBAO_IMAGE_MODEL=doubao-seedream-5-0-260128
```

密钥只由本地 FastAPI 读取，不会发送给 React。首次收藏一个单词时会生成发音、核心词义和词性、带中文解释的常见搭配、简单双语例句、常用场景及 `重点 / 常用 / 了解 / 废弃` 等级。具体名词会先从 Wikimedia Commons 查找真实图片并保留来源信息；没有合适图片时才调用豆包 Seedream 生成。生成失败或尚未配置密钥时，重新收藏该词会自动重试；生成成功后不会重复调用。

打包后 Electron 会自动启动 FastAPI，并把 SQLite 放到当前 Windows 用户的应用数据目录。

## 阿里云生产部署

生产地址为 `https://vocaboom.cyberlab.bond`。部署使用一台阿里云 ECS：

- Caddy 提供 HTTPS、静态网页与 `/api`、`/media` 反向代理。
- FastAPI 运行在独立容器中，不直接暴露公网端口。
- SQLite 数据库和词义图片保存在 Docker 持久化卷 `vocaboom_data`。
- Caddy 的证书与配置保存在独立持久化卷，重启和重新部署不会丢失。

服务器需要安装 Docker Engine 和 Docker Compose 插件，并在安全组中开放 `80/TCP`、`443/TCP` 和 `443/UDP`。SSH 端口只应对可信 IP 开放。云解析 DNS 为 `cyberlab.bond` 添加记录：

```text
记录类型：A
主机记录：vocaboom
记录值：ECS 公网 IPv4
```

中国内地 ECS 对外提供网站前需要为域名完成 ICP 备案。DNS 指向服务器并开放 80/443 后，Caddy 会自动申请证书并将 HTTP 跳转到 HTTPS。

GitHub 仓库创建名为 `production` 的 Environment，并配置以下 Secrets：

```text
ALIYUN_HOST             ECS 公网 IPv4
ALIYUN_USER             SSH 用户名
ALIYUN_SSH_PRIVATE_KEY  专用部署私钥的完整内容
ARK_API_KEY             火山方舟 API Key
```

CI 会在部署时根据 `ALIYUN_HOST` 自动读取 ECS 的 SSH 主机公钥记录。

推送或手动运行 `master` 分支的 GitHub Actions 后，CI 会依次执行静态检查、类型检查、Web 构建、API 镜像构建、Compose/Caddy 配置校验，随后将发布内容同步到 `~/vocaboom` 并启动生产容器。部署完成后通过 `/health` 验证服务。

备份数据库和图片：

```bash
docker run --rm -v vocaboom_vocaboom_data:/data -v "$PWD:/backup" alpine \
  tar czf /backup/vocaboom-data.tar.gz -C /data .
```

## Windows 取词说明

取词基于 Windows UI Automation。浏览器、Office 和常见原生文本控件通常支持良好；图片、游戏画面和部分自绘界面后续需要 OCR 兜底。
