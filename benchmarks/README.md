# Benchmarks

This directory will contain reproducible task suites for comparing provider and
route quality, latency, and cost. Suites should pin inputs and configuration,
record the environment, use deterministic checks where possible, and preserve
unknown metrics as unknown.

Generated results and temporary benchmark artifacts belong in ignored `results/`
and `tmp/` directories, not in source control by default.
