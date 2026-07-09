"""CodeMind — Streamlit Cloud entry point (fully self-contained build)."""

from __future__ import annotations

import base64
import json
import os
import re
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

APP_DIR = Path(__file__).parent
# Use the pre-bundled standalone file if it exists, else fall back to raw HTML + separate assets
STANDALONE_PATH = APP_DIR / "codemind_standalone.html"
HTML_PATH = APP_DIR / "codemind.html"
LOCAL_DB_URL = "http://127.0.0.1:8787"

st.set_page_config(
    page_title="CodeMind — AI Coding Assistant",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# Remove ALL Streamlit chrome so the iframe fills 100% of the viewport
st.markdown(
    """
<style>
    #MainMenu, footer, header, [data-testid="stToolbar"] { visibility: hidden !important; height: 0 !important; }
    .block-container {
        padding: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
    }
    [data-testid="stAppViewContainer"] {
        padding: 0 !important;
    }
    [data-testid="stAppViewContainer"] > section {
        padding: 0 !important;
    }
    [data-testid="stVerticalBlock"] {
        gap: 0 !important;
        padding: 0 !important;
    }
    iframe {
        border: none !important;
        display: block !important;
        width: 100% !important;
        height: 100vh !important;
        max-height: 100vh !important;
    }
    .stApp {
        overflow: hidden !important;
        height: 100vh !important;
    }
    /* Hide Streamlit's own scrollbar — the inner app scrolls */
    html, body { overflow: hidden !important; height: 100% !important; }
</style>
""",
    unsafe_allow_html=True,
)


def _load_html() -> str:
    """Load and inline all CSS/JS assets into a single self-contained HTML."""
    # Prefer pre-bundled standalone if exists
    if STANDALONE_PATH.exists():
        return STANDALONE_PATH.read_text(encoding="utf-8")

    if not HTML_PATH.exists():
        st.error(f"Missing app bundle: `{HTML_PATH.name}`. Expected next to `streamlit_app.py`.")
        st.stop()

    html = HTML_PATH.read_text(encoding="utf-8")

    # Inline CSS
    css_pattern = re.compile(r'<link rel="stylesheet" href="(css/[^"]+\.css)"\s*/>')
    def inline_css(m: re.Match) -> str:
        p = APP_DIR / m.group(1)
        if p.exists():
            content = p.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
            return f"<style>\n{content}\n</style>"
        return m.group(0)
    html = css_pattern.sub(inline_css, html)

    # Inline JS
    js_pattern = re.compile(r'<script src="(js/[^"]+\.js)"[^>]*></script>')
    def inline_js(m: re.Match) -> str:
        p = APP_DIR / m.group(1)
        if p.exists():
            content = p.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
            return f"<script>\n{content}\n</script>"
        return m.group(0)
    html = js_pattern.sub(inline_js, html)

    return html


def _secrets_file_exists() -> bool:
    """Return True only if a secrets.toml is actually present on disk."""
    candidates = [
        Path.home() / ".streamlit" / "secrets.toml",
        APP_DIR / ".streamlit" / "secrets.toml",
    ]
    return any(p.exists() for p in candidates)


# Read secrets exactly once, silently — only if the file actually exists.
_SECRETS: dict[str, str] = {}
if _secrets_file_exists():
    _KEY_MAP = {
        "cm_gemini_key":      "GEMINI_API_KEY",
        "cm_j0_key":          "JUDGE0_API_KEY",
        "cm_gh_token":        "GITHUB_TOKEN",
        "cm_groq_key":        "GROQ_API_KEY",
        "cm_openrouter_key":  "OPENROUTER_API_KEY",
        "cm_mistral_key":     "MISTRAL_API_KEY",
        "cm_hf_key":          "HUGGINGFACE_API_KEY",
        "cm_cloudflare_key":  "CLOUDFLARE_API_TOKEN",
        "cm_cohere_key":      "COHERE_API_KEY",
        "cm_deepseek_key":    "DEEPSEEK_API_KEY",
    }
    for _js_key, _secret_name in _KEY_MAP.items():
        try:
            _val = st.secrets.get(_secret_name)
            if _val:
                _SECRETS[_js_key] = _val
        except Exception:
            pass


def _inject_secrets(html: str) -> str:
    if not _SECRETS:
        return html
    script = (
        "<script>"
        + "".join(f"localStorage.setItem({json.dumps(k)},{json.dumps(v)});" for k, v in _SECRETS.items())
        + "</script>"
    )
    return html.replace("<body>", f"<body>{script}", 1)


def _request_host() -> str:
    try:
        return st.context.headers.get("host", "")
    except Exception:
        return ""


def _inject_deploy_mode(html: str) -> str:
    host = _request_host()
    known_cloud = bool(os.getenv("STREAMLIT_CLOUD")) or (
        bool(host) and not host.startswith(("localhost", "127.0.0.1", "[::1]"))
    )
    # Also inject CSS that forces the inner app to fill 100% height inside the iframe
    fill_css = """<style>
html, body { height: 100% !important; overflow: hidden !important; }
#app { height: 100vh !important; }
</style>"""
    script = (
        "<script>"
        "window.CODEMIND_STREAMLIT_MODE=true;"
        f"window.CODEMIND_STREAMLIT_CLOUD_MODE={json.dumps(known_cloud)};"
        f"window.CODEMIND_LOCAL_DB_URL={json.dumps(LOCAL_DB_URL)};"
        "</script>"
    )
    html = html.replace("<head>", f"<head>{fill_css}", 1)
    return html.replace("<body>", f"<body>{script}", 1)


def _start_local_database_if_available() -> None:
    host = _request_host()
    if host and not host.startswith(("localhost", "127.0.0.1", "[::1]")):
        return
    try:
        from local_db_server import start_local_db_server
        start_local_db_server()
    except Exception:
        pass


_start_local_database_if_available()

if "bundled_html" not in st.session_state:
    st.session_state["bundled_html"] = _load_html()

html = _inject_secrets(_inject_deploy_mode(st.session_state["bundled_html"]))

# Use a very large height so the iframe never clips content.
# The Streamlit CSS above sets .stApp { height: 100vh; overflow: hidden }
# and the inner HTML sets html/body to 100% — together they fill the viewport.
components.html(html, height=99999, scrolling=False)
