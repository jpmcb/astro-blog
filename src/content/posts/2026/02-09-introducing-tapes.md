---
title: "Introducing tapes: transparent AI agent telemetry"
pubDate: 2026-02-06
isDraft: true
bskyPost: ""
---

This last week, [we released `tapes`](https://github.com/papercomputeco/tapes),
a new open source agentic telemetry tool for understanding the _"what"_, _"why"_, and _"how"_
of your AI agents.

One of the biggest problems I've noticed with the current age of AI agent tools
is that they're all "opaque" and once you're done with a session, typically all
of that context is lost: all of the learned lessons, all of the decisions,
all of the errors, and all of the successes.
This is a wealth of information that you (the operator) and the agent (the executor)
can utilize in the future.

This only gets worse when you take a step back and witness the security landscape
of AI agents: it's all "spray and pray" letting your OpenClaw bot get unfettered access to your computer,
or allowing them to utilize arbitrary skills off the internet.
We need a better way to audit and understand our agents.

This is why we built `tapes`: like magnetic tapes are an extremely durable layer of storage,
`tapes` allows you to durably persist your agent sessions.

---

## Using `tapes`

We built `tapes` to be local first and it works great with the major inference API providers
like OpenAI and Anthropic. For this demo, let's utilize Ollama locally.

```bash
❯ ollama serve
```

For this demo, we'll need 2 models: `embeddinggemma` and `gemma3`.

`tapes` is essentially 3 pieces:

* A proxy service that sits between your AI agent (like Claude Code or OpenClaw)
  and the inference provider API (like `api.openai.com` or Ollama's `localhost:11434/v1/chat`).
  This is where sessions and telemetry are captured, persisted, and embedded.
* An API server for interfacing with and querying the system.
* A CLI client that you can use to manage and use the system: this is how you'll
  get things started, see telemetry data, and manage the system.

Let's start the `tapes` services:

```bash
❯ tapes serve
```

By default, this starts the proxy on `:8080`, the API on `:8081`,
targets Ollama as the proxy upstream, uses a SQLite database for
session and vector storage, and uses Ollama for embeddings.
There are lots of ways to configuration and bootstrap `tapes`.
So if at any point you want to see the breadth and depth of configuration options,
just use `--help`!

After starting the services, a local `./data.db` will be crated: this is the
SQLite database of sessions and embeddings.

Next, let's launch a chat session with `tapes` (useful for seeing the system
work end to end!)

```bash
❯ tapes chat
```
```
Starting new conversation (no checkout)

Type your message and press Enter. Type /exit or Ctrl+D to quit.

you> Hello world!
```

This, albeit very arbitrary user interface, gives you an easy glimpse into how `tapes` works
as it automatically targets the running proxy in `:8080` and utilizes an Ollama client.

---

## Search and content addressing

After chatting with the model for abit, we can search previous sessions:

```bash
❯ tapes search "Where is new york?"
```

Utilizing vector search, we can find the most relevant content based on the semantic
meaning and the embeddings from the `embeddingggemma` model.

```bash
❯ tapes search "Where is new york?"
```
```
Search Results for: "Where is new york?"
============================================================

[1] Score: 0.9028
    Hash: 51b2ee82265555ab081775696f2d6036a8e5d0b6ce40e03a0bea0e0a8eee08ec
    Role: user
    Preview: Where is New York?

    Session (2 turns):
    >>> [user] Where is New York? - 51b2ee82265555ab081775696f2d6036a8e5d0b6ce40e03a0bea0e0a8eee08ec
    |-- [assistant] Okay, let's break down where New York is! New York is a state located in the **northeastern United States**. Here's a more detailed breakdown: .....
```

The most relevant result is a session I just had where I asked the agent about New york
(again, arbitrary UI, but we see the most relevant data with the `>>>`)!

You'll also notice something interesting here: a hash for the message `Where is New York?`
This is a content addressable hash that maps directly to the model, the content, and
the previous hash in the conversation. This is very similar to how `git` works where each commit has its own hash.
Agentic conversation turns and sequences aren't too dissimilar from `git` commits and branches
in this way - they're statically addressable and targetable based on the hash sum
_of their content_.

This means that you can do context check-pointing and retries with `tapes`.
Let's check out this hash:

```
❯ tapes checkout 51b2ee82265555ab081775696f2d6036a8e5d0b6ce40e03a0bea0e0a8eee08ec
```
```
Checked out 51b2ee82265555ab... (1 messages)
  [user] Where is New York?
```

This populates a `~/.tapes/checkout.json` for the global state (if you want per-project checkouts,
just run `tapes init` in your project directory).
Now, when we start a `tapes chat` session, we'll begin with the context from the
context-checkpoint where we did a `checkout`:

```bash
❯ tapes chat
```
```
Resuming from checkout 51b2ee82265555ab... (1 messages)

Type your message and press Enter. Type /exit or Ctrl+D to quit.

you> What was my last message?
assistant> Okay, let’s tackle those questions:

**Where is New York?**
```

---

## TUI operations

We recently brought in a terminal user interface (TUI) in order to more expressively
explore your sessions and telemetry with `tapes`:

![TUI for tapes](/content/posts/2026/02-09-introducing-tapes/tapes-tui.png)

Run:

```
tapes deck
```

to boot up the TUI and start seeing your session data in real time!

---

## Looking to the future:
