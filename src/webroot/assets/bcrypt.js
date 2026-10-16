/**
 * bcrypt.js —— 纯 JavaScript 的 bcrypt 哈希实现（WebUI 本地计算，不依赖任何外部工具）
 *
 * AdGuardHome 在 AdGuardHome.yaml 的 users 段里用 bcrypt 保存密码，例如：
 *
 *     users:
 *       - name: root
 *         password: $2b$12$D3zeMIBFfzcQTqGqB.k7GOkMvqx1jgsrdiRCn2kwOHl.kNmmPfMom
 *
 * 本文件只实现「由明文生成哈希」这一个方向，供模块 WebUI 离线使用，因此设备上
 * 无需 htpasswd / openssl / python / perl 等外部工具。
 *
 * 结果与 golang.org/x/crypto/bcrypt（AdGuardHome 使用的实现，即登录时调用的
 * bcrypt.CompareHashAndPassword）以及 Openwall 的 crypt_blowfish 完全一致：
 *
 *   · 明文先按 UTF-8 编码，并在末尾补一个 NUL 字节（历史行为，必须保留）；
 *   · 24 字节固定串 "OrpheanBeholderScryDoubt" 分 3 块、每块加密 64 次；
 *   · 只取前 23 字节，且使用 bcrypt 私有的 base64 字母表 "./A-Za-z0-9"；
 *   · 明文超过 72 字节会被拒绝（超出部分不参与运算，与 Go 行为保持一致）。
 *
 * 参考资料：Niels Provos, David Mazières, "A Future-Adaptable Password Scheme",
 * USENIX 1999；OpenBSD 的 bcrypt.c。
 */
