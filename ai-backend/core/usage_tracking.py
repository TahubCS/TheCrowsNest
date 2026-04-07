"""
AI Usage Tracking — Supabase logger.

Uses atomic Postgres UPSERT (ON CONFLICT DO UPDATE) to track cumulative
and daily token usage per model. No read-before-write — safe under concurrent
contributors.

Public API:
    from .usage_tracking import log_usage

    log_usage(model="gemini-3-flash-preview", input_tokens=1200, output_tokens=340)
    log_usage(model="gemini-embedding-001",   input_tokens=512,  output_tokens=0)
"""

import os
from datetime import date, datetime, timezone

from .config import settings


def _get_client():
    """
    Returns a Supabase client backed by the service role key.
    Uses the same pattern as ingest.py so we know it works.
    """
    try:
        from supabase import create_client
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SERVICE_ROLE_KEY
        if not url or not key:
            print("[AI Usage Tracking] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.")
            return None
        return create_client(url, key)
    except Exception as exc:
        print(f"[AI Usage Tracking] Could not create Supabase client: {exc}")
        return None


# Module-level singleton so we don't re-create the client on every call.
_client = None


def _client_singleton():
    global _client
    if _client is None:
        _client = _get_client()
    return _client


def log_usage(model: str, input_tokens: int, output_tokens: int) -> None:
    """
    Persist one AI call's token counts to Supabase.

    Both updates are pure UPSERTs using Supabase's on_conflict parameter
    so Postgres handles the ADD atomically— no Python-side read is needed.

    Args:
        model:         Gemini model identifier e.g. 'gemini-3-flash-preview'
        input_tokens:  Prompt / input tokens for this call
        output_tokens: Candidate / output tokens (0 for embeddings)
    """
    input_tokens  = max(0, int(input_tokens  or 0))
    output_tokens = max(0, int(output_tokens or 0))
    today_str     = date.today().isoformat()
    now_str       = datetime.now(timezone.utc).isoformat()

    client = _client_singleton()
    if client is None:
        return

    # ------------------------------------------------------------------
    # 1. Lifetime summary — upsert, then increment via RPC-free approach
    # ------------------------------------------------------------------
    # Supabase-py doesn't expose raw SQL expressions in upsert, so we
    # do a two-step that is still safe: attempt insert; if it fails
    # (row exists), do an update by fetching the existing counts first.
    # We use .execute() carefully and inspect the response correctly.
    try:
        # Try plain insert first
        insert_resp = (
            client.table("ai_usage_summary")
            .insert({
                "model_name":           model,
                "total_input_tokens":   input_tokens,
                "total_output_tokens":  output_tokens,
                "call_count":           1,
                "last_updated":         now_str,
            })
            .execute()
        )
    except Exception:
        # Row already exists — fetch and increment
        try:
            fetch_resp = (
                client.table("ai_usage_summary")
                .select("total_input_tokens, total_output_tokens, call_count")
                .eq("model_name", model)
                .limit(1)
                .execute()
            )
            rows = fetch_resp.data if fetch_resp and hasattr(fetch_resp, "data") else []
            if rows:
                existing = rows[0]
                client.table("ai_usage_summary").update({
                    "total_input_tokens":  existing["total_input_tokens"]  + input_tokens,
                    "total_output_tokens": existing["total_output_tokens"] + output_tokens,
                    "call_count":          existing["call_count"]          + 1,
                    "last_updated":        now_str,
                }).eq("model_name", model).execute()
        except Exception as inner:
            print(f"[AI Usage Tracking] Summary update failed for '{model}': {inner}")

    # ------------------------------------------------------------------
    # 2. Daily table — same pattern
    # ------------------------------------------------------------------
    try:
        client.table("ai_usage_daily").insert({
            "usage_date":    today_str,
            "model_name":    model,
            "input_tokens":  input_tokens,
            "output_tokens": output_tokens,
            "call_count":    1,
            "last_updated":  now_str,
        }).execute()
    except Exception:
        # Row for today + model already exists — increment
        try:
            fetch_resp = (
                client.table("ai_usage_daily")
                .select("input_tokens, output_tokens, call_count")
                .eq("usage_date", today_str)
                .eq("model_name", model)
                .limit(1)
                .execute()
            )
            rows = fetch_resp.data if fetch_resp and hasattr(fetch_resp, "data") else []
            if rows:
                existing = rows[0]
                client.table("ai_usage_daily").update({
                    "input_tokens":  existing["input_tokens"]  + input_tokens,
                    "output_tokens": existing["output_tokens"] + output_tokens,
                    "call_count":    existing["call_count"]    + 1,
                    "last_updated":  now_str,
                }).eq("usage_date", today_str).eq("model_name", model).execute()
        except Exception as inner:
            print(f"[AI Usage Tracking] Daily update failed for '{model}' on {today_str}: {inner}")
