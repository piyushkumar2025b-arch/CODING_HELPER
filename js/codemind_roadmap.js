// ============================================================
// LEARNING ROADMAP
// ============================================================
const ROADMAP_DATA = {
  javascript: {
    label: 'JavaScript',
    steps: [
      { title:'Foundations', level:'beginner', topics:['Variables & Data Types','Control Flow (if/else, loops)','Functions & Scope','Arrays & Objects','DOM Manipulation'] },
      { title:'Core JavaScript', level:'beginner', topics:['ES6+ Syntax (let/const, arrow fns, destructuring)','Template Literals','Spread / Rest','Modules (import/export)','Error Handling (try/catch)'] },
      { title:'Asynchronous JS', level:'intermediate', topics:['Callbacks','Promises & Promise chaining','async/await','Fetch API & HTTP','Event Loop & microtasks'] },
      { title:'Object-Oriented JS', level:'intermediate', topics:['Prototypal inheritance','Classes (ES6)','`this` keyword','Closures & factory functions','Design patterns (Observer, Module)'] },
      { title:'The Browser & Performance', level:'intermediate', topics:['Event delegation & bubbling','LocalStorage / SessionStorage','Web APIs (Intersection Observer, etc)','Performance profiling','Web Workers'] },
      { title:'Modern Tooling', level:'advanced', topics:['npm / package.json','Bundlers (Webpack / Vite)','Babel & transpilation','TypeScript basics','Testing (Jest, Vitest)'] },
      { title:'Frameworks & Beyond', level:'advanced', topics:['React / Vue / Svelte','State management','SSR / SSG','Node.js basics','REST & GraphQL APIs'] },
    ]
  },
  python: {
    label: 'Python',
    steps: [
      { title:'Python Basics', level:'beginner', topics:['Variables, types, and operators','Control flow (if/for/while)','Functions and arguments','Lists, tuples, dicts, sets','String manipulation'] },
      { title:'Intermediate Python', level:'beginner', topics:['List comprehensions','File I/O','Exception handling','Modules & packages','*args, **kwargs'] },
      { title:'Object-Oriented Python', level:'intermediate', topics:['Classes & objects','Inheritance & polymorphism','Dunder methods (`__init__`, `__str__`)','`@property`, `@staticmethod`, `@classmethod`','Abstract classes (abc)'] },
      { title:'Functional & Advanced', level:'intermediate', topics:['Generators & iterators','Decorators','Context managers','Lambda, map, filter, reduce','functools & itertools'] },
      { title:'Ecosystem & Tools', level:'intermediate', topics:['pip & virtual environments','Testing with pytest','Type hints & mypy','Linting (ruff, flake8)','Package publishing (setuptools)'] },
      { title:'Data & Web', level:'advanced', topics:['NumPy & Pandas fundamentals','Matplotlib / Seaborn','Flask or FastAPI','SQLAlchemy (ORM)','Async Python (asyncio)'] },
    ]
  },
  dsa: {
    label: 'DSA',
    steps: [
      { title:'Complexity Analysis', level:'beginner', topics:['Big O notation','Time vs space trade-offs','Best / average / worst case','Amortised analysis'] },
      { title:'Linear Data Structures', level:'beginner', topics:['Arrays & dynamic arrays','Linked lists (singly & doubly)','Stacks','Queues & deques','Hash maps & hash sets'] },
      { title:'Non-Linear Structures', level:'intermediate', topics:['Binary trees & BST','Heaps (min/max)','Tries','Graphs (adjacency list/matrix)','Union-Find (Disjoint Sets)'] },
      { title:'Sorting & Searching', level:'intermediate', topics:['Bubble, insertion, selection','Merge sort & quick sort','Heap sort','Binary search & variants','Counting / radix sort'] },
      { title:'Algorithm Patterns', level:'intermediate', topics:['Two pointers','Sliding window','Fast & slow pointers','BFS & DFS','Backtracking'] },
      { title:'Advanced Algorithms', level:'advanced', topics:['Dynamic programming (top-down & bottom-up)','Greedy algorithms','Divide and conquer','Graph algorithms (Dijkstra, Bellman-Ford, Floyd-Warshall)','Topological sort'] },
    ]
  },
  react: {
    label: 'React',
    steps: [
      { title:'JavaScript Prerequisites', level:'beginner', topics:['ES6+ (arrow fns, destructuring, spread)','Array methods (map, filter, reduce)','Modules','Promises & async/await','`this` and classes'] },
      { title:'React Fundamentals', level:'beginner', topics:['JSX syntax','Functional components','Props & prop drilling','useState hook','Conditional rendering & lists'] },
      { title:'Core Hooks', level:'intermediate', topics:['useEffect (side effects & cleanup)','useRef (DOM access & mutable refs)','useContext (global state)','useMemo & useCallback','Custom hooks'] },
      { title:'State Management', level:'intermediate', topics:['Lifting state up','Context API','Zustand or Redux Toolkit','React Query / TanStack Query','Local vs global state'] },
      { title:'Routing & Data', level:'intermediate', topics:['React Router v6','Protected routes','Data fetching patterns','Error boundaries','Suspense & lazy loading'] },
      { title:'Production Patterns', level:'advanced', topics:['Testing (React Testing Library, Vitest)','Performance (memo, profiler)','Accessibility (a11y)','SSR with Next.js','CI/CD and deployment'] },
    ]
  },
};

let roadmapLang = 'javascript';

function initRoadmap() {
  const bar = document.getElementById('roadmapLangBar');
  bar.innerHTML = Object.entries(ROADMAP_DATA).map(([k,v]) =>
    `<div class="roadmap-lang-btn${k===roadmapLang?' active':''}" onclick="setRoadmapLang('${k}',this)">${v.label}</div>`
  ).join('');
  renderRoadmap();
}

function setRoadmapLang(lang, el) {
  roadmapLang = lang;
  document.querySelectorAll('.roadmap-lang-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderRoadmap();
}

function renderRoadmap() {
  const data = ROADMAP_DATA[roadmapLang];
  const track = document.getElementById('roadmapTrack');
  const levelColors = { beginner:'var(--accent3)', intermediate:'var(--warn)', advanced:'var(--danger)' };
  track.innerHTML = data.steps.map((step, i) => {
    const col = levelColors[step.level] || 'var(--accent)';
    return `<div class="roadmap-step">
      <div class="roadmap-node" style="border-color:${col};box-shadow:0 0 12px ${col}30">
        <div class="roadmap-step-num" style="background:${col}20;color:${col}">${i+1}</div>
        <div class="roadmap-step-content">
          <div class="roadmap-step-title">${step.title}</div>
          <div class="roadmap-level-tag" style="background:${col}18;color:${col};border:1px solid ${col}30">${step.level}</div>
          <div class="roadmap-topics">
            ${step.topics.map(t => `<div class="roadmap-topic" onclick="this.classList.toggle('done')">
              <span class="roadmap-check">○</span> ${t}
            </div>`).join('')}
          </div>
        </div>
      </div>
      ${i < data.steps.length-1 ? '<div class="roadmap-connector"></div>' : ''}
    </div>`;
  }).join('');
  // Click to toggle check
  track.querySelectorAll('.roadmap-topic').forEach(el => {
    el.addEventListener('click', function() {
      const check = this.querySelector('.roadmap-check');
      if (this.classList.contains('done')) check.textContent = '✅';
      else check.textContent = '○';
    });
  });
}

