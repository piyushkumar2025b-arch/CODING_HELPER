// ============================================================
// FLASHCARDS
// ============================================================
const FLASHCARD_DECKS = {
  js_basics: {
    label:'JS Basics', cards:[
      { front:'What is hoisting?', back:'Variable and function declarations are moved to the top of their scope during compilation. `var` is hoisted as undefined; `let`/`const` are hoisted but not initialised (Temporal Dead Zone).' },
      { front:'What is the prototype chain?', back:'Every JS object has a hidden `[[Prototype]]` link. When a property is not found on an object, JS looks up the chain until it reaches `null`.' },
      { front:'What is an IIFE?', back:'Immediately Invoked Function Expression — a function that is defined and called at the same time: `(function(){ ... })();`. Used to create a private scope.' },
      { front:'Difference between `null` and `undefined`', back:'`undefined` means a variable was declared but not assigned. `null` is an intentional absence of value, explicitly set by the programmer.' },
      { front:'What is event bubbling?', back:'When an event fires on a child element, it propagates (bubbles) up through all parent elements. Use `event.stopPropagation()` to stop it.' },
      { front:'What is `this` in JavaScript?', back:'`this` refers to the execution context. In a method it is the object. In a function it is global/undefined (strict). Arrow functions inherit `this` from their enclosing scope.' },
      { front:'What are Promises?', back:'Objects representing the eventual completion or failure of an asynchronous operation. States: pending → fulfilled or rejected. Use `.then()`, `.catch()`, `.finally()`, or `async/await`.' },
      { front:'What is the spread operator `...`?', back:'Expands an iterable into individual elements. In arrays: `[...a, ...b]` merges. In function calls: `fn(...args)`. In objects: `{...obj, key:val}` shallow clones.' },
    ]
  },
  dsa_concepts: {
    label:'DSA Concepts', cards:[
      { front:'What is a Hash Map / Hash Table?', back:'A data structure that maps keys to values using a hash function. Average O(1) get/set. Handles collisions via chaining (linked lists) or open addressing.' },
      { front:'What is a Linked List?', back:'A linear data structure where each node contains data and a pointer to the next node. O(1) insert at head; O(n) random access.' },
      { front:'Difference: Stack vs Queue', back:'Stack: LIFO (Last In First Out) — push/pop from the same end. Queue: FIFO (First In First Out) — enqueue at back, dequeue from front.' },
      { front:'What is memoisation?', back:'Caching the results of expensive function calls and returning the cached result when the same inputs occur again. Core technique in top-down dynamic programming.' },
      { front:'What is a Trie?', back:'A tree where each node represents a character. Used for efficient prefix-based string lookups (autocomplete, spell check). O(m) search where m is word length.' },
      { front:'What is a binary tree vs BST?', back:'Binary tree: each node has at most 2 children. BST (Binary Search Tree): additionally, left child < node < right child, enabling O(log n) search on balanced trees.' },
      { front:'What is amortised O(1)?', back:'An operation that is occasionally expensive but cheap on average over many operations. Example: dynamic array (ArrayList) resize — doubling strategy gives amortised O(1) append.' },
      { front:'What is a graph?', back:'A set of vertices (nodes) connected by edges. Can be directed/undirected and weighted/unweighted. Traversed via BFS (shortest path) or DFS (cycle detection, topological sort).' },
    ]
  },
  system_design: {
    label:'System Design', cards:[
      { front:'What is horizontal vs vertical scaling?', back:'Vertical: add more resources (CPU/RAM) to one machine. Horizontal: add more machines and distribute load. Horizontal scales better for large systems.' },
      { front:'What is a CDN?', back:'Content Delivery Network — a distributed set of servers that cache static content close to users, reducing latency and origin server load.' },
      { front:'What is a load balancer?', back:'Distributes incoming traffic across multiple servers. Algorithms: round-robin, least connections, IP hash. Improves availability and scalability.' },
      { front:'What is database sharding?', back:'Partitioning a database horizontally — splitting rows across multiple databases (shards) based on a shard key. Enables horizontal scaling of writes.' },
      { front:'What is eventual consistency?', back:'In distributed systems, replicas may temporarily diverge after a write, but will converge to the same state eventually. Trade-off: availability over strict consistency (CAP theorem).' },
      { front:'What is a message queue?', back:'A buffer (e.g. Kafka, RabbitMQ, SQS) that decouples producers from consumers, enabling async processing, load smoothing, and fault tolerance.' },
      { front:'What is the CAP theorem?', back:'A distributed system can guarantee at most 2 of 3: Consistency (all nodes see the same data), Availability (every request gets a response), Partition Tolerance (works despite network splits).' },
      { front:'What is caching and what are common strategies?', back:'Storing frequently accessed data in fast storage. Strategies: Cache-aside (app manages cache), Write-through (write to cache+DB together), Write-back (async DB write), Read-through.' },
    ]
  },
  python_tips: {
    label:'Python Tips', cards:[
      { front:'What is a decorator?', back:'A function that wraps another function to extend its behaviour without modifying it. Syntax: `@decorator` above the function definition.' },
      { front:'`list` vs `tuple` vs `set`', back:'List: ordered, mutable, allows duplicates. Tuple: ordered, immutable, allows duplicates. Set: unordered, mutable, no duplicates. Use frozenset for immutable sets.' },
      { front:'What is `__init__` vs `__new__`?', back:'`__new__` creates the instance (called first). `__init__` initialises it. Override `__new__` only when subclassing immutable types like `int` or `str`.' },
      { front:'What is `yield` vs `return`?', back:'`return` exits the function and sends one value. `yield` pauses the function and sends a value, preserving state for the next iteration — making it a generator.' },
      { front:'What are `*args` and `**kwargs`?', back:'`*args` collects extra positional args into a tuple. `**kwargs` collects extra keyword args into a dict. Convention only — `*any_name` works.' },
      { front:'What is list slicing `a[1:4:2]`?', back:'`a[start:stop:step]` — returns elements from index 1 up to (not including) 4, stepping by 2. Negative step reverses: `a[::-1]` reverses the list.' },
    ]
  },
};

