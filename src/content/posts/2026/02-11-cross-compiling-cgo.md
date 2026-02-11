---
title: "Cross compiling CGO with Dagger and Zig"
pubDate: 2026-02-11
---

Anyone who's built a substantial Go project that incorporates C code (like `sqlite`)
knows that cross compiling with `CGO` can be very painful.
One of Go's best native features is that you can use your system's cross compiler (like XCode's bundled gcc)
to easily build binaries for whatever system is supported by `go tool dist list` (like `linux/amd64` or `darwin/arm64`).
Typically all you need to do is set the `GOOS` and `GOARCH` env vars during `go build`.

For the purposes of this experiment, let's build a simple Go program that utilizes `net/http`.
This is effective since native builds of `net/http` use Go's internal DNS resolver
while cross-compiled builds utilize the system's library resolver (like `resolv` on macOS):

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    resp, err := http.Get("https://example.com")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    defer resp.Body.Close()
    fmt.Println("Status:", resp.Status)
}
```

```bash
# Compile for aarch64 Darwin (i.e., modern M series Macs)
$ GOOS=darwin GOARCH=arm64 go build -o build main.go
```

```bash
# Inspect the executable's properties
$ file build
```

```
build: Mach-O 64-bit executable arm64
```

```bash
# next, compile for x86 Linux
$ GOOS=linux GOARCH=amd64 go build -o build main.go
```

```bash
$ file build
```

```
build: ELF 64-bit LSB executable, x86-64, version 1 (SYSV), dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2, for GNU/Linux 2.0.0, Go BuildID=UrrhgNXQ0bW0PmB8HDVI/9G607QN6lMeRuNzuDQT4/BvfLE_OUqa-iQ7Hnfz3_/oRw6-Uruwc9MZyDADl-P
```

But as soon as you need to introduce CGO libraries, like `sqlite`
or `sqlite-vec`, the system you're cross compiling with needs to be correctly
bootstrapped with the right libraries, headers, and cross compilers.
Let's introduce `sqlite-vec`,
[a great library for enabling sqlite to support vector storage](https://github.com/asg017/sqlite-vec):

```diff
    "net/http"
+   sqlite_vec "github.com/asg017/sqlite-vec-go-bindings/cgo"
+   _ "github.com/mattn/go-sqlite3"
)

