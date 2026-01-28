---
title: "there is no secure ai enclave"
pubDate: 2026-01-28
bskyPost: "https://bsky.app/profile/johncodes.com/post/3mdio5awfcc2y"
---

![There is no secure AI enclave neo](/content/posts/2026/01-28-there-is-no/there-is-no-spoon-bw.png)

> "There is no secure AI enclave, Neo."

---

Another week, another AI app everyone's talking about.
This week, it seems to be [Clawdbot](https://clawd.bot/), the _"connect with anything and do everything"_
AI agent.

Practically speaking, Clawdbot is interesting since the maintainers took the time
and energy to go and integrate it with a vast number of services on its "gateway":
iMessage, WhatsApp, Discord, Gmail, GitHub, Spotify, and much much more.
In theory, you can text it from your phone and it'll make a playlist for you,
clear your inbox, prune your calendar, and respond to those
pesky users on GitHub, all from the comfort of your preferred communication interface!

But, from a security perspective, it's an absolute nightmare and **I don't recommend
anyone actually integrate it.**

Personal privacy and security aside,
prompt injection attacks alone should give anyone pause integrating an agentic system
with broader access to the world: time and time again, [red teams have found novel ways](https://developer.nvidia.com/blog/securing-agentic-ai-how-semantic-prompt-injections-bypass-ai-guardrails/)
to break LLM based systems, escape their inner guardrails, and convince them to do things they weren't prompted to do
(maybe someday ML researchers will solve the [alignment problem](https://en.wikipedia.org/wiki/AI_alignment),
but that is not the world we live in today).

Just imagine I connect Clawdbot to my email and GitHub with the intended purpose of automagically
responding to users in `spf13/cobra`, a huge Go open source library I maintain.
I use email for notifications in GitHub and do my best to use email filtering rules
to improve the signal-to-noise ratio, although it is often overwhelming.
The Clawdbot workflow would go something like:

```
Email notification from GitHub
 --> Gmail filter puts it into "github/spf13/cobra" folder
  --> Clawdbot reads new mail in folder
   --> Clawdbot responds to user with GitHub integration as @jpmcb
```

Just imagine the productivity gains! Imagine the automation!
Imagine the problems!!

If I wanted Clawdbot to respond as "me" with a fully integrated OAuth app or PAT,
which seems to be the quick and dirty way
most of AI integrations are set up, _anyone_ on the internet with my email
has effectively gained an attack vector to the entire Go ecosystem: they could
prompt inject Clawdbot to accept and merge a malicious PR, cut a new release,
and publish it to the [over 200,000 Go packages that import it](https://github.com/spf13/cobra/network/dependents)
(including `kubernetes/kubernetes`, nearly all of Grafana's Go tools, `tailscale/tailscale`, `openfga/openfga`, etc. etc.).

All they'd have to do is send me some emails.

---

Something I've been saying recently is that this moment in AI feels _a lot_ like
the early cloud native days: we had this new thing called a "container" you could
put on a pod, run in the cloud on a cluster of computers,
and deterministically scale up. More importantly, you were assured your various containerized services had all
the dependencies they needed while being segmented away from each other.
It was a whole new way of thinking and shipping software.

As a first principle, this new container paradigm was really just about scaled Linux isolation:
once you understood that two processes on the same computer could be effectively isolated
via namespaces, cgroups, seccomp, capabilities, and SELinux,
upgrading your thinking to shipping entire clusters of services in the cloud was the next obvious step.

Demonstrating this to practitioners was dead simple: run 2 different `sleep` commands,
one after another in different namespaces, using `unshare` for isolation.

```bash
$ unshare --pid --mount --net --fork --mount-proc /bin/bash -c 'sleep 5'
```

```
USER  PID %CPU %MEM  TTY      STAT START   TIME COMMAND
root    1  0.0  0.0  pts/0    S+   12:34   0:00 /bin/bash -c sleep 5
root    2  0.0  0.0  pts/0    R+   12:34   0:00 sleep 5
```

```bash
$ unshare --pid --mount --net --fork --mount-proc /bin/bash -c 'sleep 5'
```

```
USER  PID %CPU %MEM  TTY      STAT START   TIME COMMAND
root    1  0.0  0.0  pts/0    S+   12:34   0:00 /bin/bash -c sleep 5
root    2  0.0  0.0  pts/0    R+   12:34   0:00 sleep 5
```

You'll immediately notice these two processes don't _"see"_ each other since they are in their own PID namespace,
we've forked the child process into that namespace,
and we've mounted a new `/proc` directory for processes in that namespace.
We could take this a step further and have a separate namespace for networking, users,
file systems, and much more.

But the early cloud native days also came with _a lot_ of challenges.
How do you manage the security boundaries for a container?
I have logs and metrics, where do I put them?
How do I actually get one of these magical clusters in the cloud and how do I securely access it?
There's a new version of this container orchestrator and I have to bring everything down to upgrade?
What do you mean worker nodes in my cluster aren't registering with the control plane?
Oh, _the whole internet_ is going to have access to this cluster and I need certs, networking, load balancers, oh my!

While containers and Linux isolation is not in itself a security boundary,
this gave the industry the ability and know-how to create Docker, Kubernetes, containerd,
Podman, and the innumerable services built atop these technologies.
Container isolation is how we sanely scaled compute in the modern cloud era
and gave us the first stepping stones to then build secure enclaves for sensitive containerized workloads.

And just like early cloud native days with containers,
AI and agentic systems are a whole new way of thinking and getting things done:
in plain spoken words, you can ship new features, define workflows, and connect apps.
This all comes with its own set of problems:
how do I ensure my AI agents only have access to the absolute minimum set of services
and resources to effectively get done what they need to get done?
Is it a good idea to run Claude Code in a loop in dangerous mode directly on my laptop?

What we're missing is the "next step" like we saw in cloud native:
we need the orchestrator, the isolation layer, telemetry, the networking,
and the assurances of a security boundary.
Maybe more than ever, with as powerful as these AI workflows seem to be,
the industry should focus on the impact of these new technologies
and the need for secure enclaves to run them.
Running a huge bundle of unknown 3rd party integrations on a server without isolation
and wiring up agentic AI to critical systems without infrastructure based guardrails
are both bad ideas. And if you squint hard enough, they sort of start to look like the same problem
and require similar types of solutions.

Until these guardrails exist, I'll be keeping Clawdbot far away from my inbox.
You probably should too.
