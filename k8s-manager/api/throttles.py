from rest_framework.throttling import SimpleRateThrottle


class NamespaceCreateThrottle(SimpleRateThrottle):
    scope = "namespace_create"

    def get_cache_key(self, request, view):
        if request.method != "POST":
            return None

        return self.get_ident(request)