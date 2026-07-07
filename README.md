# CodeMind

CodeMind is a Streamlit-deployable AI coding workspace for solving programming problems, reviewing code, running snippets, searching technical documentation, testing APIs, practicing interviews, and keeping a local record of coding conversations when the app is run on your own laptop.

It is designed to work in two modes:

- **Cloud/demo mode:** runs on Streamlit Cloud without requiring a backend database.
- **Local power-user mode:** runs on your laptop with a local SQLite conversation database.

The project is mostly a self-contained HTML/JavaScript app wrapped by Streamlit for easy deployment.

## What CodeMind Is For

CodeMind is useful when you want one coding workspace that can help with:

- solving LeetCode, Codeforces, and general programming problems
- debugging existing code
- explaining unfamiliar code
- optimizing algorithms
- generating unit tests
- reviewing code for bugs, security, performance, and style
- running local JavaScript or HTML previews
- running compiled/interpreted languages through Judge0 when a key is available
- searching docs, packages, GitHub profiles, and developer references
- checking whether external APIs and keys are working
- saving conversations locally while working on your own machine

The app tries to make failures understandable. If an API request fails, CodeMind shows whether the issue looks like a missing key, invalid input, rate limit, provider downtime, network/CORS problem, or unsupported format.

## Main Features

### AI Coding Assistant

The primary panel can answer programming questions in several modes:

- **Solve Problem:** generate an approach and solution for coding problems.
- **Debug Code:** identify bugs and produce a corrected version.
- **Explain Code:** break down what code does and how it works.
- **Optimize:** improve time complexity, space complexity, or structure.
- **Generate Code:** create code from a plain-language request.
- **Complexity:** analyze Big-O time and space complexity.
- **Unit Tests:** generate tests for common frameworks.
- **Code Review:** review quality, bugs, performance, and security.

Supported language choices include JavaScript, HTML/CSS, Python, TypeScript, Java, C++, C, C#, Go, Rust, Kotlin, Swift, Ruby, PHP, Scala, R, Dart, SQL, PostgreSQL, MySQL, MongoDB-style JavaScript, Bash, PowerShell, Julia, MATLAB/Octave, Haskell, Elixir, Lua, Solidity, GraphQL, YAML, Assembly, COBOL, and Prolog.

### Code Editor And Runner

CodeMind includes an editor area for writing and testing code. JavaScript and HTML/CSS can run directly in the browser. Other languages can run through Judge0 if a RapidAPI Judge0 key is configured.

Typical use cases:

- test a small algorithm quickly
- paste generated code and run it
- preview an HTML/CSS/JS page
- debug output from code execution
- compare AI-generated code with your own attempt

### API Controller And Live E2E Checks

The app includes a live API controller panel and an `E2E x/y` status badge.

These checks help verify:

- Gemini API key status
- Judge0 API key status
- GitHub token status
- public API availability
- feature-handler readiness
- whether a tool is working, missing a key, or blocked by provider/network issues

Clicking the `E2E` badge opens a live report. If something fails, the report gives a practical reason instead of only showing a generic error.

### Developer Tools

CodeMind includes a set of small developer utilities:

- JSON format, minify, and validate
- Base64 encode/decode
- URL encode/decode
- hash generation
- timestamp conversion
- color conversion and palettes
- GitHub profile lookup
- regex testing
- code diffing
- cheatsheets
- StackOverflow search
- npm package search

These are meant for fast daily coding tasks without leaving the workspace.

### Docs And Reference Search

CodeMind includes documentation lookup tools for:

- MDN-style web platform search
- DevDocs search
- Can I Use style browser feature lookup
- npm package information
- PyPI package information
- crates.io package information
- Hugging Face model lookup
- ML/AI paper search
- GitHub repository search
- `.gitignore` generation

Search tools include format hints and safer error handling. For example, if a docs API is unavailable, CodeMind gives a direct fallback link or explains the reason.

### Learning And Practice

The app also includes learning-oriented sections:

- coding quizzes
- flashcards
- interview prep
- learning roadmap
- Big-O chart and AI explanation
- SQL playground
- LeetCode-style stats tools
- Exercism-style challenge helpers

These features are useful for interview preparation, revision, and daily practice.

