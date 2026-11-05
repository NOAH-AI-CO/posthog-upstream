from posthog.settings.utils import get_from_env

# Upstream BeOne BizBackend (registration dictionaries / hospital typeahead).
# Proxied via posthog.api.beone_registration so the browser avoids CORS.
BEONE_API_BASE: str = get_from_env("BEONE_API_BASE", "https://beonemed.ruosheng.bio").rstrip("/")
BEONE_API_TIMEOUT_SECONDS: float = float(get_from_env("BEONE_API_TIMEOUT_SECONDS", "10"))
