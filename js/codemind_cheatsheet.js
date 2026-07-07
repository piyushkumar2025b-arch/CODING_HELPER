// ============================================================
// CHEATSHEET DATA & RENDERING
// ============================================================
const CHEATSHEETS = {
  javascript: [
    { title: 'Array Methods', items: [
      { code: 'arr.map(fn)', desc: 'Transform each element, return new array' },
      { code: 'arr.filter(fn)', desc: 'Keep elements where fn returns true' },
      { code: 'arr.reduce(fn,init)', desc: 'Accumulate array into single value' },
      { code: 'arr.find(fn)', desc: 'First element matching condition' },
      { code: 'arr.findIndex(fn)', desc: 'Index of first matching element' },
      { code: 'arr.some(fn)', desc: 'True if any element passes fn' },
      { code: 'arr.every(fn)', desc: 'True if all elements pass fn' },
      { code: 'arr.flat(depth)', desc: 'Flatten nested arrays' },
      { code: 'arr.flatMap(fn)', desc: 'Map then flatten one level' },
      { code: '[...new Set(arr)]', desc: 'Remove duplicates' },
    ]},
    { title: 'Object Patterns', items: [
      { code: 'const {a,b} = obj', desc: 'Destructuring object' },
      { code: '{...obj, key:val}', desc: 'Spread + override' },
      { code: 'Object.entries(obj)', desc: 'Array of [key, value] pairs' },
      { code: 'Object.fromEntries()', desc: 'Build object from entries' },
      { code: 'Object.keys/values()', desc: 'Get just keys or values' },
      { code: 'obj?.prop?.nested', desc: 'Optional chaining (safe access)' },
      { code: 'obj ?? fallback', desc: 'Nullish coalescing (null/undefined only)' },
    ]},
    { title: 'Async / Promises', items: [
      { code: 'async function fn(){}', desc: 'Declare async function' },
      { code: 'await promise', desc: 'Wait for promise inside async fn' },
      { code: 'Promise.all([...])', desc: 'Run all in parallel, wait for all' },
      { code: 'Promise.allSettled()', desc: 'All results even if some reject' },
      { code: 'Promise.race([...])', desc: 'Resolve with fastest' },
      { code: 'try { await } catch(e){}', desc: 'Handle async errors' },
    ]},
    { title: 'Modern Syntax', items: [
      { code: 'const [a,...rest]=arr', desc: 'Array destructuring + rest' },
      { code: '`Hello ${name}`', desc: 'Template literals' },
      { code: '(a,b) => a+b', desc: 'Arrow function' },
      { code: 'fn(a=10,b=20)', desc: 'Default parameters' },
      { code: 'import x from "m"', desc: 'ES module import' },
      { code: 'export default fn', desc: 'Default export' },
    ]},
  ],
  python: [
    { title: 'List Comprehensions', items: [
      { code: '[x*2 for x in l]', desc: 'Map — double every element' },
      { code: '[x for x in l if x>0]', desc: 'Filter — keep positive' },
      { code: '{k:v for k,v in d.items()}', desc: 'Dict comprehension' },
      { code: '{x for x in l}', desc: 'Set comprehension' },
      { code: '(x**2 for x in l)', desc: 'Generator expression (lazy)' },
    ]},
    { title: 'Built-ins', items: [
      { code: 'zip(a,b)', desc: 'Pair elements from two iterables' },
      { code: 'enumerate(l)', desc: 'Index + value pairs' },
      { code: 'sorted(l,key=fn)', desc: 'Sort with custom key' },
      { code: 'map(fn, iterable)', desc: 'Apply fn to all elements' },
      { code: 'filter(fn, iterable)', desc: 'Keep elements where fn is True' },
      { code: 'any(gen) / all(gen)', desc: 'Short-circuit boolean checks' },
      { code: 'sum/min/max(iterable)', desc: 'Aggregate functions' },
    ]},
    { title: 'String Methods', items: [
      { code: 's.split(",") ', desc: 'Split into list' },
      { code: '",".join(lst)', desc: 'Join list into string' },
      { code: 's.strip()', desc: 'Remove leading/trailing whitespace' },
      { code: 's.startswith("x")', desc: 'Check prefix' },
      { code: 'f"Hello {name}"', desc: 'f-string formatting' },
      { code: 's.replace(a,b)', desc: 'Replace all occurrences' },
    ]},
    { title: 'Data Structures', items: [
      { code: 'from collections import deque', desc: 'O(1) appendleft/popleft queue' },
      { code: 'from collections import Counter', desc: 'Frequency count dict' },
      { code: 'from collections import defaultdict', desc: 'Dict with default values' },
      { code: 'import heapq', desc: 'Min-heap operations' },
      { code: 'heapq.heappush/pop(h,v)', desc: 'Push/pop from heap' },
    ]},
  ],
  typescript: [
    { title: 'Types', items: [
      { code: 'type A = B | C', desc: 'Union type' },
      { code: 'type A = B & C', desc: 'Intersection type' },
      { code: 'interface I { k: T }', desc: 'Object shape' },
      { code: 'T extends U ? A : B', desc: 'Conditional type' },
      { code: 'keyof T', desc: 'Union of keys of T' },
      { code: 'Partial<T>', desc: 'Make all props optional' },
      { code: 'Required<T>', desc: 'Make all props required' },
      { code: 'Readonly<T>', desc: 'Make all props readonly' },
      { code: 'Pick<T,K>', desc: 'Pick subset of keys' },
      { code: 'Omit<T,K>', desc: 'Remove keys from type' },
    ]},
    { title: 'Generics', items: [
      { code: 'function f<T>(a:T):T', desc: 'Generic function' },
      { code: '<T extends object>', desc: 'Constrain generic' },
      { code: 'Array<T> / T[]', desc: 'Generic array' },
      { code: 'Promise<T>', desc: 'Promise returning T' },
      { code: 'Record<K,V>', desc: 'Object with key K and value V' },
    ]},
  ],
  java: [
    { title: 'Collections', items: [
      { code: 'List<T> l = new ArrayList<>()', desc: 'Resizable array' },
      { code: 'Map<K,V> m = new HashMap<>()', desc: 'Hash map' },
      { code: 'Set<T> s = new HashSet<>()', desc: 'Unique elements' },
      { code: 'Queue<T> q = new LinkedList<>()', desc: 'FIFO queue' },
      { code: 'Deque<T> d = new ArrayDeque<>()', desc: 'Double-ended queue' },
      { code: 'PriorityQueue<T> pq', desc: 'Min-heap by default' },
      { code: 'Collections.sort(list)', desc: 'Sort in-place' },
    ]},
    { title: 'Streams', items: [
      { code: 'list.stream().filter()', desc: 'Start stream + filter' },
      { code: '.map(fn).collect()', desc: 'Transform + collect to list' },
      { code: 'Collectors.toList()', desc: 'Collect to List' },
      { code: '.reduce(0, Integer::sum)', desc: 'Sum with reduce' },
      { code: '.sorted().distinct()', desc: 'Sort and deduplicate' },
    ]},
  ],
  cpp: [
    { title: 'STL Containers', items: [
      { code: 'vector<T> v', desc: 'Dynamic array' },
      { code: 'unordered_map<K,V>', desc: 'Hash map O(1) avg' },
      { code: 'map<K,V>', desc: 'Sorted map O(log n)' },
      { code: 'set<T>', desc: 'Sorted unique elements' },
      { code: 'priority_queue<T>', desc: 'Max-heap by default' },
      { code: 'queue<T> / stack<T>', desc: 'FIFO queue / LIFO stack' },
      { code: 'deque<T>', desc: 'Double-ended queue' },
    ]},
    { title: 'Algorithms', items: [
      { code: 'sort(v.begin(),v.end())', desc: 'Sort container' },
      { code: 'binary_search(b,e,val)', desc: 'Binary search' },
      { code: 'lower_bound(b,e,val)', desc: 'First >= val iterator' },
      { code: 'upper_bound(b,e,val)', desc: 'First > val iterator' },
      { code: 'reverse(b,e)', desc: 'Reverse range in-place' },
      { code: 'max_element(b,e)', desc: 'Iterator to max element' },
    ]},
  ],
  go: [
    { title: 'Fundamentals', items: [
      { code: 'make([]T, len, cap)', desc: 'Create slice' },
      { code: 'make(map[K]V)', desc: 'Create map' },
      { code: 'go func() {}()', desc: 'Launch goroutine' },
      { code: 'ch := make(chan T)', desc: 'Create channel' },
      { code: 'defer fn()', desc: 'Run fn when function exits' },
      { code: 'err != nil', desc: 'Always check errors!' },
    ]},
  ],
  rust: [
    { title: 'Ownership & Borrowing', items: [
      { code: 'let x = val', desc: 'Move ownership' },
      { code: '&val / &mut val', desc: 'Borrow / mutable borrow' },
      { code: 'val.clone()', desc: 'Deep copy' },
      { code: 'Option<T>', desc: 'Some(val) or None' },
      { code: 'Result<T,E>', desc: 'Ok(val) or Err(e)' },
      { code: 'val?', desc: 'Propagate error (in Result fn)' },
    ]},
  ],
};

