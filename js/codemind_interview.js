// ============================================================
// INTERVIEW PREP
// ============================================================
const INTERVIEW_QS = {
  js: [
    { q:'Explain the event loop in JavaScript.', diff:'medium', hint:'Talk about call stack, task queue, microtask queue, and how async works.' },
    { q:'What is prototypal inheritance and how does it differ from classical inheritance?', diff:'medium', hint:'JS uses prototype chains; classical OOP uses class hierarchies.' },
    { q:'How does `async/await` work under the hood?', diff:'hard', hint:'Syntactic sugar over Promises, which are built on microtasks.' },
    { q:'Explain the difference between `call`, `apply`, and `bind`.', diff:'medium', hint:'All three set `this`. `call` passes args individually, `apply` as array, `bind` returns a new function.' },
    { q:'What are WeakMap and WeakSet and when would you use them?', diff:'hard', hint:'Hold weak references — keys/values can be garbage collected. Useful for caching without memory leaks.' },
    { q:'What is the Temporal Dead Zone?', diff:'medium', hint:'The period between entering a block scope and a `let`/`const` declaration being initialised.' },
    { q:'How does debouncing differ from throttling?', diff:'easy', hint:'Debounce delays until no calls for X ms; throttle limits calls to once per X ms.' },
  ],
  python: [
    { q:'Explain Python\'s memory management and garbage collection.', diff:'hard', hint:'Reference counting + cyclic GC. `gc` module. `__del__`.' },
    { q:'What is the difference between deep copy and shallow copy?', diff:'easy', hint:'`copy.copy()` vs `copy.deepcopy()`. Shallow copies references; deep copies recursively.' },
    { q:'Explain generators and when you would use them over lists.', diff:'medium', hint:'Lazy evaluation, lower memory. Useful for large data streams.' },
    { q:'What are context managers and how do you implement one?', diff:'medium', hint:'`with` statement. `__enter__` / `__exit__`. Or `@contextmanager` decorator.' },
    { q:'Explain the difference between `@staticmethod` and `@classmethod`.', diff:'medium', hint:'`classmethod` receives `cls`. `staticmethod` receives nothing implicitly.' },
  ],
  dsa: [
    { q:'How would you detect a cycle in a linked list?', diff:'easy', hint:'Floyd\'s cycle detection (fast/slow pointer).' },
    { q:'Explain how you would implement an LRU cache.', diff:'hard', hint:'HashMap + doubly linked list. O(1) get and put.' },
    { q:'How do you find the lowest common ancestor of two nodes in a BST?', diff:'medium', hint:'If both nodes are less than root, go left. If both greater, go right. Otherwise root is LCA.' },
    { q:'Describe how you would reverse a linked list in-place.', diff:'easy', hint:'Three pointers: prev, curr, next. Iterate and redirect pointers.' },
    { q:'When would you use a heap vs a sorted array?', diff:'medium', hint:'Heap: O(log n) insert/extract-min; sorted array O(n) insert but O(1) access.' },
  ],
  system: [
    { q:'Design a URL shortener like bit.ly.', diff:'hard', hint:'Hash the URL, store mapping. Handle collisions, expiry, analytics, scale.' },
    { q:'How would you design a rate limiter?', diff:'hard', hint:'Token bucket or sliding window. Redis with atomic counters.' },
    { q:'Explain how you would design a notification system.', diff:'hard', hint:'Event-driven, message queues (Kafka/SQS), push/email/SMS, delivery guarantees.' },
    { q:'How do you ensure database consistency in a distributed system?', diff:'hard', hint:'ACID vs BASE, 2PC, sagas, optimistic locking.' },
    { q:'What is the difference between SQL and NoSQL? When use each?', diff:'medium', hint:'SQL: structured, ACID, relational. NoSQL: flexible schema, scale, eventual consistency. Use case matters.' },
  ],
  react: [
    { q:'How does React\'s reconciliation algorithm (Fiber) work?', diff:'hard', hint:'Diff algorithm with keys. Fiber enables incremental rendering and priority scheduling.' },
    { q:'What are controlled vs uncontrolled components?', diff:'easy', hint:'Controlled: React state is source of truth. Uncontrolled: DOM is source of truth, accessed via refs.' },
    { q:'When would you use `useMemo` vs `useCallback`?', diff:'medium', hint:'`useMemo` memoises a computed value. `useCallback` memoises a function reference.' },
    { q:'How does React handle side effects and why is `useEffect` cleanup important?', diff:'medium', hint:'Cleanup runs on unmount or before next effect. Prevents memory leaks, stale closures.' },
    { q:'What is code splitting and how do you implement it in React?', diff:'medium', hint:'`React.lazy()` + `Suspense`. Dynamic `import()`. Route-level splitting with React Router.' },
  ],
  cs: [
    { q:'Explain the difference between TCP and UDP.', diff:'easy', hint:'TCP: reliable, ordered, connection-oriented. UDP: fast, no guarantee, connectionless.' },
    { q:'What happens when you type a URL into the browser and press Enter?', diff:'medium', hint:'DNS, TCP handshake, HTTP request, HTML parse, CSSOM, render tree, layout, paint.' },
    { q:'Explain SOLID principles.', diff:'medium', hint:'Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.' },
    { q:'What is the difference between authentication and authorisation?', diff:'easy', hint:'AuthN: who you are. AuthZ: what you\'re allowed to do.' },
    { q:'Explain the difference between concurrency and parallelism.', diff:'medium', hint:'Concurrency: multiple tasks in progress (interleaved). Parallelism: truly simultaneous execution.' },
  ],
  behavioral: [
    { q:'Tell me about a time you disagreed with a technical decision. How did you handle it?', diff:'medium', hint:'STAR: Situation, Task, Action, Result. Show constructive disagreement, data-driven arguments.' },
    { q:'Describe a project where you had to learn a new technology quickly.', diff:'easy', hint:'Show curiosity, speed of learning, outcome.' },
    { q:'Tell me about a time you had to deal with a very tight deadline.', diff:'easy', hint:'Prioritisation, communication, tradeoffs, result.' },
    { q:'How do you handle technical debt in a fast-moving team?', diff:'medium', hint:'Track it, schedule paydown, advocate for quality, balance with delivery.' },
    { q:'Describe a time you mentored or helped a junior developer.', diff:'easy', hint:'Patience, teaching, outcome for them and the team.' },
  ],
};

