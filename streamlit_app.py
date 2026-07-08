"""CodeMind — Streamlit Cloud entry point."""

from __future__ import annotations

import base64
import json
import os
import re
from pathlib import Path

import streamlit as st
APP_DIR = Path(__file__).parent
HTML_PATH = APP_DIR / "codemind.html"
LOCAL_DB_URL = "http://127.0.0.1:8787"

st.set_page_config(
    page_title="CodeMind — AI Coding Assistant",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
<style>
    #MainMenu, footer, header { visibility: hidden; }
    .block-container {
        padding: 0 !important;
        max-width: 100% !important;
        margin: 0 !important;
    }
    iframe {
        border: none !important;
        height: 100vh !important;
        min-height: 600px !important;
        display: block !important;
    }
    .stApp { overflow: hidden; }
</style>
""",
    unsafe_allow_html=True,
)

st.markdown(
    """
<div style="padding:14px 18px;margin:10px 12px 0;border:1px solid rgba(0,229,255,.22);border-radius:14px;
background:linear-gradient(180deg, rgba(0,229,255,.08), rgba(255,255,255,.02));color:#d9f8ff;
font-family:system-ui,sans-serif">
  <div style="font-weight:800;font-size:16px;margin-bottom:4px;">Connect your API keys to unlock the full app</div>
  <div style="font-size:13px;line-height:1.55;">
    Paste the keys for the providers you want to use. CodeMind will retain them locally and try fallback providers when one service is unavailable.
  </div>
</div>
""",
    unsafe_allow_html=True,
)


def _load_html() -> str:
    if not HTML_PATH.exists():
        st.error(f"Missing app bundle: `{HTML_PATH.name}`. Expected next to `streamlit_app.py`.")
        st.stop()
    return HTML_PATH.read_text(encoding="utf-8")


def _secret(name: str) -> str | None:
    secret_paths = [
        Path.home() / ".streamlit" / "secrets.toml",
        APP_DIR / ".streamlit" / "secrets.toml",
    ]
    if not any(path.exists() for path in secret_paths):
        return None
    try:
        value = st.secrets.get(name)
    except Exception:
        return None
    return value if value else None


def _inject_secrets(html: str) -> str:
    """Pre-fill API keys from Streamlit secrets (optional on Streamlit Cloud)."""
    keys = {
        "cm_gemini_key": _secret("GEMINI_API_KEY"),
        "cm_j0_key": _secret("JUDGE0_API_KEY"),
        "cm_gh_token": _secret("GITHUB_TOKEN"),
        "cm_groq_key": _secret("GROQ_API_KEY"),
        "cm_openrouter_key": _secret("OPENROUTER_API_KEY"),
        "cm_mistral_key": _secret("MISTRAL_API_KEY"),
        "cm_hf_key": _secret("HUGGINGFACE_API_KEY"),
        "cm_cloudflare_key": _secret("CLOUDFLARE_API_TOKEN"),
        "cm_cohere_key": _secret("COHERE_API_KEY"),
        "cm_deepseek_key": _secret("DEEPSEEK_API_KEY"),
    }
    entries = {k: v for k, v in keys.items() if v}
    if not entries:
        return html

    script = (
        "<script>"
        + "".join(
            f"localStorage.setItem({json.dumps(k)},{json.dumps(v)});"
            for k, v in entries.items()
        )
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
    script = (
        "<script>"
        "window.CODEMIND_STREAMLIT_MODE=true;"
        f"window.CODEMIND_STREAMLIT_CLOUD_MODE={json.dumps(known_cloud)};"
        f"window.CODEMIND_LOCAL_DB_URL={json.dumps(LOCAL_DB_URL)};"
        "</script>"
    )
    return html.replace("<body>", f"<body>{script}", 1)


def _make_data_url(html: str) -> str:
    encoded = base64.b64encode(html.encode("utf-8")).decode("ascii")
    return f"data:text/html;base64,{encoded}"


def _start_local_database_if_available() -> None:
    host = _request_host()
    if host and not host.startswith(("localhost", "127.0.0.1", "[::1]")):
        return
    try:
        from local_db_server import start_local_db_server

        start_local_db_server()
    except Exception:
        pass


def _read_bundled_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig").replace("\r\n", "\n").replace("\r", "\n")


def _bundle_scripts(html: str) -> str:
    pattern = re.compile(r'<script\s+src="([^"]+\.js)"[^>]*></script>')

    def replace(match: re.Match[str]) -> str:
        path = APP_DIR / match.group(1)
        if not path.exists():
            return match.group(0)
        content = _read_bundled_text(path)
        return f"<script>\n{content}\n</script>"

    return pattern.sub(replace, html)


def _bundle_styles(html: str) -> str:
    pattern = re.compile(r'<link rel="stylesheet" href="([^"]+\.css)"\s*/>')

    def replace(match: re.Match[str]) -> str:
        path = APP_DIR / match.group(1)
        if not path.exists():
            return match.group(0)
        content = _read_bundled_text(path)
        return f"<style>\n{content}\n</style>"

    return pattern.sub(replace, html)


_start_local_database_if_available()

if "bundled_html" not in st.session_state:
    raw = _load_html()
    raw = _bundle_styles(raw)
    raw = _bundle_scripts(raw)
    st.session_state["bundled_html"] = raw

html = _inject_secrets(_inject_deploy_mode(st.session_state["bundled_html"]))
st.iframe(_make_data_url(html), height=1400)
