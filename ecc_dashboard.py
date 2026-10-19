#!/usr/bin/env python3
"""Backward-compatible alias for the renamed PowerUser dashboard."""
from poweruser_dashboard import main

if __name__ == "__main__":
    raise SystemExit(main())
