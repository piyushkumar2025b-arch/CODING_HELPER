"""CodeMind — Streamlit Cloud entry point."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

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
    }
    iframe { border: none !important; }
</style>
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
    except (FileNotFoundError, KeyError, AttributeError):
        return None
    return value if value else None


def _inject_secrets(html: str) -> str:
    """Pre-fill API keys from Streamlit secrets (optional on Streamlit Cloud)."""
    keys = {
        "cm_gemini_key": _secret("GEMINI_API_KEY"),
        "cm_j0_key": _secret("JUDGE0_API_KEY"),
        "cm_gh_token": _secret("GITHUB_TOKEN"),
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
        f"window.CODEMIND_STREAMLIT_CLOUD_MODE={json.dumps(known_cloud)} || "
        "(function(){try{var h=(window.parent&&window.parent.location&&window.parent.location.hostname)||location.hostname;"
        "return !!h && !/^(localhost|127\\.0\\.0\\.1|::1)$/.test(h);}catch(e){return false;}})();"
        f"window.CODEMIND_LOCAL_DB_URL={json.dumps(LOCAL_DB_URL)};"
        "</script>"
    )
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


def _bundle_scripts(html: str) -> str:
    pattern = re.compile(r'<script src="([^"]+\.js)"></script>')

    def replace(match: re.Match[str]) -> str:
        path = APP_DIR / match.group(1)
        if not path.exists():
            return match.group(0)
        return f"<script>\n{path.read_text(encoding='utf-8')}\n</script>"

    return pattern.sub(replace, html)


def _bundle_styles(html: str) -> str:
    pattern = re.compile(r'<link rel="stylesheet" href="([^"]+\.css)"/>')

    def replace(match: re.Match[str]) -> str:
        path = APP_DIR / match.group(1)
        if not path.exists():
            return match.group(0)
        return f"<style>\n{path.read_text(encoding='utf-8')}\n</style>"

    return pattern.sub(replace, html)


_start_local_database_if_available()
html = _inject_secrets(_inject_deploy_mode(_bundle_scripts(_bundle_styles(_load_html()))))
components.html(html, height=900, scrolling=True)
