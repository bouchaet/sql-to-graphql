var knex = require('knex')({
  client: 'mssql',
  connection: {
    host: process.env.MSSQL_SERVER,
    port: 1435,
    user: process.env.MSSQL_USERNAME,
    password: process.env.MSSQL_PASSWORD,
    database: process.env.MSSQL_DATABASE,
    options: {
      encrypt: true
    }
  }
})

// knex('SalesLT.Customer')
//   .innerJoin('SalesLT.CustomerAddress', 'SalesLT.Customer.CustomerID', 'SalesLT.CustomerAddress.CustomerID')
//   .innerJoin('SalesLT.Address', 'SalesLT.CustomerAddress.AddressID', 'SalesLT.Address.AddressID')
//   .whereRaw('SalesLT.Customer.FirstName LIKE ?', ['O%'])
//   .limit(2)
//   .then(function (rows) {
//     console.log(rows)
//   })
//   .finally(function () {
//     return knex.destroy()
//   })

knex
  .column([
    {column_name: 'columns.name'}, 
    {ordinal_position: 'columns.column_id'},
    {data_type: 'types.name'},
    'columns.is_nullable',
    knex.raw('CASE WHEN indexes.is_primary_key = 1 THEN \'PRI\' ELSE \'\' END as column_primary')])
  .select()
  .from('sys.columns')
  .innerJoin('sys.types', 'sys.columns.user_type_id', 'sys.types.user_type_id')
  .innerJoin('sys.objects', 'sys.columns.object_id', 'sys.objects.object_id')
  .leftOuterJoin('sys.index_columns', function() {
    this.on('sys.columns.object_id', 'sys.index_columns.object_id')
       .andOn('sys.columns.column_id', 'sys.index_columns.column_id')})
  .leftOuterJoin('sys.indexes', function() {
    this.on('sys.index_columns.object_id', 'sys.indexes.object_id')
        .andOn('sys.index_columns.index_id','sys.indexes.index_id')})
  .whereRaw('columns.object_id = object_id(schema_name(objects.schema_id) + \'.\' + ?)', ['product'])
  .orderBy('columns.column_id')
  .then(function(rows) {
    console.log(rows)
  })
  .finally(function() {
    return knex.destroy()
  });