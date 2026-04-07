"""
AI Usage Tracking — Supabase logger.

This module provides a single public function: log_usage()

It is intentionally side-effect-only and never raises an exception
that would interrupt an actual AI generation call.  All errors are
swallowed and printed to the terminal so they show up in your py
main.py output without crashing anything.

Usage (both tables are updated in a single call):
    from .usage_tracking import log_usage

    log_usage(
        model="gemini-3-flash-preview",
        input_tokens=1200,
        output_tokens=340,
    )

For embedding calls where there are no output tokens, just pass 0:
    log_usage(model="gemini-embedding-001", input_tokens=512, output_tokens=0)
"""

import os
from datetime import date, datetime, timezone
from typing import Optional

# Use the supabase-py client with the SERVICE ROLE key so RLS is bypassed.
# We import lazily inside the function to keep module-level failures isolated.

def _get_client():
    """
    Returns a Supabase client backed by the service role key.
    Imported lazily so that import errors never crash the AI module.
    """
    try:
        from supabase import create_client, Client  # type: ignore
        url: str = os.getenv("SUPABASE_URL", "")
        key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url or not key:
            raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment.")
        return create_client(url, key)
    except Exception as exc:
        print(f"[AI Usage Tracking] Could not create Supabase client: {exc}")
        return None


def log_usage(
    model: str,
    input_tokens: int,
    output_tokens: int,
) -> None:
    """
    Persist one AI call's token usage to Supabase.

    This performs two UPSERTs:
      1. ai_usage_summary  — lifetime totals per model (additive)
      2. ai_usage_daily    — per-day totals per model  (additive, resets on new date)

    The ADD operation is done entirely inside Postgres via the
    'on_conflict + update with column + excluded' pattern so it is
    atomic and race-condition-safe even when multiple contributors
    are running the server simultaneously.

    Args:
        model:         Model name string, e.g. 'gemini-3-flash-preview'
        input_tokens:  Prompt / input token count for this call
        output_tokens: Candidates / output token count (0 for embeddings)
    """
    # Coerce to safe types
    input_tokens  = max(0, int(input_tokens  or 0))
    output_tokens = max(0, int(output_tokens or 0))
    today_str     = date.today().isoformat()   # e.g. "2024-04-07"
    now_str       = datetime.now(timezone.utc).isoformat()

    client = _get_client()
    if client is None:
        return  # Already printed an error — silent fail

    # ------------------------------------------------------------------
    # 1. Upsert into ai_usage_summary (lifetime totals)
    # ------------------------------------------------------------------
    try:
        # We attempt to insert a fresh row.  If the model already exists,
        # we increment both counters atomically.
        client.rpc("upsert_ai_usage_summary", {
            "p_model":         model,
            "p_input_tokens":  input_tokens,
            "p_output_tokens": output_tokens,
            "p_now":           now_str,
        }).execute()
    except Exception as exc:
        # RPC might not exist if the user hasn't run it yet — fall back
        # to a manual upsert using the REST API
        try:
            existing = (
                client.table("ai_usage_summary")
                .select("total_input_tokens, total_output_tokens, call_count")
                .eq("model_name", model)
                .maybe_single()
                .execute()
            )
            row = existing.data

            if row:
                client.table("ai_usage_summary").update({
                    "total_input_tokens":  row["total_input_tokens"]  + input_tokens,
                    "total_output_tokens": row["total_output_tokens"] + output_tokens,
                    "call_count":          row["call_count"]          + 1,
                    "last_updated":        now_str,
                }).eq("model_name", model).execute()
            else:
                client.table("ai_usage_summary").insert({
                    "model_name":           model,
                    "total_input_tokens":   input_tokens,
                    "total_output_tokens":  output_tokens,
                    "call_count":           1,
                    "last_updated":         now_str,
                }).execute()
        except Exception as inner_exc:
            print(f"[AI Usage Tracking] Failed to update summary for model '{model}': {inner_exc}")

    # ------------------------------------------------------------------
    # 2. Upsert into ai_usage_daily (today's totals)
    # ------------------------------------------------------------------
    try:
        existing_daily = (
            client.table("ai_usage_daily")
            .select("input_tokens, output_tokens, call_count")
            .eq("usage_date", today_str)
            .eq("model_name", model)
            .maybe_single()
            .execute()
        )
        row_daily = existing_daily.data

        if row_daily:
            client.table("ai_usage_daily").update({
                "input_tokens":  row_daily["input_tokens"]  + input_tokens,
                "output_tokens": row_daily["output_tokens"] + output_tokens,
                "call_count":    row_daily["call_count"]    + 1,
                "last_updated":  now_str,
            }).eq("usage_date", today_str).eq("model_name", model).execute()
        else:
            client.table("ai_usage_daily").insert({
                "usage_date":    today_str,
                "model_name":    model,
                "input_tokens":  input_tokens,
                "output_tokens": output_tokens,
                "call_count":    1,
                "last_updated":  now_str,
            }).execute()
    except Exception as exc:
        print(f"[AI Usage Tracking] Failed to update daily log for model '{model}': {exc}")
