// ============================================================
// STATE
// ============================================================
let apiKey = localStorage.getItem('cm_gemini_key') || '';
let judge0Key = localStorage.getItem('cm_j0_key') || '';
let ghToken = localStorage.getItem('cm_gh_token') || '';
let currentMode = 'solve';
let currentLang = 'javascript';
let currentPlatform = 'leetcode';
let selectedAnswerType = 'optimal';
let isLoading = false;
let previewOpen = false;
let regexFlags = new Set(['g']);

const GEMINI_MODELS = [
  'gemini-2.5-flash','gemini-2.5-pro',
  'gemini-2.5-flash-lite-preview-06-17',
  'gemini-2.0-flash','gemini-2.0-flash-lite',
  'gemini-1.5-pro','gemini-1.5-flash'
];

// Judge0 language IDs
const J0_IDS = {
  python:71, typescript:74, java:62, cpp:54, c:50,
  csharp:51, go:60, rust:73, kotlin:78, swift:83,
  ruby:72, php:68, scala:81, r:80, dart:91
};

const PISTON_RUNTIMES = {
  python:{ language:'python', version:'3.10.0' },
  typescript:{ language:'typescript', version:'5.0.3' },
  java:{ language:'java', version:'15.0.2' },
  cpp:{ language:'cpp', version:'10.2.0' },
  c:{ language:'c', version:'10.2.0' },
  csharp:{ language:'csharp', version:'6.12.0' },
  go:{ language:'go', version:'1.16.2' },
  rust:{ language:'rust', version:'1.68.2' },
  kotlin:{ language:'kotlin', version:'1.8.20' },
  swift:{ language:'swift', version:'5.3.3' },
  ruby:{ language:'ruby', version:'3.0.1' },
  php:{ language:'php', version:'8.2.3' },
  scala:{ language:'scala', version:'3.2.2' },
  r:{ language:'r', version:'4.1.1' },
  dart:{ language:'dart', version:'2.19.6' }
};

const LANG_LABELS = {
  javascript:'JavaScript', html:'HTML/CSS', python:'Python',
  typescript:'TypeScript', java:'Java', cpp:'C++', c:'C',
  csharp:'C#', go:'Go', rust:'Rust', kotlin:'Kotlin',
  swift:'Swift', ruby:'Ruby', php:'PHP', scala:'Scala',
  r:'R', dart:'Dart'
};

const LANGS = ['JavaScript','HTML/CSS','Python','TypeScript','Java','C++','C','C#','Go','Rust','Kotlin','Swift','Ruby','PHP','Scala','R','Dart'];