(function () {
    'use strict';

    /** bcrypt 盐长度（字节） */
    const SALT_LEN = 16;
    /** bcrypt 实际输出的哈希长度（字节） */
    const HASH_LEN = 23;
    /** 明文长度上限（字节），与 Go 的 bcrypt.GenerateFromPassword 一致 */
    const MAX_PASSWORD_BYTES = 72;
    /** 允许生成 / 解析的 cost（对数轮数）范围，bcrypt 本身允许 4–31 */
    const MIN_COST = 4;
    const MAX_COST = 16;
    /** WebUI 的默认 cost，与模块自带 AdGuardHome.yaml 中的取值保持一致 */
    const DEFAULT_COST = 12;

    /** bcrypt 私有的 base64 字母表（注意不是标准 base64） */
    const B64 = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    /** 反查表：字符码 -> 字母表下标 */
    const B64_INDEX = (function () {
        const idx = new Int8Array(128).fill(-1);
        for (let i = 0; i < B64.length; i++) idx[B64.charCodeAt(i)] = i;
        return idx;
    })();

    /** 常量串 "OrpheanBeholderScryDoubt" 的 6 个 32 位字 */
    const MAGIC = [0x4f727068, 0x65616e42, 0x65686f6c, 0x64657253, 0x63727944, 0x6f756274];

    const P_LEN = 18;
    const S_LEN = 1024;

    /**
     * Blowfish 初始化常量 = pi 小数部分的前 1042 个 32 位字
     * （依次为 18 个 P 值 + 4×256 个 S 值，共 8336 个十六进制字符）。
     * 该表属于算法规范的公共常量，与 Go/OpenSSL 等实现中的取值完全相同。
     */
    const PI_HEX =
        '243f6a8885a308d313198a2e03707344a4093822299f31d0082efa98ec4e6c89452821e638d01377be5466cf34e90c6cc0ac29b7c97c50dd3f84d5b5b5470917' +
        '9216d5d98979fb1bd1310ba698dfb5ac2ffd72dbd01adfb7b8e1afed6a267e96ba7c9045f12c7f9924a19947b3916cf70801f2e2858efc16636920d871574e69' +
        'a458fea3f4933d7e0d95748f728eb658718bcd5882154aee7b54a41dc25a59b59c30d5392af26013c5d1b023286085f0ca417918b8db38ef8e79dcb0603a180e' +
        '6c9e0e8bb01e8a3ed71577c1bd314b2778af2fda55605c60e65525f3aa55ab945748986263e8144055ca396a2aab10b6b4cc5c341141e8cea15486af7c72e993' +
        'b3ee1411636fbc2a2ba9c55d741831f6ce5c3e169b87931eafd6ba336c24cf5c7a325381289586773b8f48986b4bb9afc4bfe81b6628219361d809ccfb21a991' +
        '487cac605dec8032ef845d5de98575b1dc262302eb651b8823893e81d396acc50f6d6ff383f442392e0b4482a484200469c8f04a9e1f9b5e21c66842f6e96c9a' +
        '670c9c61abd388f06a51a0d2d8542f68960fa728ab5133a36eef0b6c137a3be4ba3bf0507efb2a98a1f1651d39af017666ca593e82430e888cee8619456f9fb4' +
        '7d84a5c33b8b5ebee06f75d885c12073401a449f56c16aa64ed3aa62363f77061bfedf72429b023d37d0d724d00a1248db0fead349f1c09b075372c980991b7b' +
        '25d479d8f6e8def7e3fe501ab6794c3b976ce0bd04c006bac1a94fb6409f60c45e5c9ec2196a246368fb6faf3e6c53b51339b2eb3b52ec6f6dfc511f9b30952c' +
        'cc814544af5ebd09bee3d004de334afd660f2807192e4bb3c0cba85745c8740fd20b5f39b9d3fbdb5579c0bd1a60320ad6a100c6402c7279679f25fefb1fa3cc' +
        '8ea5e9f8db3222f83c7516dffd616b152f501ec8ad0552ab323db5fafd23876053317b483e00df829e5c57bbca6f8ca01a87562edf1769dbd542a8f6287effc3' +
        'ac6732c68c4f5573695b27b0bbca58c8e1ffa35db8f011a010fa3d98fd2183b84afcb56c2dd1d35b9a53e479b6f84565d28e49bc4bfb9790e1ddf2daa4cb7e33' +
        '62fb1341cee4c6e8ef20cada36774c01d07e9efe2bf11fb495dbda4dae909198eaad8e716b93d5a0d08ed1d0afc725e08e3c5b2f8e7594b78ff6e2fbf2122b64' +
        '8888b812900df01c4fad5ea0688fc31cd1cff191b3a8c1ad2f2f2218be0e1777ea752dfe8b021fa1e5a0cc0fb56f74e818acf3d6ce89e299b4a84fe0fd13e0b7' +
        '7cc43b81d2ada8d9165fa2668095770593cc7314211a1477e6ad206577b5fa86c75442f5fb9d35cfebcdaf0c7b3e89a0d6411bd3ae1e7e4900250e2d2071b35e' +
        '226800bb57b8e0af2464369bf009b91e5563911d59dfa6aa78c14389d95a537f207d5ba202e5b9c5832603766295cfa911c819684e734a41b3472dca7b14a94a' +
        '1b5100529a532915d60f573fbc9bc6e42b60a47681e6740008ba6fb5571be91ff296ec6b2a0dd915b6636521e7b9f9b6ff34052ec585566453b02d5da99f8fa1' +
        '08ba47996e85076a4b7a70e9b5b32944db75092ec4192623ad6ea6b049a7df7d9cee60b88fedb266ecaa8c71699a17ff5664526cc2b19ee1193602a575094c29' +
        'a0591340e4183a3e3f54989a5b429d656b8fe4d699f73fd6a1d29c07efe830f54d2d38e6f0255dc14cdd20868470eb266382e9c6021ecc5e09686b3f3ebaefc9' +
        '3c9718146b6a70a1687f358452a0e286b79c5305aa5007373e07841c7fdeae5c8e7d44ec5716f2b8b03ada37f0500c0df01c1f040200b3ffae0cf51a3cb574b2' +
        '25837a58dc0921bdd19113f97ca92ff69432477322f547013ae5e58137c2dadcc8b576349af3dda7a94461460fd0030eecc8c73ea4751e41e238cd993bea0e2f' +
        '3280bba1183eb3314e548b384f6db9086f420d03f60a04bf2cb8129024977c795679b072bcaf89afde9a771fd9930810b38bae12dccf3f2e5512721f2e6b7124' +
        '501adde69f84cd877a5847187408da17bc9f9abce94b7d8cec7aec3adb851dfa63094366c464c3d2ef1c18473215d908dd433b3724c2ba1612a14d432a65c451' +
        '50940002133ae4dd71dff89e10314e5581ac77d65f11199b043556f1d7a3c76b3c11183b5924a509f28fe6ed97f1fbfa9ebabf2c1e153c6e86e34570eae96fb1' +
        '860e5e0a5a3e2ab3771fe71c4e3d06fa2965dcb999e71d0f803e89d65266c8252e4cc9789c10b36ac6150eba94e2ea78a5fc3c531e0a2df4f2f74ea7361d2b3d' +
        '1939260f19c279605223a708f71312b6ebadfe6eeac31f66e3bc4595a67bc883b17f37d1018cff28c332ddefbe6c5aa56558218568ab9802eecea50fdb2f953b' +
        '2aef7dad5b6e2f841521b62829076170ecdd4775619f151013cca830eb61bd960334fe1eaa0363cfb5735c904c70a239d59e9e0bcbaade14eecc86bc60622ca7' +
        '9cab5cabb2f3846e648b1eaf19bdf0caa02369b9655abb5040685a323c2ab4b3319ee9d5c021b8f79b540b19875fa09995f7997e623d7da8f837889a97e32d77' +
        '11ed935f166812810e358829c7e61fd696dedfa17858ba9957f584a51b2272639b83c3ff1ac24696cdb30aeb532e30548fd948e46dbc312858ebf2ef34c6ffea' +
        'fe28ed61ee7c3c735d4a14d9e864b7e342105d14203e13e045eee2b6a3aaabeadb6c4f15facb4fd0c742f442ef6abbb5654f3b1d41cd2105d81e799e86854dc7' +
        'e44b476a3d816250cf62a1f25b8d2646fc8883a0c1c7b6a37f1524c369cb749247848a0b5692b285095bbf00ad19489d1462b17423820e0058428d2a0c55f5ea' +
        '1dadf43e233f70613372f0928d937e41d65fecf16c223bdb7cde3759cbee74604085f2a7ce77326ea607808419f8509ee8efd85561d99735a969a7aac50c06c2' +
        '5a04abfc800bcadc9e447a2ec3453484fdd567050e1e9ec9db73dbd3105588cd675fda79e3674340c5c43465713e38d83d28f89ef16dff20153e21e78fb03d4a' +
        'e6e39f2bdb83adf7e93d5a68948140f7f64c261c94692934411520f77602d4f7bcf46b2ed4a20068d40824713320f46a43b7d4b7500061af1e39f62e97244546' +
        '14214f74bf8b88404d95fc1d96b591af70f4ddd366a02f45bfbc09ec03bd97857fac6dd031cb850496eb27b355fd3941da2547e6abca0a9a28507825530429f4' +
        '0a2c86dae9b66dfb68dc1462d7486900680ec0a427a18dee4f3ffea2e887ad8cb58ce0067af4d6b6aace1e7cd3375fecce78a399406b2a4220fe9e35d9f385b9' +
        'ee39d7ab3b124e8b1dc9faf74b6d185626a36631eae397b23a6efa74dd5b43326841e7f7ca7820fbfb0af54ed8feb397454056acba48952755533a3a20838d87' +
        'fe6ba9b7d096954b55a867bca1159a58cca9296399e1db33a62a4a563f3125f95ef47e1c9029317cfdf8e80204272f7080bb155c05282ce395c11548e4c66d22' +
        '48c1133fc70f86dc07f9c9ee41041f0f404779a45d886e17325f51ebd59bc0d1f2bcc18f41113564257b7834602a9c60dff8e8a31f636c1b0e12b4c202e1329e' +
        'af664fd1cad181156b2395e0333e92e13b240b62eebeb92285b2a20ee6ba0d99de720c8c2da2f728d012784595b794fd647d0862e7ccf5f05449a36f877d48fa' +
        'c39dfd27f33e8d1e0a476341992eff743a6f6eabf4f8fd37a812dc60a1ebddf8991be14cdb6e6b0dc67b55106d672c372765d43bdcd0e804f1290dc7cc00ffa3' +
        'b5390f92690fed0b667b9ffbcedb7d9ca091cf0bd9155ea3bb132f88515bad247b9479bf763bd6eb37392eb3cc1159798026e297f42e312d6842ada7c66a2b3b' +
        '12754ccc782ef11c6a124237b79251e706a1bbe64bfb63501a6b101811caedfa3d25bdd8e2e1c3c9444216590a121386d90cec6ed5abea2a64af674eda86a85f' +
        'bebfe98864e4c3fe9dbc8057f0f7c08660787bf86003604dd1fd8346f6381fb07745ae04d736fccc83426b33f01eab71b08041873c005e5f77a057bebde8ae24' +
        '55464299bf582e614e58f48ff2ddfda2f474ef388789bdc25366f9c3c8b38e74b475f25546fcd9b97aeb26618b1ddf84846a0e79915f95e2466e598e20b45770' +
        '8cd55591c902de4cb90bace1bb8205d011a862487574a99eb77f19b6e0a9dc09662d09a1c4324633e85a1f0209f0be8c4a99a0251d6efe101ab93d1d0ba5a4df' +
        'a186f20f2868f169dcb7da83573906fea1e2ce9b4fcd7f5250115e01a70683faa002b5c40de6d0279af88c27773f8641c3604c0661a806b5f0177a28c0f586e0' +
        '006058aa30dc7d6211e69ed72338ea6353c2dd94c2c21634bbcbee5690bcb6deebfc7da1ce591d766f05e4094b7c018839720a3d7c927c2486e3725f724d9db9' +
        '1ac15bb4d39eb8fced54557808fca5b5d83d7cd34dad0fc41e50ef5eb161e6f8a28514d96c51133c6fd5c7e756e14ec4362abfceddc6c837d79a323492638212' +
        '670efa8e406000e03a39ce37d3faf5cfabc277375ac52d1b5cb0679e4fa33742d382274099bc9bbed5118e9dbf0f7315d62d1c7ec700c47bb78c1b6b21a19045' +
        'b26eb1be6a366eb45748ab2fbc946e79c6a376d26549c2c8530ff8ee468dde7dd5730a1d4cd04dc62939bbdba9ba4650ac9526e8be5ee304a1fad5f06a2d519a' +
        '63ef8ce29a86ee22c089c2b843242ef6a51e03aa9cf2d0a483c061ba9be96a4d8fe51550ba645bd62826a2f9a73a3ae14ba99586ef5562e9c72fefd3f752f7da' +
        '3f046f6977fa0a5980e4a91587b086019b09e6ad3b3ee593e990fd5a9e34d7972cf0b7d9022b8b5196d5ac3a017da67dd1cf3ed67c7d2d281f9f25cfadf2b89b' +
        '5ad6b4725a88f54ce029ac71e019a5e647b0acfded93fa9be8d3c48d283b57ccf8d5662979132e28785f0191ed756055f7960e44e3d35e8c15056dd488f46dba' +
        '03a161250564f0bdc3eb9e153c9057a297271aeca93a072a1b3f6d9b1e6321f5f59c66fb26dcf3197533d928b155fdf5035634828aba3cbb28517711c20ad9f8' +
        'abcc5167ccad925f4de817513830dc8e379d58629320f991ea7a90c2fb3e7bce5121ce64774fbe32a8b6e37ec3293d4648de53696413e680a2ae0810dd6db224' +
        '69852dfd09072166b39a460a6445c0dd586cdecf1c20c8ae5bbef7dd1b588d40ccd2017f6bb4e3bbdda26a7e3a59ff453e350a44bcb4cdd572eacea8fa6484bb' +
        '8d6612aebf3c6f47d29be463542f5d9eaec2771bf64e6370740e0d8de75b1357f8721671af537d5d4040cb084eb4e2cc34d2466a0115af84e1b0042895983a1d' +
        '06b89fb4ce6ea0486f3f3b823520ab82011a1d4b277227f8611560b1e7933fdcbb3a792b344525bda08839e151ce794b2f32c9b7a01fbac9e01cc87ebcc7d1f6' +
        'cf0111c3a1e8aac71a908749d44fbd9ad0dadecbd50ada380339c32ac69136678df9317ce0b12b4ff79e59b743f5bb3af2d519ff27d9459cbf97222c15e6fc2a' +
        '0f91fc719b941525fae59361ceb69cebc2a8645912baa8d1b6c1075ee3056a0c10d25065cb03a442e0ec6e0e1698db3b4c98a0be3278e9649f1f9532e0d392df' +
        'd3a0342b8971f21e1b0a74414ba3348cc5be7120c37632d8df359f8d9b992f2ee60b6f470fe3f11de54cda541edad891ce6279cfcd3e7e6f1618b166fd2c1d05' +
        '848fd2c5f6fb2299f523f357a632762393a8353156cccd02acf081625a75ebb56e16369788d273ccde96629281b949d04c50901b71c65614e6c6c7bd327a140a' +
        '45e1d006c3f27b9ac9aa53fd62a80f00bb25bfe235bdd2f671126905b2040222b6cbcf7ccd769c2b53113ec01640e3d338abbd602547adf0ba38209cf746ce76' +
        '77afa1c52075606085cbfe4e8ae88dd87aaaf9b04cf9aa7e1948c25c02fb8a8c01c36ae4d6ebe1f990d4f869a65cdea03f09252dc208e69fb74e6132ce77e25b' +
        '578fdfe33ac372e6' +
        '';

    let P_TABLE = null;
    let S_TABLE = null;

    /** 首次使用时才解析常量表，避免影响页面加载 */
    function initTables() {
        if (P_TABLE) {
            return;
        }
        P_TABLE = new Int32Array(P_LEN);
        S_TABLE = new Int32Array(S_LEN);
        for (let i = 0; i < P_LEN; i++) {
            P_TABLE[i] = parseInt(PI_HEX.substr(i * 8, 8), 16) | 0;
        }
        for (let i = 0; i < S_LEN; i++) {
            S_TABLE[i] = parseInt(PI_HEX.substr((P_LEN + i) * 8, 8), 16) | 0;
        }
    }

    /** 密钥流：每次从 data 中循环取 4 个字节组成一个大端 32 位字 */
    const SW = { key: 0, off: 0 };
    function streamToWord(data, offp) {
        let word = 0;
        for (let i = 0; i < 4; i++) {
            word = (word << 8) | (data[offp] & 0xff);
            offp = (offp + 1) % data.length;
        }
        SW.key = word;
        SW.off = offp;
    }

    /** Blowfish 的 Feistel 网络（bcrypt 的性能热点） */
    function encipher(lr, off, P, S) {
        let l = lr[off];
        let r = lr[off + 1];
        l ^= P[0];
        for (let i = 0, k = 14; i <= k;) {
            let n = S[l >>> 24];
            n += S[0x100 | ((l >>> 16) & 0xff)];
            n ^= S[0x200 | ((l >>> 8) & 0xff)];
            n += S[0x300 | (l & 0xff)];
            r ^= n ^ P[++i];

            n = S[r >>> 24];
            n += S[0x100 | ((r >>> 16) & 0xff)];
            n ^= S[0x200 | ((r >>> 8) & 0xff)];
            n += S[0x300 | (r & 0xff)];
            l ^= n ^ P[++i];
        }
        lr[off] = r ^ P[P_LEN - 1];
        lr[off + 1] = l;
        return lr;
    }

    /** 普通密钥扩展：只用 key，不用 data */
    function expandKey(key, P, S) {
        let offp = 0;
        const lr = [0, 0];

        for (let i = 0; i < P_LEN; i++) {
            streamToWord(key, offp);
            offp = SW.off;
            P[i] = P[i] ^ SW.key;
        }
        for (let i = 0; i < P_LEN; i += 2) {
            encipher(lr, 0, P, S);
            P[i] = lr[0];
            P[i + 1] = lr[1];
        }
        for (let i = 0; i < S_LEN; i += 2) {
            encipher(lr, 0, P, S);
            S[i] = lr[0];
            S[i + 1] = lr[1];
        }
    }

    /**
     * 昂贵的密钥扩展（EksBlowfish 的 key setup）：
     * data 与 key 交替参与运算。bcrypt 中 data = 16 字节盐，key = 密码。
     */
    function eksKey(data, key, P, S) {
        let offp = 0;
        const lr = [0, 0];

        for (let i = 0; i < P_LEN; i++) {
            streamToWord(key, offp);
            offp = SW.off;
            P[i] = P[i] ^ SW.key;
        }

        // 注意：offp 在 P 与 S 两个阶段之间是连续推进的，不能重置
        offp = 0;
        for (let i = 0; i < P_LEN; i += 2) {
            streamToWord(data, offp);
            offp = SW.off;
            lr[0] ^= SW.key;
            streamToWord(data, offp);
            offp = SW.off;
            lr[1] ^= SW.key;
            encipher(lr, 0, P, S);
            P[i] = lr[0];
            P[i + 1] = lr[1];
        }
        for (let i = 0; i < S_LEN; i += 2) {
            streamToWord(data, offp);
            offp = SW.off;
            lr[0] ^= SW.key;
            streamToWord(data, offp);
            offp = SW.off;
            lr[1] ^= SW.key;
            encipher(lr, 0, P, S);
            S[i] = lr[0];
            S[i + 1] = lr[1];
        }
    }
/** 把常量串加密 64 遍并展开成 24 字节（大端序） */
    function finishMagic(cdata, P, S) {
        const clen = cdata.length;
        for (let i = 0; i < 64; i++) {
            for (let j = 0; j < (clen >> 1); j++) {
                encipher(cdata, j << 1, P, S);
            }
        }
        const out = [];
        for (let i = 0; i < clen; i++) {
            out.push((cdata[i] >>> 24) & 0xff);
            out.push((cdata[i] >>> 16) & 0xff);
            out.push((cdata[i] >>> 8) & 0xff);
            out.push(cdata[i] & 0xff);
        }
        return out;
    }

    /** 同步计算核心：返回 24 字节结果（其中只有前 23 字节会被编码输出） */
    function cryptSync(passwordBytes, saltBytes, rounds) {
        initTables();
        const P = P_TABLE.slice();
        const S = S_TABLE.slice();
        eksKey(saltBytes, passwordBytes, P, S);
        for (let i = 0; i < rounds; i++) {
            expandKey(passwordBytes, P, S);
            expandKey(saltBytes, P, S);
        }
        return finishMagic(MAGIC.slice(), P, S);
    }

    /**
     * 异步计算核心：每片最多占用主线程 50ms，然后让出事件循环，
     * 计算期间界面依然可以响应（进度条、toast 等）。
     * @param {function(number)=} onProgress 进度回调，参数为 0–1 的比例
     */
    function cryptAsync(passwordBytes, saltBytes, rounds, onProgress) {
        return new Promise(function (resolve) {
            initTables();
            const P = P_TABLE.slice();
            const S = S_TABLE.slice();
            const cdata = MAGIC.slice();
            eksKey(saltBytes, passwordBytes, P, S);

            let done = 0;
            function step() {
                const deadline = Date.now() + 50;
                while (done < rounds && Date.now() < deadline) {
                    expandKey(passwordBytes, P, S);
                    expandKey(saltBytes, P, S);
                    done++;
                }
                if (onProgress) {
                    onProgress(done / rounds);
                }
                if (done < rounds) {
                    setTimeout(step, 0);
                    return;
                }
                resolve(finishMagic(cdata, P, S));
            }
            setTimeout(step, 0);
        });
    }
// ---- 编码与辅助函数 ----------------------------------------------------

    /** bcrypt 私有 base64 编码：只编码前 len 个字节 */
    function encodeB64(bytes, len) {
        let off = 0;
        let out = '';
        let c1 = 0;
        let c2 = 0;
        while (off < len) {
            c1 = bytes[off++] & 0xff;
            out += B64.charAt((c1 >> 2) & 0x3f);
            c1 = (c1 & 0x03) << 4;
            if (off >= len) {
                out += B64.charAt(c1 & 0x3f);
                break;
            }
            c2 = bytes[off++] & 0xff;
            c1 |= (c2 >> 4) & 0x0f;
            out += B64.charAt(c1 & 0x3f);
            c1 = (c2 & 0x0f) << 2;
            if (off >= len) {
                out += B64.charAt(c1 & 0x3f);
                break;
            }
            c2 = bytes[off++] & 0xff;
            c1 |= (c2 >> 6) & 0x03;
            out += B64.charAt(c1 & 0x3f);
            out += B64.charAt(c2 & 0x3f);
        }
        return out;
    }

    /** bcrypt 私有 base64 解码：输出恰好 len 个字节（解析 salt 时使用） */
    function decodeB64(str, len) {
        const out = [];
        let off = 0;
        while (off < str.length - 1 && out.length < len) {
            let code = str.charCodeAt(off++);
            const c1 = code < 128 ? B64_INDEX[code] : -1;
            code = str.charCodeAt(off++);
            const c2 = code < 128 ? B64_INDEX[code] : -1;
            if (c1 < 0 || c2 < 0) {
                break;
            }
            out.push(((c1 << 2) | ((c2 & 0x30) >> 4)) & 0xff);
            if (out.length >= len || off >= str.length) {
                break;
            }
            code = str.charCodeAt(off++);
            const c3 = code < 128 ? B64_INDEX[code] : -1;
            if (c3 < 0) {
                break;
            }
            out.push((((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2)) & 0xff);
            if (out.length >= len || off >= str.length) {
                break;
            }
            code = str.charCodeAt(off++);
            const c4 = code < 128 ? B64_INDEX[code] : -1;
            if (c4 < 0) {
                break;
            }
            out.push((((c3 & 0x03) << 6) | c4) & 0xff);
        }
        while (out.length < len) {
            out.push(0);
        }
        return out;
    }

    /** 字符串 -> UTF-8 字节数组（与 Go 的 []byte(string) 一致） */
    function utf8Bytes(str) {
        const out = [];
        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i);
            if (c < 0x80) {
                out.push(c);
                continue;
            }
            if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
                const lo = str.charCodeAt(i + 1);
                if (lo >= 0xdc00 && lo <= 0xdfff) {
                    i++;
                    const cp = 0x10000 + ((c - 0xd800) << 10) + (lo - 0xdc00);
                    out.push(0xf0 | (cp >> 18));
                    out.push(0x80 | ((cp >> 12) & 0x3f));
                    out.push(0x80 | ((cp >> 6) & 0x3f));
                    out.push(0x80 | (cp & 0x3f));
                    continue;
                }
            }
            if (c < 0x800) {
                out.push(0xc0 | (c >> 6));
                out.push(0x80 | (c & 0x3f));
            } else {
                out.push(0xe0 | (c >> 12));
                out.push(0x80 | ((c >> 6) & 0x3f));
                out.push(0x80 | (c & 0x3f));
            }
        }
        return out;
    }

    /** 明文 -> 参与运算的字节（UTF-8 编码，末尾补 NUL） */
    function passwordToBytes(password) {
        const bytes = utf8Bytes(String(password));
        if (bytes.length > MAX_PASSWORD_BYTES) {
            throw new Error('BCRYPT_PASSWORD_TOO_LONG');
        }
        bytes.push(0);
        return bytes;
    }

    /** 生成 n 字节随机数（优先使用 CSPRNG） */
    function randomBytes(n) {
        const out = [];
        const c = (typeof crypto !== 'undefined' && crypto && typeof crypto.getRandomValues === 'function') ? crypto : null;
        if (c) {
            const buf = new Uint8Array(n);
            c.getRandomValues(buf);
            for (let i = 0; i < n; i++) {
                out.push(buf[i]);
            }
            return out;
        }
        for (let i = 0; i < n; i++) {
            out.push((Math.random() * 256) | 0);
        }
        return out;
    }

    /** 补齐两位 cost */
    function pad2(n) {
        return (n < 10 ? '0' : '') + n;
    }

    /** 解析形如 $2b$12$<22 字符盐> 的 salt 字符串 */
    function parseSalt(salt) {
        const m = /^\$2([abxy])\$(\d{2})\$([./A-Za-z0-9]{22})$/.exec(salt);
        if (!m) {
            throw new Error('BCRYPT_INVALID_SALT');
        }
        const cost = parseInt(m[2], 10);
        if (cost < MIN_COST || cost > 31) {
            throw new Error('BCRYPT_INVALID_SALT');
        }
        return {
            prefix: '$2' + m[1] + '$' + pad2(cost) + '$',
            cost: cost,
            salt: decodeB64(m[3], SALT_LEN)
        };
    }

    /** 第二个参数既可以是 cost，也可以是完整的 salt 字符串 */
    function resolveSalt(saltOrCost) {
        if (typeof saltOrCost === 'string') {
            return parseSalt(saltOrCost);
        }
        let cost = parseInt(saltOrCost, 10);
        if (!(cost >= MIN_COST && cost <= MAX_COST)) {
            cost = DEFAULT_COST;
        }
        return {
            prefix: '$2b$' + pad2(cost) + '$',
            cost: cost,
            salt: randomBytes(SALT_LEN)
        };
    }

    // ---- 对外接口 ----------------------------------------------------------

    const api = {
        /** 允许生成的 cost 范围 */
        MIN_COST: MIN_COST,
        MAX_COST: MAX_COST,
        /** 默认 cost */
        DEFAULT_COST: DEFAULT_COST,
        /** 明文长度上限（字节） */
        MAX_PASSWORD_BYTES: MAX_PASSWORD_BYTES,

        /**
         * 生成 salt 字符串，例如 $2b$12$XXXXXXXXXXXXXXXXXXXXXX
         * @param {number=} cost 省略时使用默认值
         * @returns {string}
         */
        genSalt: function (cost) {
            const s = resolveSalt(cost);
            return s.prefix + encodeB64(s.salt, SALT_LEN);
        },

        /**
         * 同步计算 bcrypt 哈希
         * @param {string} password 明文密码
         * @param {number|string=} saltOrCost cost 或完整的 salt 字符串
         * @returns {string} 形如 $2b$12$.... 的哈希
         */
        hashSync: function (password, saltOrCost) {
            const s = resolveSalt(saltOrCost);
            const bytes = cryptSync(passwordToBytes(password), s.salt, 1 << s.cost);
            return s.prefix + encodeB64(s.salt, SALT_LEN) + encodeB64(bytes, HASH_LEN);
        },

        /**
         * 异步计算 bcrypt 哈希（不阻塞界面，WebUI 推荐使用）
         * @param {string} password 明文密码
         * @param {number|string=} saltOrCost cost 或完整的 salt 字符串
         * @param {function(number)=} onProgress 进度回调（0–1）
         * @returns {Promise<string>}
         */
        hash: function (password, saltOrCost, onProgress) {
            return new Promise(function (resolve, reject) {
                let s;
                let bytes;
                try {
                    s = resolveSalt(saltOrCost);
                    bytes = passwordToBytes(password);
                } catch (err) {
                    reject(err);
                    return;
                }
                cryptAsync(bytes, s.salt, 1 << s.cost, onProgress).then(function (out) {
                    resolve(s.prefix + encodeB64(s.salt, SALT_LEN) + encodeB64(out, HASH_LEN));
                });
            });
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        window.bcrypt = api;
    }
})();