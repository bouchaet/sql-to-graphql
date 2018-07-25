/* eslint camelcase: 0 */
'use strict';

var knex = require('knex');
var map = require('lodash/map');
var mapKeys = require('lodash/mapKeys');
var contains = require('lodash/includes');
var camelCase = require('lodash/camelCase');
var undef;


module.exports = function mssqlBackend(opts, callback) {
    var mssql = knex({
        client: 'mssql',
        connection: {
            host: opts.host,
            user: opts.user,
            port: opts.port !== ''? opts.port: 1433,
            password: opts.password,
            database: opts.database,
            options: {
                encrypt: true
            }
        }
    });

    console.log("mssql");
    process.nextTick(callback);

    return {
        getTables: function(tableNames, cb) 
        {
            var matchAll = tableNames.length === 1 && tableNames[0] === '*';
            console.log("Gather table names: " + tableNames);
            
            mssql
                .select('table_name')
                .from('information_schema.tables')
                .where('table_catalog', opts.database)
                .where('table_schema', opts.dbSchema)
                .whereIn('table_type', ['BASE TABLE', 'VIEW'])
                .catch(cb)
                .then(function(tbls) {
                    console.log(tbls);
                    tbls = map(tbls, 'table_name');

                    if (!matchAll) {
                        tbls = tbls.filter(function(tbl) {
                            return contains(tableNames, tbl);
                        });
                    }

                    cb(null, tbls);
                });
        },

        getTableComment: function(tableName, cb) 
        {
            console.log("comment");
            cb(null, '')
        },

        getTableStructure: function(tableName, tblCb)
        {
            console.log("table info for " + tableName);
            mssql
                .column([
                    {table_name: knex.raw("'" + tableName + "'")},
                    {column_name: 'columns.name'}, 
                    {ordinal_position: 'columns.column_id'},
                    {data_type: 'types.name'},
                    'columns.is_nullable',
                    knex.raw('CASE WHEN indexes.is_primary_key = 1 THEN '+
                             '\'PRI\' ELSE \'\' END as column_key'),
                    'types.is_user_defined'])
                .select()
                .from('sys.columns')
                .innerJoin('sys.types', 
                          'sys.columns.user_type_id', 
                          'sys.types.user_type_id')
                .innerJoin('sys.objects', 
                           'sys.columns.object_id', 
                           'sys.objects.object_id')
                .leftOuterJoin('sys.index_columns', function() {
                    this.on('sys.columns.object_id', 
                            'sys.index_columns.object_id')
                    .andOn('sys.columns.column_id', 
                           'sys.index_columns.column_id')})
                .leftOuterJoin('sys.indexes', function() {
                    this.on('sys.index_columns.object_id', 
                            'sys.indexes.object_id')
                        .andOn('sys.index_columns.index_id',
                               'sys.indexes.index_id')})
                .whereRaw('schema_name(objects.schema_id) = ? and '+
                          'columns.object_id = '+
                          'object_id(schema_name(objects.schema_id) + ?)',
                          [opts.dbSchema, '.' + tableName])
                .orderBy('columns.column_id')
                .catch(tblCb)
                .then(function(info) {
                    info = info.map(function(col) {
                        col.columnType = col.is_user_defined ? col.data_type 
                            : null;
                        col.data_type = col.is_user_defined ? 'USER-DEFINED' 
                            : col.data_type;
                        return col;})
                    tblCb(null, (info || []).map(camelCaseKeys));
                });
        },

        hasDuplicateValues: function(table, column, callback) 
        {
            console.log("duplicates...");
            mssql
                .select(column)
                .from(table)
                .groupBy(column)
                .havingRaw('count(' + column + ') > 1')
                .limit(1)
                .catch(callback)
                .then(function(info) {
                    callback(null, (info || []).length > 0);
                });
        },

        close: function(cb) {
            console.log("close");
            mssql.destroy(cb);
        }
    }

}

function camelCaseKeys(obj) {
    return mapKeys(obj, function(val, key) {
        return camelCase(key);
    });
}
