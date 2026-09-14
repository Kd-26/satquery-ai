# Hybrid OpenAI + Modal Qwen Architecture

## Reviewed design

The production boundary is role-based, not a generic provider fallback chain:

1. OpenAI classifies semantic intent into a strict tool schema.
2. A deterministic policy router decides whether the request is conversational,
   qualitative, scientific, or segmentation-backed. An LLM cannot bypass this gate.
3. OpenAI proposes the registered execution plan and receives one validation-aware
   replanning attempt if deterministic validation rejects it.
4. Rasterio/NumPy/PyProj/Shapely perform band math, SAR statistics, alignment,
   valid-pixel checks, and physical-area calculations.
5. Qwen on Modal observes a scene or compares a pair using the workflow adapter.
   Its observations are qualitative and stored separately from numeric claims.
6. Qwen synthesizes the technical and plain-language answers from the complete
   EvidencePackage. It never calculates a measurement.
7. The deterministic verifier checks every number, unit, confidence, and identifier.
   OpenAI can add semantic failures but can never override a deterministic failure.
8. A rejected narrative is replaced by the deterministic evidence-only report.

Strict schemas and verification materially reduce failures; they do not justify an
absolute claim that an LLM system has a mathematically guaranteed zero hallucination
rate. Quantitative output remains safe because ungrounded numeric narrative is withheld.

## Credential location

Use the ignored `.env` file at the repository root:

```bash
cp .env.example .env
```

Add the OpenAI key only to `.env`:

```dotenv
OPENAI_API_KEY=your-key
OPENAI_AGENT_MODEL=gpt-4o
```

Restart the backend after changing `.env`; settings are loaded when the Python process
starts. Do not put secrets in frontend environment variables or commit `.env`.

## Modal endpoint and credentials

Set the endpoint base and the exact model name shown by the deployed Modal endpoint:

```dotenv
MODAL_VLM_API_BASE=https://coderkd26--satquery-vlm-l40s-satqueryl40sserver.us-east.modal.direct/v1
MODAL_VLM_MODEL_ID=satquery-vlm
MODAL_REQUEST_TIMEOUT_S=600
```

For a Web Function protected with `requires_proxy_auth=True`, create a Modal **Proxy
Token** and use its `wk-` ID and `ws-` secret:

```dotenv
MODAL_PROXY_TOKEN_ID=wk-...
MODAL_PROXY_TOKEN_SECRET=ws-...
```

For a Modal Endpoint that expects a combined bearer credential, leave those two values
blank and use:

```dotenv
MODAL_VLM_API_KEY=wk-....ws-...
```

Do not use Modal CLI API tokens (`ak-` / `as-`) as proxy credentials. The client does
not read `~/.modal.toml`, which prevents an accidental dependency on a developer's CLI
profile.

## Required Modal API contract

The deployed Qwen service must implement an OpenAI-compatible `POST
/chat/completions` route. If `MODAL_VLM_API_BASE` ends in `/v1`, SatQuery calls
`/v1/chat/completions`. A complete URL ending in `/chat/completions` is also accepted.

The request contains:

```json
{
  "model": "satquery-vlm",
  "messages": [
    {
      "role": "user",
      "content": [
        {"type": "text", "text": "..."},
        {"type": "image_url", "image_url": {"url": "data:image/png;base64,..."}}
      ]
    }
  ],
  "adapter_id": "lora_temporal_v1",
  "temperature": 0.2,
  "max_tokens": 2048
}
```

The response must contain either a standard `choices[0].message.content` string or a
top-level `text`/`statement` string. The endpoint must treat `adapter_id` as a
request-scoped selection from already loaded, allow-listed adapters:

```dotenv
LORA_GENERAL=lora_general_v1
LORA_OPTICAL=lora_optical_v1
LORA_TEMPORAL=lora_temporal_v1
LORA_CROSSMODAL=lora_crossmodal_v1
LORA_GROUNDING=lora_grounding_v1
```

These names must match the IDs served on Modal. Unknown adapter IDs should return a 4xx
response; the server must not silently substitute another adapter.

## Privacy and failure behavior

Image pixels are sent to Modal only when the query request has
`external_image_consent: true`. Without consent, deterministic scientific work can
continue, but Qwen visual enrichment is recorded as skipped. A purely visual query
fails clearly because it cannot run without sending its preview to the configured
visual provider.

An unavailable Qwen synthesis endpoint yields a local evidence-only answer. An
unavailable Qwen observation never produces a mock statement. Missing OpenAI
credentials cause structured intent to use the deterministic heuristic, while planning
requests that require the agent fail clearly until the OpenAI key is configured.
Modal Servers return HTTP 503 while scaling from zero; the client retries that status
with bounded exponential backoff for up to `MODAL_REQUEST_TIMEOUT_S` seconds.

## Verification

Run the offline contract suite:

```bash
pytest -q
```

After credentials and services are available, start the API and inspect role/config
health:

```bash
uvicorn backend.main:app --reload
curl http://127.0.0.1:8000/api/v1/providers/health
```

The health response is configuration health, not a billable live inference probe.
End-to-end area/segmentation requests additionally require the registered segmentation
service endpoints; Qwen is intentionally prohibited from inventing masks.
