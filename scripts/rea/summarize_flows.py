"""
Resume um arquivo de fluxos do mitmproxy (.mitm) em um JSON enxuto.

Uso:
  REA_FLOWS_OUT=docs/auditorias/cor-rio/fluxos.json \
    mitmdump -nr captura.mitm -q -s scripts/rea/summarize_flows.py

O script só lê metadados (host, caminho, status, content-type, tamanho).
Não baixa nem decodifica mídia: a captura original já contém apenas o que
trafegou no dispositivo do próprio usuário.
"""

from __future__ import annotations

import json
import os
from collections import Counter

from mitmproxy import ctx, http

MEDIA_HINTS = (
    ".m3u8",
    ".mpd",
    ".mp4",
    ".m4s",
    ".ts",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".mjpg",
    ".mjpeg",
    "/snapshot",
    "/stream",
    "/camera",
    "/cameras",
    "/video",
)

records: dict[str, dict] = {}
media_types: Counter[str] = Counter()


class Summarizer:
    def response(self, flow: http.HTTPFlow) -> None:
        request = flow.request
        response = flow.response
        contents = getattr(response, "content", None) or b""
        content_type = (response.headers.get("content-type") or "").split(";")[0]
        media_types[content_type or "(sem content-type)"] += 1

        path = request.path.split("?")[0]
        key = f"{request.host}{path}"
        if key in records:
            records[key]["hits"] += 1
            return

        records[key] = {
            "url": f"{request.scheme}://{request.host}{request.path}",
            "method": request.method,
            "status": response.status_code,
            "content_type": content_type or None,
            "bytes_in_flow": len(contents),
            "hits": 1,
            "media_hint": any(hint in path.lower() for hint in MEDIA_HINTS)
            or (content_type.startswith(("image/", "video/", "audio/")))
            or content_type in ("application/vnd.apple.mpegurl", "application/dash+xml"),
        }

    def done(self) -> None:
        output_path = os.environ.get("REA_FLOWS_OUT")
        ordered = sorted(
            records.values(),
            key=lambda record: (not record["media_hint"], record["url"]),
        )
        summary = {
            "total_requests": sum(record["hits"] for record in records.values()),
            "unique_endpoints": len(ordered),
            "media_like": sum(1 for record in ordered if record["media_hint"]),
            "content_types": media_types.most_common(),
            "endpoints": ordered,
        }
        text = json.dumps(summary, indent=2, ensure_ascii=False)
        if output_path:
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as handle:
                handle.write(text)
            ctx.log.info(f"Resumo salvo em {output_path}")
        else:
            print(text)


addons = [Summarizer()]
