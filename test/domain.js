(function() {
    'use strict';

    var arr = ['a', 'b', 'c', 'e'],
        domains = [];

    function getPureCharacterDomain(domain, count) {
        for (var i = 0, lenI = arr.length; i < lenI; i++) {
            if (count == 1) {
                domains.push(domain + arr[i]);
                continue;
            }
            getPureCharacterDomain(domain + arr[i], count - 1);
        }
    }
    getPureCharacterDomain('', 2);
    console.info(domains);

}).call(this);
