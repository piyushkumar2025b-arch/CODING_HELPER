// ============================================================
// QUIZ
// ============================================================
const QUIZ_DATA = {
  javascript: [
    { q:'What does `typeof null` return?', opts:['null','object','undefined','boolean'], ans:1, diff:'beginner', explain:'`typeof null` returns "object" — a long-standing bug in JavaScript that was never fixed for backward compatibility.' },
    { q:'Which method creates a shallow copy of an array?', opts:['arr.clone()','arr.copy()','arr.slice()','arr.splice()'], ans:2, diff:'beginner', explain:'`arr.slice()` with no arguments returns a new shallow copy of the entire array.' },
    { q:'What is the output of `0.1 + 0.2 === 0.3`?', opts:['true','false','NaN','TypeError'], ans:1, diff:'beginner', explain:'Due to floating-point precision, `0.1 + 0.2` is `0.30000000000000004`, not exactly `0.3`.' },
    { q:'What does the `??` operator do?', opts:['Logical OR','Nullish coalescing — returns right side only if left is null/undefined','Strict equality','Optional chaining'], ans:1, diff:'intermediate', explain:'`??` (nullish coalescing) returns the right operand only when the left is `null` or `undefined`, unlike `||` which triggers on any falsy value.' },
    { q:'Which is NOT a valid way to declare a variable in modern JS?', opts:['let x = 1','const x = 1','var x = 1','def x = 1'], ans:3, diff:'beginner', explain:'`def` is not a JavaScript keyword. Variables are declared with `let`, `const`, or `var`.' },
    { q:'What does `Array.from({length:3}, (_,i) => i)` produce?', opts:['[undefined,undefined,undefined]','[1,2,3]','[0,1,2]','Error'], ans:2, diff:'intermediate', explain:'`Array.from` with a mapping function receives `(element, index)`. So `(_,i) => i` produces `[0,1,2]`.' },
    { q:'What is a closure?', opts:['A function that calls itself','A function that retains access to its outer scope even after that scope has closed','An IIFE','A pure function'], ans:1, diff:'intermediate', explain:'A closure is a function that "closes over" variables from its lexical scope, preserving access to them even after the outer function has returned.' },
    { q:'What does `Promise.allSettled` do?', opts:['Resolves when all promises resolve','Rejects if any promise rejects','Resolves once all promises settle, whether fulfilled or rejected','Returns the fastest promise'], ans:2, diff:'intermediate', explain:'`Promise.allSettled` waits for all promises to settle and returns an array of result objects with `status: "fulfilled"` or `status: "rejected"`.' },
    { q:'Which loop guarantees at least one execution?', opts:['for','while','do...while','for...of'], ans:2, diff:'beginner', explain:'`do...while` executes its body first, then checks the condition — guaranteeing at least one iteration.' },
    { q:'What is event delegation?', opts:['Removing event listeners','Attaching a listener to a parent to handle events from children via bubbling','Preventing default behavior','Async event handling'], ans:1, diff:'advanced', explain:'Event delegation leverages event bubbling to handle events for many children from a single parent listener — improving performance and handling dynamic elements.' },
    { q:'What does `Object.freeze()` do?', opts:['Deep clones an object','Makes an object immutable (no add/delete/change)','Converts to JSON','Seals the prototype'], ans:1, diff:'intermediate', explain:'`Object.freeze()` prevents new properties from being added, existing properties from being removed or changed. Note: it is shallow — nested objects are not frozen.' },
    { q:'What is the difference between `==` and `===`?', opts:['No difference','`===` checks value and type; `==` does type coercion','`==` is faster','`===` only works on primitives'], ans:1, diff:'beginner', explain:'`===` (strict equality) checks both value and type without coercion. `==` performs type coercion before comparing.' },
  ],
  python: [
    { q:'What is the output of `bool([])` in Python?', opts:['True','False','None','Error'], ans:1, diff:'beginner', explain:'Empty collections are falsy in Python. `bool([])` returns `False`.' },
    { q:'What does `*args` capture in a function?', opts:['Keyword arguments as a dict','Positional arguments as a tuple','All arguments as a list','Default arguments'], ans:1, diff:'beginner', explain:'`*args` collects extra positional arguments into a tuple.' },
    { q:'Which is the correct way to create a set in Python?', opts:['set = []','set = {}','set = {1,2,3}','set = set[]'], ans:2, diff:'beginner', explain:'`{1,2,3}` creates a set. Note: `{}` alone creates an empty dict; use `set()` for an empty set.' },
    { q:'What is a generator in Python?', opts:['A class that creates objects','A function using `yield` that lazily produces values','A list comprehension','A decorator'], ans:1, diff:'intermediate', explain:'A generator function uses `yield` to produce values lazily — one at a time — consuming much less memory than building a full list.' },
    { q:'What does the `@property` decorator do?', opts:['Makes a method static','Allows a method to be accessed like an attribute','Caches the result','Makes a method private'], ans:1, diff:'intermediate', explain:'`@property` lets you define a method that is accessed like a plain attribute, allowing controlled access without explicit getter method calls.' },
    { q:'What is the GIL in CPython?', opts:['A garbage collector','Global Interpreter Lock — prevents true multi-thread parallelism for CPU-bound tasks','A type hint module','A build tool'], ans:1, diff:'advanced', explain:'The GIL (Global Interpreter Lock) ensures only one thread executes Python bytecode at a time in CPython, limiting CPU-bound parallelism. It does not affect I/O-bound tasks significantly.' },
    { q:'What is `list(map(str, [1,2,3]))` equal to?', opts:["['1','2','3']",'[1,2,3]','["str","str","str"]','Error'], ans:0, diff:'beginner', explain:'`map(str, [1,2,3])` applies `str()` to each element, producing `["1","2","3"]`.' },
    { q:'How do you merge two dicts in Python 3.9+?', opts:['dict1 + dict2','dict1 | dict2','{**dict1, **dict2} only','dict1.merge(dict2)'], ans:1, diff:'intermediate', explain:'Python 3.9+ introduced the `|` operator for merging dicts. Both `|` and `{**d1, **d2}` work, but `|` is the modern idiomatic way.' },
  ],
  dsa: [
    { q:'What is the time complexity of binary search?', opts:['O(n)','O(log n)','O(n log n)','O(1)'], ans:1, diff:'beginner', explain:'Binary search halves the search space each step — giving O(log n) time complexity.' },
    { q:'Which data structure uses LIFO order?', opts:['Queue','Heap','Stack','Linked List'], ans:2, diff:'beginner', explain:'A Stack uses LIFO (Last In, First Out). The last element pushed is the first one popped.' },
    { q:'What is the worst-case time complexity of QuickSort?', opts:['O(n log n)','O(n)','O(n²)','O(log n)'], ans:2, diff:'intermediate', explain:'QuickSort is O(n²) in the worst case (e.g., always picking the smallest/largest pivot on a sorted array), though average case is O(n log n).' },
    { q:'In a min-heap, what is always at the root?', opts:['The largest element','The middle element','The smallest element','A random element'], ans:2, diff:'beginner', explain:'A min-heap maintains the property that every parent is ≤ its children, so the minimum element is always at the root.' },
    { q:'What does BFS use to track nodes to visit?', opts:['Stack','Queue','Heap','Set'], ans:1, diff:'beginner', explain:'BFS (Breadth-First Search) uses a Queue (FIFO) to process nodes level by level.' },
    { q:'What is the space complexity of DFS on a graph with V vertices and E edges?', opts:['O(V+E)','O(V)','O(E)','O(1)'], ans:1, diff:'intermediate', explain:'DFS uses a stack (implicit via recursion) proportional to the depth, which in the worst case is O(V).' },
    { q:'Which algorithm finds the shortest path in an unweighted graph?', opts:['DFS','Dijkstra','BFS','Bellman-Ford'], ans:2, diff:'intermediate', explain:'BFS finds the shortest path (fewest edges) in an unweighted graph because it explores nodes level by level.' },
    { q:'What is a hash collision?', opts:['When two keys have the same hash value','When a hash table is full','When a key is not found','An overflow error'], ans:0, diff:'intermediate', explain:'A hash collision occurs when two different keys produce the same hash value, requiring a resolution strategy like chaining or open addressing.' },
    { q:'What is the time complexity of inserting into a balanced BST?', opts:['O(1)','O(log n)','O(n)','O(n log n)'], ans:1, diff:'intermediate', explain:'A balanced BST (like AVL or Red-Black tree) maintains O(log n) height, so insertion is O(log n).' },
    { q:'What is dynamic programming?', opts:['A type of recursion without memoization','Breaking a problem into overlapping subproblems and storing their results to avoid recomputation','A greedy algorithm','Parallel computing'], ans:1, diff:'intermediate', explain:'Dynamic programming solves problems by breaking them into overlapping subproblems and caching results (memoization or tabulation) to avoid redundant computation.' },
  ],
  react: [
    { q:'What hook do you use to manage local state in a functional component?', opts:['useEffect','useRef','useState','useContext'], ans:2, diff:'beginner', explain:'`useState` declares a state variable and a setter function in a functional component.' },
    { q:'When does `useEffect` run with an empty dependency array `[]`?', opts:['On every render','Never','Only once after the initial mount','Only when state changes'], ans:2, diff:'beginner', explain:'`useEffect(() => {...}, [])` runs once after the initial render — equivalent to `componentDidMount` in class components.' },
    { q:'What is the Virtual DOM?', opts:['A browser API','A lightweight in-memory representation of the real DOM that React uses to diff and batch updates','A CSS-in-JS library','The shadow DOM'], ans:1, diff:'intermediate', explain:'React maintains a Virtual DOM — an in-memory tree — and diffs it against the previous snapshot on each render to minimise actual DOM mutations.' },
    { q:'What does `key` prop do in a list?', opts:['Styles the element','Helps React identify which items changed, were added, or removed','Enables animations','Nothing — it is optional metadata'], ans:1, diff:'beginner', explain:'The `key` prop is a stable identity hint for React\'s reconciler. Without it, React may inefficiently re-render or reorder list items.' },
    { q:'What is the purpose of `useCallback`?', opts:['Memoizes a value','Memoizes a function reference to prevent unnecessary re-renders of child components','Fetches data','Manages side effects'], ans:1, diff:'intermediate', explain:'`useCallback` returns a memoized callback that only changes if its dependencies change — useful for stable function references passed to optimised child components.' },
    { q:'What is React Context used for?', opts:['Local component state','Passing data through the component tree without prop-drilling','Routing','Server-side rendering'], ans:1, diff:'intermediate', explain:'React Context provides a way to share values (like theme or auth) across the component tree without manually passing props at every level.' },
  ],
  cs: [
    { q:'What does CPU stand for?', opts:['Central Processing Unit','Core Processing Utility','Central Program Unit','Compute Processing Unit'], ans:0, diff:'beginner', explain:'CPU stands for Central Processing Unit — the primary component that executes program instructions.' },
    { q:'What is the difference between a process and a thread?', opts:['No difference','A process has its own memory space; threads share memory within a process','Threads are faster processes','Processes run on GPU'], ans:1, diff:'intermediate', explain:'A process has its own isolated memory space. Threads are lighter-weight units of execution that share the memory space of their parent process.' },
    { q:'What is cache locality (temporal + spatial)?', opts:['A caching library','Temporal: recently accessed data will be accessed again; Spatial: nearby memory will be accessed soon','A network optimization','A database index type'], ans:1, diff:'advanced', explain:'Cache locality has two forms: temporal (recently used data is likely to be used again soon) and spatial (data near recently accessed memory is likely to be accessed soon). Exploiting these improves performance.' },
    { q:'What does HTTP stand for?', opts:['HyperText Transfer Protocol','High Transfer Text Protocol','HyperText Transmission Process','Host Transfer Text Protocol'], ans:0, diff:'beginner', explain:'HTTP — HyperText Transfer Protocol — is the foundation of data communication on the Web.' },
    { q:'What is Big O notation used for?', opts:['Measuring exact runtime in milliseconds','Describing algorithm efficiency as input size grows','Profiling memory addresses','Counting lines of code'], ans:1, diff:'beginner', explain:'Big O notation describes how the time or space requirements of an algorithm scale as the input size (n) grows, ignoring constants and lower-order terms.' },
  ],
};