let ivAnswers = {};

function renderInterviewQs() {
  const topic = document.getElementById('ivTopicSelect').value;
  const diff = document.getElementById('ivDiffSelect').value;
  const qs = (INTERVIEW_QS[topic] || []).filter(q => diff === 'all' || q.diff === diff.replace(/[🟢🟡🔴] /,''));
  const list = document.getElementById('ivQaList');
  if (!qs.length) { list.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px">No questions for this filter.</div>'; return; }
  list.innerHTML = qs.map((q, i) => {
    const id = `iv_${topic}_${i}`;
    const diffColor = q.diff === 'easy' ? 'var(--accent3)' : q.diff === 'medium' ? 'var(--warn)' : 'var(--danger)';
    return `<div class="iv-qa-card">
      <div class="iv-q-row">
        <span class="iv-diff-tag" style="background:${diffColor}20;color:${diffColor};border:1px solid ${diffColor}40">${q.diff}</span>
        <div class="iv-q-text">${q.q}</div>
      </div>
      <div class="iv-hint" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">💡 Show hint</div>
      <div style="display:none;font-size:12px;color:var(--muted);padding:4px 0;font-style:italic">${q.hint}</div>
      <textarea class="iv-answer-area" id="${id}" placeholder="Type your answer here for practice..." oninput="ivAnswers['${id}']=this.value"></textarea>
      <button class="btn btn-secondary" style="font-size:11px;padding:5px 12px;align-self:flex-end" onclick="aiGradeAnswer('${id}','${escapeJs(q.q)}')">🤖 AI Feedback</button>
      <div class="iv-ai-fb" id="${id}_fb" style="display:none"></div>
    </div>`;
  }).join('');
}

function escapeJs(s) { return s.replace(/'/g,"\\'").replace(/"/g,'\\"'); }

async function aiGradeAnswer(id, question) {
  const answer = document.getElementById(id).value.trim();
  if (!answer) { showNotification('Type your answer first!','warn'); return; }
  if (!apiKey) { openModal('apiModal'); return; }
  const fb = document.getElementById(id + '_fb');
  fb.style.display = 'block';
  fb.innerHTML = '<span style="color:var(--muted)">🤖 Analysing your answer...</span>';
  try {
    const { text } = await callGemini(
      'You are an experienced technical interviewer. Give concise, constructive feedback.',
      `Interview question: "${question}"\n\nCandidate's answer: "${answer}"\n\nProvide:\n1. **Score** (1-10) with brief rationale\n2. **What was good** (1-2 points)\n3. **What to improve** (1-2 points)\n4. **Key points they should have mentioned**\n\nBe encouraging but honest. Keep it concise.`
    );
    fb.innerHTML = renderMarkdown(text);
  } catch(e) {
    fb.innerHTML = `<span style="color:var(--danger)">❌ ${e.message}</span>`;
  }
}

async function askAIInterview() {
  const topic = document.getElementById('ivTopicSelect').value;
  if (!apiKey) { openModal('apiModal'); return; }
  const list = document.getElementById('ivQaList');
  list.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px;text-align:center">🤖 Generating personalised interview questions...</div>';
  try {
    const { text } = await callGemini(
      'You are a senior technical interviewer at a top tech company.',
      `Generate 5 thoughtful interview questions for the topic: "${topic}".\n\nFor each question provide:\n- The question itself\n- Difficulty: easy/medium/hard\n- What a strong answer should include (2-3 bullet points)\n\nFormat as a numbered list. Make them realistic and varied in depth.`
    );
    list.innerHTML = `<div class="iv-qa-card"><div class="iv-q-text" style="font-size:13px">${renderMarkdown(text)}</div></div>`;
  } catch(e) {
    list.innerHTML = `<div style="color:var(--danger);padding:20px">❌ ${e.message}</div>`;
  }
}

