"""Static CMMC Level 2 domain and practice definitions (NIST SP 800-171 controls).

This is reference data, not runtime state -- practice statuses live in data/state.json.
"""

# (code, name, family number, count of practices)
_DOMAIN_DEFS = [
    ("AC", "Access Control", 1, 22),
    ("AT", "Awareness and Training", 2, 3),
    ("AU", "Audit and Accountability", 3, 9),
    ("CM", "Configuration Management", 4, 9),
    ("IA", "Identification and Authentication", 5, 11),
    ("IR", "Incident Response", 6, 3),
    ("MA", "Maintenance", 7, 6),
    ("MP", "Media Protection", 8, 9),
    ("PS", "Personnel Security", 9, 2),
    ("PE", "Physical Protection", 10, 6),
    ("RA", "Risk Assessment", 11, 3),
    ("CA", "Security Assessment", 12, 4),
    ("SC", "System and Communications Protection", 13, 16),
    ("SI", "System and Information Integrity", 14, 7),
]

DOMAINS = [
    {
        "code": code,
        "name": name,
        "practices": [f"3.{family}.{n}" for n in range(1, count + 1)],
    }
    for code, name, family, count in _DOMAIN_DEFS
]

ALL_PRACTICE_IDS = [pid for domain in DOMAINS for pid in domain["practices"]]

TOTAL_PRACTICES = len(ALL_PRACTICE_IDS)
