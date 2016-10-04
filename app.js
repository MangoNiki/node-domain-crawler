(function() {
    'use strict';

    const Domain = require('./lib/Domain');


    Domain.getToken(function(err, token) {
        if (err) {
            console.info(err);
            return;
        }
        console.info('\nTOKEN:' + token + '\n');
        Domain.start();
    });

}).call(this);
