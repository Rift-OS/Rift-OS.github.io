document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const THEME_KEY = 'riftos_theme';
  const toggle = document.getElementById('theme-toggle');
  const apiContainer = document.getElementById('api-content');
  const ciStatus = document.getElementById('ci-status');
  const commitHash = document.getElementById('commit-hash');
  const latestRelease = document.getElementById('latest-release');
  const org = 'Rift-OS';
  const reposUrl = `https://api.github.com/orgs/${encodeURIComponent(org)}/repos?per_page=6&sort=updated`;
  const releasesUrl = `https://api.github.com/repos/${encodeURIComponent(org)}/Rift-OS/releases/latest`;
  const eventsHeaders = { 'Accept': 'application/vnd.github.v3+json' };

  if (!toggle) return;

  toggle.setAttribute('type','button');
  toggle.setAttribute('aria-label','テーマ切替');

  function updateToggleState(){
    const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    toggle.setAttribute('aria-pressed', current === 'light' ? 'true' : 'false');
    toggle.textContent = current === 'light' ? 'ライト (有効)' : 'ダーク (有効)';
  }

  function initTheme(){
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark'){
      root.setAttribute('data-theme', stored);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
    document.body.setAttribute('data-theme', root.getAttribute('data-theme'));
    updateToggleState();
  }

  toggle.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    document.body.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateToggleState();
  });

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function showLoading(){ apiContainer.innerHTML = '<span class="status"><span class="loader" aria-hidden="true"></span>読み込み中…</span>'; }
  function showError(){ apiContainer.innerHTML = '<div class="status">オフライン、または情報を取得できませんでした。</div>'; }

  function renderRepos(repos){
    if(!Array.isArray(repos) || repos.length===0){ apiContainer.innerHTML = '<div class="status">リポジトリが見つかりません。</div>'; return; }
    const ul = document.createElement('ul'); ul.className = 'repo-list';
    repos.forEach(r=>{
      const li = document.createElement('li'); li.className='repo-item';
      const a = `<a href="${r.html_url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.name)}</a>`;
      const meta = `<small>${r.stargazers_count ?? 0}★</small>`;
      li.innerHTML = `${a}${meta}`;
      ul.appendChild(li);
    });
    apiContainer.innerHTML=''; apiContainer.appendChild(ul);
  }

  function fetchRepos(){
    showLoading();
    fetch(reposUrl, { headers: eventsHeaders, cache: 'no-cache' })
      .then(res => { if(!res.ok) throw new Error('Network error'); return res.json(); })
      .then(data => renderRepos(data))
      .catch(err => { console.warn(err); showError(); });
  }

  function fetchReleaseAndCommit(){
    // release
    fetch(releasesUrl, { headers: eventsHeaders, cache: 'no-cache' })
      .then(res => {
        if (res.status === 404) return null;
        if(!res.ok) throw new Error('Release fetch failed');
        return res.json();
      })
      .then(rel => {
        if(rel && rel.tag_name){
          latestRelease.textContent = rel.tag_name;
        } else {
          latestRelease.textContent = '利用可能なリリースなし';
        }
      })
      .catch(err => {
        console.warn(err);
        latestRelease.textContent = '取得失敗';
      });

    // latest commit from most active repo (simple approach)
    fetch(reposUrl, { headers: eventsHeaders, cache: 'no-cache' })
      .then(res => { if(!res.ok) throw new Error('Network error'); return res.json(); })
      .then(repos => {
        if(!Array.isArray(repos) || repos.length===0){ ciStatus.textContent = '—'; commitHash.textContent = '—'; return; }
        // pick top repo
        const top = repos[0];
        const commitsUrl = top.commits_url.replace('{/sha}','') + '?per_page=1';
        return fetch(commitsUrl, { headers: eventsHeaders, cache: 'no-cache' })
          .then(r => { if(!r.ok) throw new Error('Commits fetch failed'); return r.json(); })
          .then(commits => {
            if(Array.isArray(commits) && commits.length>0){
              ciStatus.textContent = '成功 (最新取得済)';
              commitHash.textContent = commits[0].sha.substring(0,7);
            } else {
              ciStatus.textContent = '情報なし';
              commitHash.textContent = '—';
            }
          });
      })
      .catch(err => {
        console.warn(err);
        ciStatus.textContent = '取得失敗';
        commitHash.textContent = '—';
      });
  }

  initTheme();
  fetchRepos();
  fetchReleaseAndCommit();

  // optional: auto-refresh limited info every 5 minutes
  setInterval(() => {
    fetchRepos();
    fetchReleaseAndCommit();
  }, 5 * 60 * 1000);

  // debug helper
  window.__riftos = {
    setTheme: t => {
      if(t === 'light' || t === 'dark'){
        root.setAttribute('data-theme', t);
        document.body.setAttribute('data-theme', t);
        localStorage.setItem(THEME_KEY, t);
        updateToggleState();
      }
    }
  };
});
