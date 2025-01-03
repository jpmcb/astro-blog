---
year: 2023
event: "Kubecon NA - Chicago"
title: "Hacking the Kubernetes Secure Software Supply-chain with .zip Domains"
youtubeVideoId: "57k-KwOsj9c"
---

The ".zip" top level domain is an inherently dangerous new route for malicious
actors to use and exploit. In mid 2023, John was able to acquire the
kubernetes.zip domain:
https://twitter.com/johncodezzz/status/1657888452149669888

And through some experimenting and iteration, we were able to serve modified
Kubernetes source code through that domain that APPEARS to be from the real
Kubernetes GitHub org (where the real source code is available as a zip file).

The real domain for downloading the actual upstream source zipfile is:
`https://github.com/kubernetes/kubernetes/archive/refs/heads/master.zip`

And the malicious one is:
`https://github.com/kubernetes/kubernetes/archive/refs/heads/@kubernetes.zip`

An unsuspecting party could easily download this code, unpack the tarball, and
build the bespoke source code with potentially compromised malicious bits.

This talk will include a demo of this exploit, a thorough description of how
socially engineered domains fit into the secure software supply-chain, and a
call to action for how organizations that consume Kubernetes source code can
strengthen their security posture towards these kinds of supply chain attacks
(including through verifying signed Kubernetes artifacts, hardened Linux node
environments, etc). 