let fcState = { deck:null, cards:[], idx:0, flipped:false, stats:{easy:0,ok:0,hard:0} };

function initFlashcards() {
  const bar = document.getElementById('fcDeckBar');
  bar.innerHTML = Object.entries(FLASHCARD_DECKS).map(([k,v]) =>
    `<div class="fc-deck-btn" onclick="loadDeck('${k}',this)">${v.label}</div>`
  ).join('');
}

function loadDeck(key, el) {
  fcState.deck = key;
  fcState.cards = [...FLASHCARD_DECKS[key].cards];
  fcState.idx = 0; fcState.flipped = false; fcState.stats = {easy:0,ok:0,hard:0};
  document.querySelectorAll('.fc-deck-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('fcRating').style.display = 'none';
  renderFcCard();
}

function renderFcCard() {
  if (!fcState.cards.length) return;
  const c = fcState.cards[fcState.idx];
  document.getElementById('fcFront').textContent = c.front;
  document.getElementById('fcBack').textContent = c.back;
  document.getElementById('fcFrontHint').textContent = 'Click to reveal answer';
  document.getElementById('fcCounter').textContent = `${fcState.idx+1} / ${fcState.cards.length}`;
  // Reset flip
  fcState.flipped = false;
  const card = document.getElementById('fcCard');
  card.classList.remove('flipped');
  document.getElementById('fcRating').style.display = 'none';
  const t = fcState.stats;
  document.getElementById('fcStats').textContent = `✅ ${t.easy}  🤔 ${t.ok}  😵 ${t.hard}`;
}

function flipCard() {
  if (!fcState.cards.length) return;
  fcState.flipped = !fcState.flipped;
  document.getElementById('fcCard').classList.toggle('flipped', fcState.flipped);
  if (fcState.flipped) document.getElementById('fcRating').style.display = 'flex';
}

function fcNext() {
  if (!fcState.cards.length) return;
  fcState.idx = (fcState.idx + 1) % fcState.cards.length;
  renderFcCard();
}

function fcPrev() {
  if (!fcState.cards.length) return;
  fcState.idx = (fcState.idx - 1 + fcState.cards.length) % fcState.cards.length;
  renderFcCard();
}

function fcRate(r) {
  fcState.stats[r]++;
  fcNext();
}

function fcShuffle() {
  if (!fcState.cards.length) return;
  fcState.cards.sort(() => Math.random() - 0.5);
  fcState.idx = 0;
  renderFcCard();
  showNotification('🔀 Deck shuffled!','ok');
}

function fcReset() {
  if (!fcState.deck) return;
  fcState.cards = [...FLASHCARD_DECKS[fcState.deck].cards];
  fcState.idx = 0; fcState.stats = {easy:0,ok:0,hard:0};
  renderFcCard();
}

