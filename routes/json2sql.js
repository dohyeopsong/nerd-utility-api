// JSON → SQL INSERT generator: /json2sql?json=[...]&table=users
// Accepts array of objects or a single object. Returns one INSERT per row (parameterized placeholders by default).
function esc(v){
  if(v===null)return 'NULL';
  if(typeof v==='number'||typeof v==='boolean')return String(v);
  if(typeof v==='string')return "'"+v.replace(/'/g,"''")+"'";
  return "'"+JSON.stringify(v).replace(/'/g,"''")+"'";
}
function routeJson2Sql(u,res,json,body){
  try{
    let raw=u.searchParams.get('json'),table=u.searchParams.get('table')||u.searchParams.get('table');
    if(!raw&&body&&typeof body==='object'){raw=JSON.stringify(body.rows||body);}
    if(!raw)return json(res,400,{error:'provide ?json=<array-or-object>&table=<name>'});
    let data=JSON.parse(raw);
    if(!Array.isArray(data))data=[data];
    if(data.length===0)return json(res,400,{error:'empty array'});
    if(!data.every(r=>r&&typeof r==='object'&&!Array.isArray(r)))return json(res,400,{error:'all rows must be objects'});
    // column order from first row; missing keys in later rows → NULL
    const cols=Object.keys(data[0]);
    const badCols=cols.some(c=>/[^a-zA-Z0-9_]/.test(c)||/^\d/.test(c)||c.length===0);
    if(badCols)return json(res,400,{error:'column names must be alphanumeric/underscore and not start with a digit'});
    const mode=(u.searchParams.get('mode')||'values'); // 'values' (literal) or 'params' (? placeholders)
    const stmts=[];
    for(const row of data){
      const vals=cols.map(c=>{
        const v=Object.prototype.hasOwnProperty.call(row,c)?row[c]:null;
        return mode==='params'?'?':esc(v);
      }).join(', ');
      stmts.push(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals});`);
    }
    return json(res,200,{
      table,columns:cols,rowCount:data.length,mode,
      sql:stmts.join('\n'),
      statements:stmts,
    });
  }catch(e){return json(res,400,{error:'json2sql failure: '+e.message});}
}
module.exports={routeJson2Sql};
