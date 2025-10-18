---
title: 'building cross platform Go with "just"'
pubDate: 2024-12-05
isDraft: true
---

Often, when building Go based CLI tools, you want to target a cross-compatible
architecture. The intent should be to ship to any possible end user architecture
which usually means x86 and arm.

The following is a workflow I've adopted using `just`, a Makefile like tool
for shell recipes: it's easily _"grok-able"_ and makes onboarding to a project easy.

First, let's simply build the binary for the local developer's workstation:

```justfile
# Builds the go binary into the git ignored ./build/ dir for the local architecture
build:
  #!/usr/bin/env sh
  echo "Building for local arch"

  export VERSION="${RELEASE_TAG_VERSION:-dev}"
  export DATETIME=$(date -u +"%Y-%m-%d-%H:%M:%S")
  export SHA=$(git rev-parse HEAD)

  go build \
    -ldflags="-s -w \
    -X 'github.com/open-sauced/pizza-cli/pkg/utils.Version=${VERSION}' \
    -X 'github.com/open-sauced/pizza-cli/pkg/utils.Sha=${SHA}' \
    -X 'github.com/open-sauced/pizza-cli/pkg/utils.Datetime=${DATETIME}' \
    -X 'github.com/open-sauced/pizza-cli/pkg/utils.writeOnlyPublicPosthogKey=${POSTHOG_PUBLIC_API_KEY}'" \
    -o build/pizza
```

```justfile
build goos goarch:
  #!/usr/bin/env bash
  echo "Building target: {{goos}} {{goarch}}"

  export CGO_ENABLED=0
  export GOOS="{{goos}}"
  export GOARCH="{{goarch}}"

  go build -o build/example-cli-${GOOS}-${GOARCH}

bootstrap-docker-buildx:
  #!/usr/bin/env sh
  #
  # TODO - create one only if it doesn't exist yet
  docker buildx create

# Builds the Docker container and tags it as "dev"
build-containers:
  #!/usr/bin/env sh

  echo "Building container"

  docker buildx build \
    --platform=darwin/amd64,darwin/arm64,linux/amd64,linux/arm64 \
    -t example-cli:dev . \
    --load

build-all:
  #!/usr/bin/env bash
  just build darwin amd64
  just build darwin arm64
  just build linux amd64
  just build linux arm64

```
