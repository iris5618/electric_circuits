// 全域變數：應用程式資料與 AI 請求中斷控制器
let appData = {
  chapters: [
    { id: "ch1", title: "第一章 基本概念", desc: "靜電力與基本元件" },
    { id: "ch2", title: "第二章 電阻電路與直流電路", desc: "等效電阻與分析" },
    { id: "ch3", title: "第三章 電路分析定理", desc: "分壓、分流與重疊定理" }
  ],
  problems: [
    {
      id: "p1-1",
      chapterId: "ch1",
      num: "1-4",
      topic: "庫侖靜電力計算",
      question: "在真空中，若有 $2 \\times 10^{-4}\\text{ C}$ 之正電荷與 $4 \\times 10^{-5}\\text{ C}$ 之負電荷，相距 $3\\text{ m}$，試求其間之靜電力。",
      solution: "<ol><li><b>庫侖定律：</b>$$F = k \\frac{\vert{}Q_1 Q_2\vert{}}{r^2}$$</li><li><b>計算：</b>$$F = (9 \\times 10^9) \\times \\frac{(2 \\times 10^{-4}) \\times (4 \\times 10^{-5})}{3^2} = 8\\text{ N}$$</li></ol>"
    }
  ]
};

let currentChapterId = "ch1";
let aiAbortController = null; // 用於中斷 Gemini API 請求

// 初始化載入
window.onload = async function() {
  const savedKey = localStorage.getItem('cfg_gemini_key');
  const savedToken = localStorage.getItem('cfg_github_token');
  const savedRepo = localStorage.getItem('cfg_github_repo');
  const savedPath = localStorage.getItem('cfg_github_path');

  if (savedKey) document.getElementById('cfgGeminiKey').value = savedKey;
  if (savedToken) document.getElementById('cfgGithubToken').value = savedToken;
  if (savedRepo) document.getElementById('cfgGithubRepo').value = savedRepo;
  if (savedPath) document.getElementById('cfgGithubPath').value = savedPath;

  try {
    const res = await fetch(`data.json?t=${Date.now()}`);
    if (res.ok) {
      appData = await res.json();
    }
  } catch (e) {
    console.log("使用預設內建資料");
  }
  renderApp();
};

function renderApp() {
  renderChapters();
  renderProblems();
}

function renderChapters() {
  const list = document.getElementById('chapterList');
  const aiSelect = document.getElementById('aiChapterSelect');
  const addProbSelect = document.getElementById('addProblemChapterSelect');

  list.innerHTML = '';
  aiSelect.innerHTML = '';
  addProbSelect.innerHTML = '';

  appData.chapters.forEach(ch => {
    // 渲染 sidebar 清單
    const li = document.createElement('li');
    li.className = `chapter-item ${ch.id === currentChapterId ? 'active' : ''}`;
    li.textContent = ch.title;
    li.onclick = () => {
      currentChapterId = ch.id;
      renderApp();
    };
    list.appendChild(li);

    // 渲染 AI modal 選單
    const opt1 = document.createElement('option');
    opt1.value = ch.id;
    opt1.textContent = ch.title;
    aiSelect.appendChild(opt1);

    // 渲染手動新增題目 modal 選單
    const opt2 = document.createElement('option');
    opt2.value = ch.id;
    opt2.textContent = ch.title;
    if (ch.id === currentChapterId) opt2.selected = true;
    addProbSelect.appendChild(opt2);
  });

  const currentCh = appData.chapters.find(c => c.id === currentChapterId);
  document.getElementById('currentChapterTitle').textContent = currentCh ? currentCh.title : '請選擇章節';
}