let currentCsLang = 'javascript';
function initCheatsheet() {
  const bar = document.getElementById('csLangBar');
  const langs = Object.keys(CHEATSHEETS);
  bar.innerHTML = langs.map(l => `<button class="cs-lang-btn${l===currentCsLang?' active':''}" onclick="setCsLang('${l}')">${l.charAt(0).toUpperCase()+l.slice(1)}</button>`).join('');
  renderCheatsheet();
}
function setCsLang(l) {
  currentCsLang = l;
  document.querySelectorAll('.cs-lang-btn').forEach(b => b.classList.toggle('active', b.textContent.toLowerCase() === l));
  renderCheatsheet();
}
function renderCheatsheet() {
  const data = CHEATSHEETS[currentCsLang] || [];
  const grid = document.getElementById('csGrid');
  grid.innerHTML = data.map(section => `
    <div class="cs-card">
      <div class="cs-card-title">${section.title}</div>
      ${section.items.map(it => `
        <div class="cs-item" onclick="insertCheatItem('${it.code.replace(/'/g,"\\'")}')">
          <span class="cs-item-code" title="${it.code}">${it.code}</span>
          <span class="cs-item-desc">${it.desc}</span>
        </div>`).join('')}
    </div>`).join('');
}
function insertCheatItem(code) {
  const editor = document.getElementById('codeEditor');
  editor.value += (editor.value ? '\n' : '') + code;
  switchTab('code');
  showNotification(`✅ Added "${code}" to editor`, 'ok');
}

