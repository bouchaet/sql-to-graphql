# Using sql-to-graphql with SqlServer
SqlServer have some specificities. The use of a schema, a name instance, ... 
The intent here is to document such differences and to propose workarounds
with the tool. 

# Samples
## Creating graphql project for a specific table on a non-default port
host: odsdb  
port: 1435  
database: ods  
table: Currency  
schema: dbo  
user: graphql  
password: _hidden_  

`> node cli.js -b=mssql --db=ods -h=odsdb -o=outdir -t=Currency -u=graphql -p=***** -P=1435 --db-schema=dbo`