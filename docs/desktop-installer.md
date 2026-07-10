# Windows 安装包与自动更新

Vocaboom 的 Windows 端现在是“网页套壳 + 系统能力”：

- Electron 负责托盘、鼠标悬停取词、悬浮卡片、安装包和自动更新。
- 主界面加载线上站点：`https://vocaboom.cyberlab.bond`。
- 划词加入单词本时，Electron 直接调用线上 API。
- FastAPI、SQLite、AI 生成和手机 PWA 都在云端统一运行。

这样以后大部分功能更新只需要部署 Web/API，不需要用户重新安装 exe。只有这些能力变化时才需要发新版安装包：

- 托盘菜单
- Windows 取词逻辑
- Electron 主进程/preload
- 悬浮窗本地页面
- 应用图标、安装器行为
- 自动更新逻辑本身

## 本地打包

```powershell
npm run build:win
```

生成文件在 `release/`：

- `Vocaboom Setup x.y.z.exe`：给用户安装的文件
- `latest.yml`：自动更新清单
- `*.blockmap`：差量更新索引

## 发布自动更新

GitHub Actions 里手动运行 `Build and publish Windows installer`。

它会：

1. 在 Windows Runner 上构建安装包。
2. 上传构建产物到 Actions Artifact。
3. 把安装包、`latest.yml` 和 `blockmap` 同步到阿里云：

```text
https://vocaboom.cyberlab.bond/desktop-updates/
```

Electron 启动后会检查这个地址。如果发现 `latest.yml` 里的版本号比本机高，就会下载新版并提示重启安装。

## 发新版时要记得改版本号

自动更新靠 `package.json` 里的 `version` 判断新旧版本。

例如从 `0.1.0` 发到 `0.1.1`：

```powershell
npm version patch --no-git-tag-version
```

然后提交、推送，再手动运行桌面端发布 workflow。