let quizState = { topic:'javascript', diff:'all', questions:[], current:0, score:0, streak:0, answered:false };

function initQuiz() {
  const grid = document.getElementById('quizTopicGrid');
  const topics = [{k:'javascript',l:'JavaScript'},{k:'python',l:'Python'},{k:'dsa',l:'DSA'},{k:'react',l:'React'},{k:'cs',l:'CS Fundamentals'}];
  grid.innerHTML = topics.map((t,i) =>
    `<div class="quiz-topic-btn${i===0?' active':''}" onclick="selectQuizTopic('${t.k}',this)">${t.l}</div>`
  ).join('');
}

function selectQuizTopic(t, el) {
  quizState.topic = t;
  document.querySelectorAll('.quiz-topic-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function toggleQuizDiff(el, d) {
  quizState.diff = d;
  document.querySelectorAll('#quizDiffRow .opt-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function startQuiz() {
  let pool = QUIZ_DATA[quizState.topic] || [];
  if (quizState.diff !== 'all') pool = pool.filter(q => q.diff === quizState.diff);
  if (!pool.length) { showNotification('No questions for this filter!','warn'); return; }
  // Shuffle
  quizState.questions = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(10, pool.length));
  quizState.current = 0; quizState.score = 0; quizState.streak = 0; quizState.answered = false;
  document.getElementById('quizSetup').style.display = 'none';
  document.getElementById('quizActive').style.display = 'flex';
  document.getElementById('quizResult').style.display = 'none';
  renderQuizQ();
}

function renderQuizQ() {
  const q = quizState.questions[quizState.current];
  const total = quizState.questions.length;
  document.getElementById('quizQNum').textContent = `Q ${quizState.current+1}/${total}`;
  document.getElementById('quizProgFill').style.width = `${((quizState.current+1)/total)*100}%`;
  document.getElementById('quizScoreDisplay').textContent = `Score: ${quizState.score}`;
  const streak = quizState.streak;
  const sb = document.getElementById('quizStreakBadge');
  if (streak >= 2) { sb.style.display=''; document.getElementById('quizStreakNum').textContent = streak; }
  else sb.style.display = 'none';
  document.getElementById('quizQText').textContent = q.q;
  document.getElementById('quizOptions').innerHTML = q.opts.map((o,i) =>
    `<div class="quiz-opt" onclick="selectQuizOpt(${i},this)">${String.fromCharCode(65+i)}. ${o}</div>`
  ).join('');
  document.getElementById('quizExplain').style.display = 'none';
  document.getElementById('nextQuizBtn').style.display = 'none';
  quizState.answered = false;
}

function selectQuizOpt(idx, el) {
  if (quizState.answered) return;
  quizState.answered = true;
  const q = quizState.questions[quizState.current];
  const opts = document.querySelectorAll('.quiz-opt');
  opts[q.ans].classList.add('quiz-correct');
  if (idx === q.ans) {
    el.classList.add('quiz-correct');
    quizState.score++; quizState.streak++;
    showNotification('✅ Correct!','ok');
  } else {
    el.classList.add('quiz-wrong');
    quizState.streak = 0;
    showNotification('❌ Wrong!','warn');
  }
  const explain = document.getElementById('quizExplain');
  explain.style.display = 'block';
  explain.innerHTML = `<span style="font-weight:700;color:var(--accent)">💡 Explanation:</span> ${q.explain}`;
  document.getElementById('nextQuizBtn').style.display = '';
  // Streak badge update
  const sb = document.getElementById('quizStreakBadge');
  if (quizState.streak >= 2) { sb.style.display=''; document.getElementById('quizStreakNum').textContent = quizState.streak; }
  else sb.style.display = 'none';
}

function nextQuizQ() {
  quizState.current++;
  if (quizState.current >= quizState.questions.length) { endQuiz(); return; }
  renderQuizQ();
}

function endQuiz() {
  document.getElementById('quizActive').style.display = 'none';
  const total = quizState.questions.length;
  const pct = Math.round((quizState.score/total)*100);
  const grade = pct >= 90 ? '🏆 Excellent!' : pct >= 70 ? '🎉 Good job!' : pct >= 50 ? '📚 Keep practicing!' : '💪 Keep going!';
  document.getElementById('quizResult').style.display = 'block';
  document.getElementById('quizResult').innerHTML = `
    <div style="text-align:center;padding:30px;display:flex;flex-direction:column;align-items:center;gap:16px;">
      <div style="font-size:48px">${grade.split(' ')[0]}</div>
      <div style="font-size:22px;font-weight:800">${grade.slice(2)}</div>
      <div style="font-size:36px;font-weight:900;color:var(--accent)">${quizState.score} / ${total}</div>
      <div style="font-size:14px;color:var(--muted)">${pct}% correct</div>
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button class="btn btn-primary" onclick="startQuiz()">🔄 Try Again</button>
        <button class="btn btn-secondary" onclick="resetQuiz()">⬅ Change Topic</button>
      </div>
    </div>`;
}

function resetQuiz() {
  document.getElementById('quizSetup').style.display = '';
  document.getElementById('quizActive').style.display = 'none';
  document.getElementById('quizResult').style.display = 'none';
}

