#!/usr/bin/env python3
from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlparse


@dataclass(frozen=True)
class DatabaseTarget:
    connection_string: str
    role: str
    host: str
    database: str
    source: str


def _parse_database_target(connection_string: str, *, role: str, source: str) -> DatabaseTarget:
    parsed = urlparse(connection_string)
    host = parsed.hostname or "local_socket"
    database = parsed.path.lstrip("/") or os.getenv("PGDATABASE") or "postgres"
    return DatabaseTarget(
        connection_string=connection_string,
        role=role,
        host=host,
        database=database,
        source=source,
    )


def resolve_database_target(
    *,
    cli_database_url: str | None = None,
    warehouse_env_var: str = "WAREHOUSE_DATABASE_URL",
    fallback_env_var: str = "DATABASE_URL",
    required: bool = True,
    role: str = "warehouse",
) -> DatabaseTarget | None:
    if cli_database_url:
        return _parse_database_target(cli_database_url, role=role, source="cli")

    warehouse_url = os.getenv(warehouse_env_var)
    if warehouse_url:
        return _parse_database_target(warehouse_url, role=role, source=warehouse_env_var)

    fallback_url = os.getenv(fallback_env_var)
    if fallback_url:
        fallback_role = "fallback_database_url" if role == "warehouse" else role
        return _parse_database_target(fallback_url, role=fallback_role, source=fallback_env_var)

    if required:
        raise SystemExit(
            f"A database URL is required. Set {warehouse_env_var}, pass --database-url, "
            f"or set {fallback_env_var} as a compatibility fallback."
        )
    return None


def log_database_target(prefix: str, target: DatabaseTarget) -> None:
    print(
        f"{prefix} role={target.role} host={target.host} db={target.database} source={target.source}",
        flush=True,
    )