### Extra Public API Tools

CodeMind includes several public API demos and helpers:

- country information
- trivia quiz
- QR code generation
- random user data
- currency exchange
- weather
- tech news
- IP/DNS lookup
- developer quotes
- color palette API

These tools are also useful examples for seeing how external API calls are handled in the browser.

## Smoothness And Safety Layer

The project includes site-wide handlers for smoother operation:

- draft autosave for the current problem/code/editor state
- smoother scrolling and interaction handling
- neon focus/touch feedback
- invalid input highlighting
- safer API fetch handling with timeouts
- clear input placeholders and format hints
- live API status explanations

If an input must follow a strict format, the app tries to say so directly instead of letting the request fail silently.

## Local Conversation Database

CodeMind now includes a real local database for local runs.

When CodeMind is run locally on:

- `localhost`
- `127.0.0.1`
- `::1`
- direct local file mode

conversation saving is allowed.

### SQLite On Local Streamlit

When you run CodeMind locally with Streamlit, the app starts a small local SQLite service automatically. Conversations are saved to:

```text
local_data/codemind_conversations.sqlite3
```

The local database stores conversation records such as:

- created time
- status
- selected mode
- selected language
- platform
- question text
- optional code input
- editor code
- AI response text
- rendered response HTML
- error message, if any

The floating `SQLite DB` button lets you:

- see how many conversations are saved
- open the local conversation panel
- restore a previous conversation
- export all conversations as JSON
- clear the local database

### Browser Fallback

If the SQLite service is unavailable but the app is still running locally, CodeMind falls back to the browser's IndexedDB storage.

This fallback is useful for static local previews, but the SQLite file is the preferred local database for Streamlit runs.

### Cloud Privacy Rule

On Streamlit Cloud or public hosted deployments, the database is disabled.

Users see a polite notice explaining:

> You are viewing CodeMind on Streamlit Cloud, so the local conversation database is disabled here and this deployment will not save your chats permanently. To save every conversation on your laptop, run the project locally.

This is intentional. A public cloud deployment should not pretend to be a private local database.

The SQLite file and local data folder are ignored by git:

```text
local_data/
*.sqlite3
*.sqlite3-journal
```

## Streamlit Deployment

Deploy this repository with:

- Main file: `streamlit_app.py`
- Requirements file: `requirements.txt`
- Python: `3.11` or newer is recommended

Required files and folders:

- `streamlit_app.py`
- `requirements.txt`
- `codemind.html`
- `local_db_server.py`
- `js/`
- `css/`
- `.streamlit/`

The Streamlit wrapper bundles local JavaScript and CSS into the embedded HTML, so the app works on Streamlit Cloud without requiring a separate static-file server.

On Streamlit Cloud, the local SQLite database service is not used for persistent user data. Users are shown the cloud-mode notice described above.

## Optional API Secrets

Add these in Streamlit Cloud secrets if you want keys preloaded automatically:

```toml
GEMINI_API_KEY = "your_gemini_key"
JUDGE0_API_KEY = "your_rapidapi_judge0_key"
GITHUB_TOKEN = "your_github_token"
```

If secrets are not set, users can enter keys inside the app. Keys are stored in browser local storage for that user.

### Gemini

Gemini powers the main AI coding features. Without a Gemini key, non-AI tools still work, but AI solving, review, explanation, and generation will ask the user to connect a key.

### Judge0

Judge0 is used for running many non-browser languages. JavaScript and HTML/CSS can run locally in the browser. Languages like C++, Java, Rust, Go, and Python require Judge0 support through RapidAPI.

### GitHub Token

The GitHub token is used for features such as saving/loading Gists or authenticated GitHub API calls. Public GitHub lookups may work without a token, but rate limits are lower.

## Local Run

Install requirements:

```bash
pip install -r requirements.txt
```

Run Streamlit:

```bash
streamlit run streamlit_app.py
```

Then open the local URL shown by Streamlit, usually:

```text
http://localhost:8501
```

In local mode, the SQLite database service starts automatically and listens on:

```text
http://127.0.0.1:8787
```

You normally do not need to open this service directly. It is used by the browser app to save and retrieve conversations.

## Static Local Preview

For a simple static preview, you can serve the folder:

