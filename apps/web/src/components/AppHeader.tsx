type AppHeaderProps = {
  wordCount: number;
  username: string;
  onLogout: () => void;
};

export function AppHeader({ wordCount, username, onLogout }: AppHeaderProps) {
  return (
    <header>
      <div>
        <p className="eyebrow">PERSONAL WORD BANK</p>
        <h1>我的单词本</h1>
        <p className="subtitle">先收集，稍后再慢慢认识它们。</p>
      </div>
      <div className="header-account">
        <div className="count">
          <strong>{wordCount}</strong>
          <span>个单词</span>
        </div>
        <span>{username}</span>
        <button type="button" onClick={onLogout}>
          退出登录
        </button>
      </div>
    </header>
  );
}
