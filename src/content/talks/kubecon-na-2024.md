---
year: 2024
event: "Kubecon NA - Salt Lake City"
title: "Building Massive-Scale Generative AI Services With Kubernetes and Open Source"
youtubeVideoId: "wYzsPNfMF7A"
---

At OpenSauced, we power over 40,000 generative AI inferences
every day, all through our in-house platform ontop of Kubernetes.

The cost of
doing this kind of at-scale AI inference with a third party provider API
would be astronomic. Thankfully, using Kubernetes, the public cloud, and
open-source technologies, we've been able to scale with relatively low
costs and a lean stack.

In this talk, I walk through the journey of
building a production grade generative AI system using open source technologies,
open large language models, and Kubernetes. We also explore why OpenSauced chose
to build ontop of Kubernetes for our AI workloads over using a third party
provider, and how we're running and managing our AI/ML clusters today.
Additionally, I dive into the techniques we used to groom our
Retrieval-Augmented-Generation pipelines for efficiency ontop of Kubernetes
and other practical tips for deploying your own AI services at-scale