```bash
python -m http.server 5177
```

Then open:

```text
http://127.0.0.1:5177/codemind.html
```

In this mode, SQLite is not automatically started unless you start it yourself through the Python code. The app can still use browser IndexedDB as a local fallback.

## Input Formats

Some tools intentionally accept only strict formats:

- Country search: country names only, for example `India`, `Japan`, `United States`
- Currency converter: amount like `100`; currency codes must be 3 letters, for example `USD`, `INR`, `EUR`
- Trivia amount: whole number from `1` to `20`
- Random users count: whole number from `1` to `20`
- GitHub profile: username only, for example `torvalds`
- HEX color: `#00e5ff` or `00e5ff`
- Timestamp: Unix seconds, Unix milliseconds, or a valid date string
- JSON tools: valid JSON with double-quoted keys and strings
- Docs search: plain topic keywords, for example `CSS grid`, `fetch API`, `Array.prototype.map`
- QR generator: URL or plain text
- Gemini key: a valid Google AI Studio/Gemini API key
- Judge0 key: a RapidAPI key for Judge0 CE
- GitHub token: a token with the needed scope, such as `gist` for Gist features

Invalid inputs show format hints in the app instead of failing silently.

## Example Use Cases

### Competitive Programming Practice

Paste a problem statement into the problem tab, choose the language, select `Optimal`, and ask CodeMind. You can then copy the generated solution into the editor, run it if supported, and ask for complexity analysis.

### Debugging A Broken Solution

Paste your failing code into the code input, choose `Debug Code`, and optionally describe the failing test case. CodeMind can explain the bug, produce corrected code, and identify edge cases.

### Interview Preparation

Use the quiz, flashcards, interview prep, roadmap, and Big-O tools to revise concepts. Use the AI assistant to ask for step-by-step explanations or hints instead of full solutions.

### API Key Setup

Open the API controller, enter keys, and run live tests. The app will show whether each key is working and why a request failed if it does not pass.

### Local Study Journal

Run CodeMind locally, ask coding questions during study sessions, and use the `SQLite DB` button to revisit previous conversations. Export the database records as JSON when you want a backup or archive.

### Frontend Experimentation

Choose HTML/CSS, generate or paste a small page, and use the preview feature. The neon CSS and site-smoothness handlers make the interface responsive for quick UI experiments.

## Troubleshooting

### The AI Features Ask For A Key

Add a Gemini key through the app modal or through Streamlit secrets. Non-AI tools can still work without this key.

### Judge0 Languages Do Not Run

Check that the Judge0 RapidAPI key is present and valid. Use the API Controller panel to run a live Judge0 test.

### The Local DB Button Does Not Appear

The database button appears only in a local environment. Use `localhost`, `127.0.0.1`, `::1`, or local file mode. On Streamlit Cloud, database saving is disabled by design.

### SQLite Is Not Saving

Run the app locally with:

```bash
streamlit run streamlit_app.py
```

Then check whether this file exists:

```text
local_data/codemind_conversations.sqlite3
```

If SQLite is not reachable, the app should fall back to browser IndexedDB in local mode.

### API Requests Fail

Possible causes include:

- missing key
- expired key
- wrong key format
- rate limit
- blocked domain
- network issue
- CORS issue
- provider outage
- invalid input format

Use the `E2E` badge or API Controller panel to see a more specific reason.

## Project Structure

```text
.
├── streamlit_app.py
├── local_db_server.py
├── requirements.txt
├── codemind.html
├── css/
│   └── codemind_neon_extra.css
├── js/
│   ├── codemind_site_handler.js
│   ├── codemind_safety_handler.js
│   ├── codemind_api_e2e_handler.js
│   ├── codemind_feature_handler.js
│   └── other feature modules
├── .streamlit/
│   └── config.toml
└── local_data/
    └── codemind_conversations.sqlite3
```

`local_data/` is created locally and ignored by git.

## Notes

Some APIs are third-party services and can fail because of rate limits, downtime, blocked requests, or missing/expired keys. When a fetch succeeds, CodeMind shows the real result. When it fails, CodeMind shows the closest real reason returned by the provider or browser.

The local database is intentionally local. It is meant for the person running CodeMind on their own laptop, not for public cloud persistence.