func main() {
+   sqlite_vec.Auto()
```

Now, when cross compiling, depending on your system, this can introduce all sorts of problems:

```
gcc: error: unrecognized command-line option '-arch'
cannot find -lsqlite3
undefined reference to 'sqlite3'
```

On Linux, we'll need to bring in `libsqlite3-dev` for the sqlite libraries as well as
gcc cross architecture toolchains:
`gcc-aarch64-linux-gnu` and `libc6-dev-arm64-cross`.
This lets us target arm architectures using the right cross C compiler with `CGO_ENABLED` turned on:

```bash
# Cross compile from a x86 Linux machine to aarch64
CGO_ENABLED=1 \
GOOS=linux \
GOARCH=arm64 \
CC=aarch64-linux-gnu-gcc \
go build -o build main.go
```

Outside of the cross compiling headache that is managing different gcc toolchains,
cross compiling this from Linux to macOS is an entirely different set of problems!
Now you not only need to manage different gcc toolchains, you need to also consider
different system libraries that `darwin` targets expect.
With CGO now a requirement, the Go toolchain will utilize a `CC` compiler to look for
the necessary system libraries and object files, many of which are not available
on Linux from the XCode or Apple toolchain.

In short, this makes building a CI/CD pipeline that can cross compile and deliver
CGO binaries a huge pain: you suddenly need to manage different machines
with different targets and different libraries on bespoke C toolchains. Yikes!

[**This is the exact issue I faced shipping `tapes`**,](https://github.com/papercomputeco/tapes)
a new [open source project for agentic telemetry and operations](../02-09-introducing-tapes).
Thankfully, with the power of Dagger and Zig, we can accomplish this elegantly and efficiently!

First, let's look at [Zig's cross compiling capabilities](https://ziglang.org/documentation/0.15.2/#Using--target-and--cflags):
if you didn't know, Zig has a built-in C and C++ compiler that natively cross compiles
and can be utilized as the `CC` and `CXX` compiler in Go!

```bash
CGO_ENABLED=1 \
GOOS=linux \
GOARCH=arm64 \
CC="zig cc -target aarch64-linux-gnu" \
CXX="zig c++ -target aarch64-linux-gnu" \
go build -o build main.go
```

```bash
$ file build
```

```
build: ELF 64-bit LSB executable, ARM aarch64, version 1 (SYSV), dynamically linked, interpreter /lib/ld-linux-aarch64.so.1, BuildID[sha1]=91ac90bd53405d38a054dcce9e6f5bb76749a074
```

This is great since it allows us to utilize a _**SINGLE**_ C and C++ toolchain without having
to manage or install multiple cross compilers on Linux.

Now, let's introduce [Dagger](https://dagger.io/), a container based build, test, and deploy CI/CD tool:
this allows us to have a single interface for all of our operations when developing `tapes`.
We have a reproducible container environment that can run locally and in CI for building
and releasing these artifacts.
It also allows us to write all of our integration and delivery logic as Go code (and not all yaml)
in our pipelines.

Let's look at [our `tapes` Dagger build module](https://github.com/papercomputeco/tapes/blob/main/.dagger/build.go) in depth.

First, let's set the Zig version we'll be using.
Since Zig is still actively being developed, I anticipate some thrashing
when we upgrade. Keeping this hard coded for now stabilizes the `CC` and `CXX`
side of the cross compiling:

```go
const (
    zigVersion string = "0.15.2"
)
```

We can also define the shape of our build targets (with the target OS, target arch,
target `CC` `CXX` compilers, compiler flags to pass through, and linker flags to pass through):

```go
type buildTarget struct {
    goos       string
    goarch     string
    cc         string
    cxx        string
    cgoFlags   string
    cgoLdFlags string
}
```

From within the Dagger container, before we can get the Zig toolchain,
we'll need to inspect the architecture of the machine Dagger itself is running on.
This is peeling back the onion on Dagger _a bit_, but at least ensures we _always_
get the right Zig toolchain for the machine we're running `dagger call` on:

```go
func zigArch() string {
    switch runtime.GOARCH {
    case "arm64":
        return "aarch64"
    case "amd64":
        return "x86_64"
    default:
        return runtime.GOARCH
    }
}
```

Then, in our Linux builder function, we can define the build targets we want,
the actual build container (along with the packages and environment),
and a short exec script for getting the Zig toolchain:

```go
cgoFlags := "-I/opt/sqlite -fno-sanitize=all"
cgoLdFlags := "-fno-sanitize=all"
targets := []buildTarget{
    {"linux", "amd64", "zig cc -target x86_64-linux-gnu", "zig c++ -target x86_64-linux-gnu", cgoFlags, cgoLdFlags},
    {"linux", "arm64", "zig cc -target aarch64-linux-gnu", "zig c++ -target aarch64-linux-gnu", cgoFlags, cgoLdFlags},
}

// Build zig download URL based on host architecture.
// This is cached by Dagger so should only need to download on first
// run locally.
zigArch := zigArch()
zigDownloadURL := fmt.Sprintf("https://ziglang.org/download/%s/zig-%s-linux-%s.tar.xz", zigVersion, zigArch, zigVersion)
zigDir := fmt.Sprintf("zig-%s-linux-%s", zigArch, zigVersion)

// Bootstrap build container.
// The base "goContainer" has libsqlite3-dev
// and other direct Go dependencies.
// Notice that we move the sqlite headers over to /opt/sqlite
// which is included in the "-I/opt/sqlite" C compiler options to Zig:
// this is a small optimization to give Zig the headers
// needed for sqlite-vec.
golang := t.goContainer().
    WithExec([]string{"apt-get", "install", "-y", "xz-utils"}).
    WithExec([]string{"mkdir", "-p", "/opt/sqlite"}).
    WithExec([]string{"cp", "/usr/include/sqlite3.h", "/opt/sqlite/"}).
    WithExec([]string{"cp", "/usr/include/sqlite3ext.h", "/opt/sqlite/"}).
    WithExec([]string{"sh", "-c", fmt.Sprintf("curl -L %s | tar -xJ -C /usr/local", zigDownloadURL)}).
    WithEnvVariable("PATH", fmt.Sprintf("/usr/local/%s:$PATH", zigDir), dagger.ContainerWithEnvVariableOpts{Expand: true})
```

Then, further in the build, we can iterate through `targets`
to build for each one:

```go
for _, target := range targets {
    path := fmt.Sprintf("%s/%s/", target.goos, target.goarch)

    build := golang.
        WithEnvVariable("CGO_ENABLED", "1").
        WithEnvVariable("GOEXPERIMENT", "jsonv2").
        WithEnvVariable("GOOS", target.goos).
        WithEnvVariable("GOARCH", target.goarch).
        WithEnvVariable("CC", target.cc).
        WithEnvVariable("CXX", target.cxx).
        WithEnvVariable("CGO_CFLAGS", target.cgoFlags).
        WithEnvVariable("CGO_LDFLAGS", target.cgoLdFlags).

        // Note: the LD flags are how we inject build time variables
        // like "version" and "buildtime"
        WithExec([]string{"go", "build", "-ldflags", ldflags, "-o", path, "./cli/tapes"})

    outputs = outputs.WithDirectory(path, build.Directory(path))
}

return outputs
```

We put this all together in a `build-release` Dagger target that can be called
in the module:

```go

// BuildRelease compiles versioned release binaries with embedded version info
func (t *Tapes) BuildRelease(
    ctx context.Context,
) *dagger.Directory {
    // Setup container, Zig toolchain, LD flags, etc. etc.
}
```

Notice that we return a `*dagger.Directory`: this is the directory of the build artifacts,
i.e., the `outputs` that we add to during the build.

The directory can then be exported using a chain to `export --path ...` during a call to the `build-release`
function in the module.
We handle this in `tapes` with a flat makefile and a `build` target.
Notice that our call to the wrapper `build-release` then chains into
`export` to dump the outputs from our build to the local `./build` directory.
This is essentially how we exfiltrate these out of the container.

```makefile
.PHONY: build
build:
    dagger call build-release \
        --version ${VERSION} \
        --commit ${COMMIT} \
    export \
        --path ./build
```

You'll notice that we don't have `darwin` (i.e., macOS targets) as a target in the Linux
builder: as I mentioned before, there's a lot of pain trying to cross compile
to macOS from a Linux host since Apple doesn't distribute the Xcode or macOS libs.
Attempting to cross compile from Linux to a `darwin` target with Zig results in errors like:

```
# github.com/papercomputeco/tapes/cli/tapes
/usr/local/go/pkg/tool/linux_arm64/link: running zig failed: exit status 1
/usr/local/zig-aarch64-linux-0.16.0-dev.2490+fce7878a9/zig cc -target x86_64-macos-none -arch x86_64 -m64 -Wl,-S -Wl,-x -o $WORK
exe/a.out /tmp/go-link-2064952865/go.o /tmp/go-link-2064952865/000000.o /tmp/go-link-2064952865/000001.o /tmp/go-link-2064952865
2.o /tmp/go-link-2064952865/000003.o /tmp/go-link-2064952865/000004.o /tmp/go-link-2064952865/000005.o /tmp/go-link-2064952865/0
o /tmp/go-link-2064952865/000007.o /tmp/go-link-2064952865/000008.o /tmp/go-link-2064952865/000009.o /tmp/go-link-2064952865/000
/tmp/go-link-2064952865/000011.o /tmp/go-link-2064952865/000012.o /tmp/go-link-2064952865/000013.o /tmp/go-link-2064952865/00001
mp/go-link-2064952865/000015.o /tmp/go-link-2064952865/000016.o /tmp/go-link-2064952865/000017.o /tmp/go-link-2064952865/000018.
/go-link-2064952865/000019.o /tmp/go-link-2064952865/000020.o /tmp/go-link-2064952865/000021.o /tmp/go-link-2064952865/000022.o
o-link-2064952865/000023.o /tmp/go-link-2064952865/000024.o /tmp/go-link-2064952865/000025.o -lresolv -fno-sanitize=all -fno-san
all -lpthread -fno-sanitize=all -framework CoreFoundation -framework Security
error: unable to find dynamic system library 'resolv' using strategy 'paths_first'. searched paths: none
! exit code: 1
```

where the `resolv` macOS library can't be found - again, remember that cross compiling and using CGO
with `net/http` forces the system DNS resolver libraries
which aren't available through Zig's toolchain or in the Linux based build container this is run in.

Thankfully, there are workarounds! We utilize `osxcross`, a Linux and BSD
macOS cross-toolchain that provides these bundled in.
In a different build container in Dagger, our target then becomes:

```go
targets := []buildTarget{
    {"darwin", "amd64", "o64-clang", "o64-clang++", cgoFlags, cgoLdFlags},
    {"darwin", "arm64", "oa64-clang", "oa64-clang++", cgoFlags, cgoLdFlags},
}
```

where `o64-clang` and `o64-clang++` are the `CC` and `CXX` compilers provided by `osxcross`.
This isn't the _most_ practical and eventually we'll probably align on running this
part of the build & release pipeline natively on macOS.
Maybe some day Apple will align with the Linux ecosystem and make their dev SDK available!

There's much much more to this story, and you can [inspect the `tapes` Dagger modules and pipelines](https://github.com/papercomputeco/tapes/tree/main/.dagger)
for yourself: it's all open source!

To recap: cross compiling a CGO project like `tapes`,
which requires `sqlite3` and `sqlite-vec`,
would mean managing separate `CC` and `CXX` toolchains per target architecture on a matrix of machines,
wrangling platform-specific libraries and headers, and stitching it all together with very brittle CI yamls.

Instead, with Zig and Dagger:

- Zig gives us a single, drop-in `CC`/`CXX` compiler that targets any architecture
  without installing separate cross-compilation toolchains.
- Dagger gives us a reproducible, cached, container-based build environment that runs
  locally and in CI, all written in Go (not a bunch of yamls).
- `osxcross` as a temporary pragmatic workaround for `darwin` macOS targets.

The result is a build pipeline that's portable and reproducible that lets us
quickly accelerate development efforts (in CI and locally)!
