'use strict';

var b = require('ast-types').builders;
var buildObject = require('./object');
var buildStrict = require('./use-strict');
var buildExports = require('./exports');

module.exports = function buildConfig(opts) {
    var program = []
        .concat(buildStrict(opts))
        .concat([buildExports(getConfigAst(opts), opts)]);

    return b.program(program);
};

function getConfigAst(opts) {
    return b.objectExpression([
        b.property('init', b.identifier('client'), b.literal(opts.backend)),
        b.property('init', b.identifier('connection'), 
            buildObject(getConnectionConfig(opts)))
    ]);
}

function getConnectionConfig(options) {
    var config = options.backend === 'sqlite' ?
    { 
        filename: options.dbFilename 
    } :
    {                
        host: options.host,
        user: options.user,
        port: options.port,
        password: options.password,
        database: options.db,
    };

    if(options.b === 'mssql')
        config.options = {encrypt: true}

    return config;
}