function renderProblems() {
  const container = document.getElementById('problemList');
  container.innerHTML = '';

  const filtered = appData.problems.filter(p => p.chapterId === currentChapterId);

  if (filtered.length === 0) {
    container.innerHTML = '<div style="color: #64748b; text-align: center; padding: 40px;">本章節尚無題目，請點擊左側「新增題目」或「📷 上傳題目圖檔」進行 AI 解題。</div>';
    return;
  }

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-header">
        <span class="problem-num">題號 ${p.num}</span>
        <div class="problem-topic">${p.topic}</div>
      </div>
      <div class="question-box">${p.question}</div>
      <div class="solution-box">${p.solution}</div>
    `;
    container.appendChild(card);
  });

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

// Modal 控制
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// 1. 新增章節邏輯
function createChapter() {
  const id = document.getElementById('newChId').value.trim();
  const title = document.getElementById('newChTitle').value.trim();
  const desc = document.getElementById('newChDesc').value.trim();

  if (!id || !title) {
    alert("請填寫章節 ID 與名稱！");
    return;
  }

  if (appData.chapters.some(ch => ch.id === id)) {
    alert("已有相同的章節 ID，請輸入新的 ID！");
    return;
  }

  const newChapter = { id, title, desc };
  appData.chapters.push(newChapter);

  currentChapterId = id;
  renderApp();
  closeModal('addChapterModal');

  // 清空欄位
  document.getElementById('newChId').value = '';
  document.getElementById('newChTitle').value = '';
  document.getElementById('newChDesc').value = '';
}

// 2. 新增題目邏輯
function createProblem() {
  const chapterId = document.getElementById('addProblemChapterSelect').value;
  const num = document.getElementById('newProbNum').value.trim();
  const topic = document.getElementById('newProbTopic').value.trim();
  const question = document.getElementById('newProbQuestion').value.trim();
  const solution = document.getElementById('newProbSolution').value.trim();

  if (!num || !topic || !question || !solution) {
    alert("請完整填寫所有欄位！");
    return;
  }

  const newProblem = {
    id: `p_${Date.now()}`,
    chapterId,
    num,
    topic,
    question,
    solution
  };

  appData.problems.push(newProblem);
  currentChapterId = chapterId;
  renderApp();
  closeModal('addProblemModal');

  // 清空欄位
  document.getElementById('newProbNum').value = '';
  document.getElementById('newProbTopic').value = '';
  document.getElementById('newProbQuestion').value = '';
  document.getElementById('newProbSolution').value = '';
}

// 儲存設定
function saveConfig() {
  localStorage.setItem('cfg_gemini_key', document.getElementById('cfgGeminiKey').value.trim());
  localStorage.setItem('cfg_github_token', document.getElementById('cfgGithubToken').value.trim());
  localStorage.setItem('cfg_github_repo', document.getElementById('cfgGithubRepo').value.trim());
  localStorage.setItem('cfg_github_path', document.getElementById('cfgGithubPath').value.trim() || 'data.json');
  alert('設定已儲存！');
  closeModal('configModal');
}

// 圖片預覽
let currentBase64Image = "";
function previewAiImage(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      currentBase64Image = e.target.result.split(',')[1];
      document.getElementById('aiImagePreview').src = e.target.result;
      document.getElementById('aiImagePreviewContainer').style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

// 3. AI 解題 (含 Retry 與可中斷機制)
async function runAiAnalysis() {
  const apiKey = localStorage.getItem('cfg_gemini_key');
  if (!apiKey) {
    alert("請先點擊左下角「⚙️ API / GitHub 設定」輸入您的 Gemini API Key！");
    return;
  }

  if (!currentBase64Image) {
    alert("請選擇題目圖片！");
    return;
  }

  // 建立中斷控制器
  aiAbortController = new AbortController();
  const signal = aiAbortController.signal;

  const btn = document.getElementById('aiSolveBtn');
  const cancelBtn = document.getElementById('aiCancelBtn');
  const progressWrapper = document.getElementById('aiProgressWrapper');
  const progressStatus = document.getElementById('aiProgressStatus');

  btn.disabled = true;
  cancelBtn.disabled = false; // 取消按鈕保持可用
  btn.style.opacity = '0.6';
  progressWrapper.style.display = 'block';
  progressStatus.textContent = '🤖 AI 正在分析影像與推導公式，請稍候...';

  const promptText = document.getElementById('aiPromptInput').value.trim();
  const selectedCh = document.getElementById('aiChapterSelect').value;

  const systemPrompt = `你是一位專業的電路學教授。請分析這張題目圖片，並嚴格傳回 JSON 格式：
{
  "num": "題號 (例如 3-1)",
  "topic": "簡短主題名稱",
  "question": "題目完整文字。所有數學變數與公式請務必用 $ ... $ 包裹，例如 $v_1(t) = 12\\text{V}$",
  "solution": "詳細計算步驟，請用 <ol><li>...</li></ol> 格式。獨立公式請用 $$ ... $$ 獨立成行包裹，例如 $$i(t) = \\frac{v_2(t)}{R_2} = 3\\text{A}$$"
}
注意事項：
1. 不要包含反斜線轉義錯亂，JSON字串中的反斜線請用 double-backslash (\\\\)。
2. 公式過長時請適當拆成多行或多個步驟。`;

  const maxRetries = 3;
  let attempt = 0;
  let success = false;
  let responseData = null;

  try {
    while (attempt < maxRetries && !success) {
      if (signal.aborted) throw new Error('AbortError');

      attempt++;
      if (attempt > 1) {
        progressStatus.textContent = `⏳ 伺服器忙碌，正在進行第 ${attempt}/${maxRetries} 次自動重試...`;
        
        // 支援中斷的延遲等待
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 2000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new Error('AbortError'));
          });
        });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: signal, // 綁定中斷訊號
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: `${systemPrompt}\n補充說明：${promptText}` },
              { inline_data: { mime_type: "image/jpeg", data: currentBase64Image } }
            ]
          }]
        })
      });

      if (response.status === 503 || response.status === 429) {
        console.warn(`API 忙碌 (${response.status})，準備進行 Retry...`);
        continue;
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      responseData = data;
      success = true;
    }

    if (success && responseData) {
      const aiResponseText = responseData.candidates[0].content.parts[0].text;
      const cleanJsonText = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedResult = JSON.parse(cleanJsonText);

      const newProblem = {
        id: `p_${Date.now()}`,
        chapterId: selectedCh,
        num: parsedResult.num || "自訂",
        topic: parsedResult.topic || "AI 分析題目",
        question: parsedResult.question,
        solution: parsedResult.solution
      };

      appData.problems.push(newProblem);
      currentChapterId = selectedCh;
      renderApp();

      progressStatus.textContent = '✅ 解析完成！';
      setTimeout(() => {
        closeModal('aiSolveModal');
        resetAiModalState();
      }, 1000);
    }

  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'AbortError') {
      console.log("使用者已取消 AI 解析");
    } else {
      console.error(err);
      progressStatus.textContent = `❌ 解析失敗：${err.message}`;
      btn.disabled = false;
      btn.style.opacity = '1';
    }
  }
}

// 取消 AI 解析
function cancelAiAnalysis() {
  if (aiAbortController) {
    aiAbortController.abort(); // 即刻中斷 Fetch 與重試迴圈
  }
  closeModal('aiSolveModal');
  resetAiModalState();
}

// 重置 AI Modal UI 狀態
function resetAiModalState() {
  const btn = document.getElementById('aiSolveBtn');
  const cancelBtn = document.getElementById('aiCancelBtn');
  const progressWrapper = document.getElementById('aiProgressWrapper');
  
  btn.disabled = false;
  cancelBtn.disabled = false;
  btn.style.opacity = '1';
  progressWrapper.style.display = 'none';
}

// 4. GitHub 一鍵同步邏輯
async function syncToGitHub() {
  const token = localStorage.getItem('cfg_github_token');
  const repo = localStorage.getItem('cfg_github_repo');
  const path = localStorage.getItem('cfg_github_path') || 'data.json';

  if (!token || !repo) {
    alert("請先在「⚙️ API / GitHub 設定」中填寫 GitHub Token 與 Repo 名稱！");
    openModal('configModal');
    return;
  }

  const syncBtn = document.getElementById('ghSyncBtn');
  syncBtn.disabled = true;
  syncBtn.textContent = '⏳ 上傳中...';

  try {
    const url = `https://api.github.com/repos/${repo}/contents/${path}`;
    
    let sha = "";
    try {
      const getRes = await fetch(url, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (getRes.ok) {
        const getData = await getRes.json();
        sha = getData.sha;
      }
    } catch (e) {
      console.log("未找到歷史 SHA，將建立新檔案");
    }

    const jsonString = JSON.stringify(appData, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(jsonString)));

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update ${path} via Circuit Notes Web App`,
        content: encodedContent,
        sha: sha || undefined
      })
    });

    if (!putRes.ok) {
      const errData = await putRes.json();
      throw new Error(errData.message || '上傳失敗');
    }

    alert('🎉 成功上傳並同步至 GitHub！');

  } catch (err) {
    console.error("GitHub Sync Error:", err);
    alert(`❌ 上傳失敗: ${err.message}`);
  } finally {
    syncBtn.disabled = false;
    syncBtn.textContent = '☁️ 一鍵同步至 GitHub';
  }
}

// 匯出 JSON
function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", "data.json");
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// 匯入 JSON
function importData(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        appData = JSON.parse(e.target.result);
        renderApp();
        alert("資料匯入成功！");
      } catch (err) {
        alert("JSON 格式不正確！");
      }
    };
    reader.readAsText(file);
  }
}