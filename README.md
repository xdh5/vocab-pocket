# Vocabulary Windows Demo

一个最小可运行的 Windows 背单词桌面应用骨架：

- Electron：Windows 桌面外壳
- React + TypeScript + Vite：界面
- FastAPI + SQLite：本地 API 与数据
- 系统托盘：关闭窗口后继续在右下角运行
- Windows UI Automation：右键托盘可开启鼠标悬停选词

## 开发环境运行

需要 Node.js 20+ 和 Python 3.11+。

```powershell
npm install
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r apps\api\requirements.txt
npm run dev
```

`npm run dev` 会同时启动 FastAPI、Vite 和 Electron。

启动后可右键任务栏通知区域里的 `V` 图标，勾选“开启鼠标选词”。鼠标在支持 Windows 可访问性文本接口的英文单词上停留约一秒，会出现“加入单词本”悬浮框。浏览器、Office 和常见原生文本控件的支持通常较好；图片、游戏画面和部分自绘界面后续需要 OCR 兜底。

## 构建 Windows 安装包

```powershell
npm run build:win
```

安装包会生成在 `release` 目录。构建时会把 FastAPI 打包进应用，安装后无需单独安装或启动 Python。
