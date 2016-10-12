(function() {
    'use strict';

    const http = require('http'),
        path = require('path'),
        fs = require('fs'),
        zlib = require('zlib'),
        async = require('async'),
        iconv = require("iconv-lite");

    /**
     * 获取令牌
     * http://www.west.cn/js2016/whois/whois2016_tmp.js?ver=20160729
     */
    function getToken(fn) {
        let reqOpts = {
                host: 'www.west.cn',
                port: 80,
                path: '/main/whois.asp?act=gettok',
                method: 'GET',
                headers: {
                    'User-Agent': 'custom user agent'
                }
            },
            req = http.request(reqOpts, function(res) {
                var resData = '';
                res.setEncoding('utf8');

                res.on('data', function(data) {
                    resData += data;
                });
                res.on('end', function() {
                    try {
                        let i = 0,
                            encodeReg = /var l=(.*?);/,
                            arrReg = /\[.*?\]/gi,
                            encodeStr = JSON.parse(resData.match(encodeReg)[1]),
                            encodeTokenStr = '',
                            encodeToken = '';

                        for (i = 0; i < encodeStr.length; i++) {
                            encodeTokenStr += String.fromCharCode(encodeStr[i] - 1)
                        }
                        let tokenEncodeRegRes = encodeTokenStr.match(arrReg),
                            tokenEncodeValue = JSON.parse(tokenEncodeRegRes[0]),
                            tokenEncodeKey = JSON.parse(tokenEncodeRegRes[1]);

                        for (i = 0; i < tokenEncodeKey.length; i++) {
                            encodeToken += String.fromCharCode(tokenEncodeValue[tokenEncodeKey[i]])
                        };
                        global.TOKEN = encodeToken;
                        fn && fn(null, encodeToken);
                    } catch (e) {
                        console.info(e.stack);
                        fn && fn('域名HTML解析失败...');
                    }
                });
            });

        req.on('error', function(e) {
            fn && fn('域名爬取失败...');
        });
        req.end();
    }
    exports.getToken = getToken;

    //根据域名获取出售情况
    function getDomainData(domain, suffix, fn) {
        let reqOpts = {
                host: 'www.west.cn',
                port: 80,
                path: '/main/whois.asp?act=query&domains=' + domain + '&suffixs=.' + suffix + '&du=&v=' + Math.random(),
                method: 'GET',
                encoding: null,
                headers: {
                    'Accept-Encoding': 'gzip',
                    'User-Agent': 'custom user agent',
                    'Cookie': 'qtoken=' + global.TOKEN
                }
            },
            gunzip = zlib.createGunzip(),
            req = http.request(reqOpts, function(res) {
                let resData = '',
                    chunks = [];
                res.pipe(gunzip);

                gunzip.on('data', function(chunkBuffer) {
                    chunks.push(chunkBuffer);
                });
                gunzip.on('end', function() {
                    gunzip.end();
                    try {
                        resData = iconv.decode(Buffer.concat(chunks), 'gb2312');
                        fn && fn(null, resData);
                    } catch (e) {
                        console.info(e.stack);
                        fn && fn('域名HTML解析失败...');
                    }
                });
            });
        req.on('error', function(e) {
            gunzip.end();
            fn && fn('域名爬取失败...');
        });
        req.end();
    };

    //域名出售情况数据解析
    function analyseDomainData(domainname, mark) {
        var domainReg = /\w+\.\w+/gi,
            domain = domainname.match(domainReg)[0];
        console.info('[' + new Date().toString() + '][Loading...][' + domain + ']');

        if (mark == 'a:' || mark == 'd:') {
            console.info('[' + new Date().toString() + '][⭐️⭐️⭐️⭐️⭐️][' + domain + ']');
            fs.appendFileSync(path.resolve(path.dirname(__filename), '../Domains.txt'), domain + '\n');
        }
    }


    //从数据中返回域名信息
    function getDomainFromQueryData(retstr) {
        let retlist = retstr.split(";"),
            dmlist = [];
        for (let i = 0; i < retlist.length; i++) {
            var stritem = retlist[i],
                strmark = stritem.substring(0, 2),
                strdomain = stritem.substring(2);

            if (strdomain != '' && strdomain != null) {
                var alldomain = strdomain.split(",");

                for (let j = 0; j < alldomain.length; j++) {
                    if (alldomain[j].indexOf(".") > 0) {
                        dmlist[alldomain[j]] = strmark;
                    }
                }
            }
        }
        return dmlist;
    }

    //获取域名状态
    function getDomainByDetail(domain, suffix, fn) {
        setTimeout(function() {
            getDomainData(domain, suffix, function(err, result) {
                if (err) {
                    fn && fn(err);
                    return;
                }
                let ipos = -1,
                    querydata = '',
                    domainarr = [];

                if (result.substring(0, 3) == '200' && result.indexOf(",") > 0) {
                    ipos = result.indexOf(",");
                    querydata = result.substring(ipos + 1);
                    domainarr = getDomainFromQueryData(querydata);

                    for (var strdomain in domainarr) {
                        if (strdomain.indexOf(".") > 0) {
                            analyseDomainData(strdomain, domainarr[strdomain]);
                        }
                    }
                }
                fn && fn(null, result);
            });
        }, 1000);
    };

    //查询域名
    function getDomainByName(domain, callback) {
        // let suffixs = ['com', 'cn', 'net', 'cc', 'xyz'];
        let suffixs = ['com'];

        async.eachSeries(suffixs, function(suffix, fn) {
            getDomainByDetail(domain, suffix, function(err, queryRes) {
                if (err) {
                    // 不执行回调，继续往下查询
                    console.info(domain + '.' + suffix + ' 查询失败');
                    console.info(err);
                }
                fn && fn();
            });
        }, function(err) {
            if (err) {
                console.info(err);
                return;
            }
            callback && callback();
        });
    }

    //获取随机域名
    function getPureNumberDomain(start, count, prefix, subfix) {
        var domains = [],
            countStr = count + '';
        subfix = subfix || '';
        for (let i = start; i < count; i++) {
            var curLen = (i + '').length,
                requireLen = (count + '').length - 1,
                preZeroFill = (Math.pow(10, requireLen - curLen) + '').substring(1);
            domains.push(prefix + preZeroFill + i + subfix);
        }
        return domains;
    }

    function getPureCharacterDomains(nums, prefix) {
        var arr = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
                'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                'u', 'v', 'w', 'x', 'y', 'z'
            ],
            domains = [];
        getPureCharacter('', nums, arr, prefix, domains);
        return domains;
    }

    function getPureCharacter(domain, count, chars, prefix, domains) {
        for (var i = 0, lenI = chars.length; i < lenI; i++) {
            if (count == 1) {
                domains.push(prefix + domain + chars[i]);
                continue;
            }
            getPureCharacter(domain + chars[i], count - 1, chars, prefix, domains);
        }
    }

    exports.start = function() {

        var domains = getPureNumberDomain(0, 100, 'dm', '');
        // var domains = getPureCharacterDomains(4, '');
        async.eachSeries(domains, function(domain, fn) {
            getDomainByName(domain, function() {
                getToken(function() {
                    fn && fn();
                });
            });

        }, function(err) {

        });
    }

}).call(this);