// ============================================================
// STACKOVERFLOW SEARCH (free Stack Exchange API)
// ============================================================
let soSort = 'votes';
function setSoSort(s, el) {
  soSort = s;
  document.querySelectorAll('.so-filter').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  const q = document.getElementById('soInput').value.trim();
  if (q) searchSO();
}
async function searchSO() {
  const q = document.getElementById('soInput').value.trim();
  if (!q) return;
  const box = document.getElementById('soResults');
  box.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px">🔍 Searching StackOverflow...</div>';
  try {
    const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=${soSort}&q=${encodeURIComponent(q)}&site=stackoverflow&pagesize=10&filter=withbody&key=U4DMV*8nvpm3EOpvf69Rxw((`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.items?.length) {
      box.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:30px">No results found. Try different keywords.</div>';
      return;
    }
    box.innerHTML = data.items.map(q => {
      const tags = q.tags?.slice(0,4).map(t=>`<span class="so-tag">${t}</span>`).join('') || '';
      return `<div class="so-result">
        <div class="so-result-title"><a href="${q.link}" target="_blank" rel="noopener">${q.title}</a></div>
        <div class="so-result-meta">
          <span class="so-score">▲ ${q.score}</span>
          <span class="so-answers">💬 ${q.answer_count} answers</span>
          <span class="so-views">👁 ${(q.view_count||0).toLocaleString()} views</span>
          ${q.is_answered ? '<span class="so-answered">✅ Answered</span>' : ''}
        </div>
        <div class="so-tags">${tags}</div>
      </div>`;
    }).join('');
  } catch(e) {
    box.innerHTML = `<div style="color:var(--danger);font-size:13px;text-align:center;padding:30px">❌ Search failed: ${e.message}</div>`;
  }
}

